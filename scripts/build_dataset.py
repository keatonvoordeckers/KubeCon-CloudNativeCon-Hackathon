"""Build an Elasticsearch-ready dataset from the public KubeCon NA 2026 Sessionize schedule.

Usage:
    python scripts/build_dataset.py data/schedule.json data/

Outputs:
    out/talks.json        - list of clean talk documents (easy to read / inspect)
    out/talks.bulk.ndjson - same docs in Elasticsearch _bulk format (index: kubecon-talks)
    out/mapping.json      - index mapping to create before loading
"""
import json
import re
import sys
from pathlib import Path

INDEX = "kubecon-talks"

# Venue accessibility facts. Only what the official KubeCon Inclusion + Accessibility page says:
# https://events.linuxfoundation.org/kubecon-cloudnativecon-north-america/attend/inclusion-accessibility/
# Nothing here is guessed. Off-site venues are "unverified" until someone checks with the host.
OFFICIAL_VENUE_ACCESS = {
    "status": "official_venue",
    "wheelchair_accessible": True,
    "notes": (
        "Official KubeCon venue. Reserved seating for attendees with accessibility needs in every session; "
        "staff at registration/info desks can direct you to elevators; wheelchair/scooter rental via Mobility City; "
        "live captions in 60+ languages via Wordly in breakout rooms."
    ),
    "source": "https://events.linuxfoundation.org/kubecon-cloudnativecon-north-america/attend/inclusion-accessibility/",
}
UNVERIFIED_ACCESS = {
    "status": "unverified",
    "wheelchair_accessible": None,  # unknown -> do NOT claim yes or no
    "notes": "Off-site or TBD venue. Accessibility not listed by KubeCon; contact the event host to confirm.",
    "source": None,
}

# Formats live in the same Sessionize category group as topics; split them out.
FORMATS = {
    "⚡ Lightning Talks": "Lightning Talk",
    "📚 Tutorials": "Tutorial",
    "🚨 Contribfest": "Contribfest",
    "🪧 Poster Sessions": "Poster Session",
    "Keynote Sessions": "Keynote",
    "Maintainer Track": "Maintainer Talk",
    "Project Lightning Talks": "Project Lightning Talk",
    "Project Pavilion Tours": "Project Pavilion Tour",
    "Project Pavilion Stage": "Project Pavilion Stage",
    "Solutions Showcase": "Solutions Showcase",
    "Cloud Native Theater": "Theater Talk",
    "Sponsor Demo Theater": "Sponsor Demo",
    "Sponsor-hosted Co-located Events": "Co-located Event (sponsor)",
    "CNCF-hosted Co-located Events": "Co-located Event (CNCF)",
    "Registration": "Logistics",
    "Breaks": "Logistics",
    "Experiences": "Experience",
    "Project Opportunities": "Project Opportunity",
}
LEVELS = {"Beginner", "Advanced", "Any Level"}

# Keyword rules used ONLY when a talk has no official track. Stored separately as topics_inferred.
INFER_RULES = {
    "AI Inference + Agentic": r"\b(ai|llm|llms|agent|agents|agentic|inference|gpu|gpus|model serving|mcp|rag)\b",
    "Security": r"\b(security|secure|vulnerab\w*|cve|supply chain|sbom|policy|zero trust|auth\w*|secrets?|rbac|compliance)\b",
    "Observability": r"\b(observability|opentelemetry|otel|tracing|traces|metrics|logging|logs|prometheus|monitoring)\b",
    "Platform Engineering": r"\b(platform engineering|internal developer platform|idp|backstage|golden path\w*|developer portal)\b",
    "Connectivity": r"\b(network\w*|service mesh|istio|linkerd|cilium|envoy|gateway api|ebpf|dns)\b",
    "Data Processing + Storage": r"\b(storage|database\w*|stateful|volumes?|csi|backup|data pipeline\w*|kafka)\b",
    "Operations + Performance": r"\b(scaling|autoscal\w*|performance|cost|finops|upgrade\w*|reliability|sre|scheduler|multi-cluster)\b",
    "Application Development + Delivery": r"\b(gitops|argo\w*|flux|ci/cd|cicd|continuous delivery|helm|deploy\w*|wasm|webassembly)\b",
    "Cloud Native Novice": r"\b(beginner\w*|getting started|intro\w*|101|newcomer\w*|first-time)\b",
    "Inclusion + Accessibility": r"\b(inclusion|inclusive|accessib\w*|diversity|neurodiver\w*|mentor\w*)\b",
}


def infer_topics(text):
    t = text.lower()
    return [topic for topic, rx in INFER_RULES.items() if re.search(rx, t)]
TITLE_TAG = re.compile(r"\s*\|\s*(ALL ACCESS PASS REQUIRED|SEPARATE REGISTRATION REQUIRED|SEPARATE REGISTRATION|SOLD OUT)\s*", re.I)
ADDRESS = re.compile(r"(\d+\s+[^\r\n|]*?Salt Lake City[^\r\n]*)", re.I)


def clean_text(s):
    return re.sub(r"[ \t]+", " ", (s or "").replace("\r\n", "\n")).strip()


def parse_room(room_name, description):
    """Return venue, level, room, address, offsite flag."""
    parts = [p.strip() for p in (room_name or "").split("|")]
    if room_name == "Off-Site Location":
        m = re.search(r"Location:\s*([^\r\n]+)", description or "") or ADDRESS.search(description or "")
        loc = m.group(1).strip(" |") if m else None
        venue = loc.split("|")[0].split(",")[0].strip() if loc else "Off-site (location not listed)"
        return venue, None, None, loc, True
    if room_name == "Room TBD":
        return "TBD", None, None, None, False
    if room_name.startswith("Hyatt Regency Lobby"):
        return "Hyatt Regency", None, "Lobby", "170 South West Temple, Salt Lake City, UT 84101", False
    venue = parts[0]
    level = next((p for p in parts[1:] if p.lower().startswith("level")), None)
    room = " | ".join(p for p in parts[1:] if p != level) or None
    address = {
        "Salt Palace": "90 South West Temple, Salt Lake City, UT 84101",
        "Hyatt Regency": "170 South West Temple, Salt Lake City, UT 84101",
    }.get(venue)
    return venue, level, room, address, False


def registration(title, formats, description):
    """Classify what kind of registration a session needs."""
    t, desc = title.upper(), (description or "").lower()
    sold_out = "SOLD OUT" in t
    if "kubecon registration not required" in desc or "registration not re" in desc and "free to attend" in desc:
        kind, label = "free_open", "Free and open to the public; no KubeCon pass needed"
    elif "SEPARATE REGISTRATION" in t or "Co-located Event (sponsor)" in formats:
        kind, label = "separate", "Separate registration with the host required"
    elif "ALL ACCESS PASS" in t or "Co-located Event (CNCF)" in formats:
        kind, label = "all_access", "KubeCon All-Access pass required"
    else:
        kind, label = "kubecon_pass", "Any KubeCon + CloudNativeCon pass"
    return {"type": kind, "label": label, "sold_out": sold_out}


def main(src, out_dir):
    data = json.loads(Path(src).read_text(encoding="utf-8"))
    cats = {i["id"]: i["name"] for c in data["categories"] for i in c["items"]}
    rooms = {r["id"]: r["name"] for r in data["rooms"]}
    q_company = next((q["id"] for q in data["questions"] if q["question"] == "Company"), None)

    def company(sp):
        for qa in sp.get("questionAnswers") or []:
            if qa.get("questionId") == q_company:
                return qa.get("answerValue") or qa.get("answer")
        return None

    speakers = {s["id"]: {"name": s["fullName"], "company": company(s)} for s in data["speakers"]}

    docs = []
    for s in data["sessions"]:
        names = [cats.get(i) for i in s.get("categoryItems") or [] if cats.get(i)]
        formats = [FORMATS[n] for n in names if n in FORMATS]
        levels = [n for n in names if n in LEVELS]
        topics = [n for n in names if n not in FORMATS and n not in LEVELS
                  and n not in ("End User Talk", "Learning Lounge", "Slides Attached")]
        if "Logistics" in formats:
            continue  # badge pick-up, coat check, breaks: not talks

        desc = clean_text(s.get("description"))
        room_name = rooms.get(s.get("roomId"), "Room TBD")
        venue, level, room, address, offsite = parse_room(room_name, desc)
        title = TITLE_TAG.sub(" ", s["title"]).strip(" |")

        docs.append({
            "id": s["id"],
            "title": title,
            "title_raw": s["title"],
            "abstract": desc,
            "speakers": [speakers[i] for i in s.get("speakers") or [] if i in speakers],
            "start": s.get("startsAt"),
            "end": s.get("endsAt"),
            "day": (s.get("startsAt") or "")[:10] or None,
            "location": {
                "venue": venue,
                "level": level,
                "room": room,
                "room_full": room_name,
                "address": address,
                "offsite": offsite,
            },
            "topics": topics,                      # official KubeCon track(s), e.g. "Security"
            "topics_inferred": [] if topics else infer_topics(title + " " + desc),  # keyword guess, only if no track
            "format": formats[0] if formats else "Session",
            "audience_level": levels[0] if levels else None,
            "end_user_talk": "End User Talk" in names,
            "slides_available": "Slides Attached" in names,
            "registration": registration(s["title"], formats, desc),
            "accessibility": OFFICIAL_VENUE_ACCESS if venue in ("Salt Palace", "Hyatt Regency") else UNVERIFIED_ACCESS,
            "url": f"https://kubecon-cloudnativecon-north-america-2026.sessionize.com/session/{s['id']}",
        })

    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    (out / "talks.json").write_text(json.dumps(docs, indent=2, ensure_ascii=False), encoding="utf-8")
    with open(out / "talks.bulk.ndjson", "w", encoding="utf-8", newline="\n") as f:
        for d in docs:
            f.write(json.dumps({"index": {"_index": INDEX, "_id": d["id"]}}) + "\n")
            f.write(json.dumps(d, ensure_ascii=False) + "\n")
    (out / "mapping.json").write_text(json.dumps(MAPPING, indent=2), encoding="utf-8")
    print(f"wrote {len(docs)} talks to {out}")


KW = {"type": "keyword"}
MAPPING = {
    "mappings": {
        "properties": {
            "id": KW,
            "title": {"type": "text", "fields": {"suggest": {"type": "search_as_you_type"}, "raw": KW}},
            "title_raw": {"type": "text"},
            "abstract": {"type": "text"},
            "speakers": {"properties": {"name": {"type": "text", "fields": {"raw": KW}}, "company": KW}},
            "start": {"type": "date"},
            "end": {"type": "date"},
            "day": {"type": "date", "format": "yyyy-MM-dd"},
            "location": {"properties": {
                "venue": KW, "level": KW, "room": KW, "room_full": {"type": "text", "fields": {"raw": KW}},
                "address": {"type": "text"}, "offsite": {"type": "boolean"},
            }},
            "topics": KW,
            "topics_inferred": KW,
            "format": KW,
            "audience_level": KW,
            "end_user_talk": {"type": "boolean"},
            "slides_available": {"type": "boolean"},
            "registration": {"properties": {"type": KW, "label": {"type": "text"}, "sold_out": {"type": "boolean"}}},
            "accessibility": {"properties": {
                "status": KW, "wheelchair_accessible": {"type": "boolean"},
                "notes": {"type": "text"}, "source": KW,
            }},
            "url": KW,
            # filled in later by scripts/embed_talks.py (OpenAI text-embedding-3-small)
            "embedding": {"type": "dense_vector", "dims": 1536, "index": True, "similarity": "cosine"},
        }
    }
}

if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main(sys.argv[1], sys.argv[2])
