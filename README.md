# KubeCon SLC Navigator

Map-first planner for KubeCon + CloudNativeCon NA 2026 (582 talks, 10+ venues). Search in plain English,
see a live heatmap of where matching talks are in the Salt Palace, open full talk details, and build a
Mon–Thu schedule with conflict warnings and Google/Apple Calendar export.

Built at the WeMakeDevs **Cloud Native Hackathon**, SLC, Nov 9 2026 · Tracks: **Elasticsearch · Gitar · Merge Forward**

## Features
- **Hybrid search**: "how do I stop my cluster from getting hacked" finds security talks without the
  word *security*; exact names ("KubeHound") still rank first; typos are tolerated.
- **Heatmap floor plans** (Salt Palace L1–L3): every room and hall is colored by matching talks.
- **Click a result** to jump to its level, center the map on its room, and open speakers + abstract.
- **Filters**: day, accessible venues only. **My Schedule** with conflicts and calendar export.
- Drag to pan the map; double-click to re-center. Off-site and Hyatt talks are in a list view.

## Sponsor tools
**Elasticsearch** is the core data layer: one `/search` call returns talks *and* heatmap counts.
- Keyword: `multi_match` (`title^3`, `abstract`, `speakers.name`, `fuzziness: AUTO`)
- Semantic: OpenAI embeddings in a `dense_vector` field + `knn` (top 10, boost 10), combined with keyword
  in one request (hybrid). Falls back to keyword-only if OpenAI is unavailable.
- Filters: `bool.filter` (`term` / `prefix`). Heatmap: nested `terms` aggs venue → level → room.

**Gitar**: features landed through Gitar-reviewed PRs (#1–#10), with project
[review instructions](.gitar/review/conventions.md), an [API/frontend sync rule](.gitar/rules/api-frontend-sync.md),
and CI on every PR. Gitar pushed a fix commit (`8d07a13`).

**Merge Forward**: "accessible venues only" filter (official venues verified from the
[KubeCon accessibility page](https://events.linuxfoundation.org/kubecon-cloudnativecon-north-america/attend/inclusion-accessibility/);
off-site venues shown as *unverified*), quiet rooms on the map, counts never shown by color alone,
keyboard/screen-reader support, high-contrast and font-size toggles.

## Architecture
```
Browser (static/: vanilla JS + SVG floor plans) → FastAPI (app/main.py, app/search.py)
   → Elasticsearch 9 (index kubecon-talks)  +  OpenAI embeddings (query vectors)
```

## Setup
Requires Docker, Python 3.11+. OpenAI key optional (keyword-only without it).
```bash
git clone https://github.com/keatonvoordeckers/KubeCon-CloudNativeCon-Hackathon.git && cd KubeCon-CloudNativeCon-Hackathon
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt

docker compose -f partner-setup/docker-compose.yml up -d --wait     # Elasticsearch :9200, Kibana :5601

mkdir data
curl -o data/schedule.json https://kubecon-cloudnativecon-north-america-2026.sessionize.com/api/schedule
python scripts/build_dataset.py data/schedule.json data/
curl -X PUT localhost:9200/kubecon-talks -H "Content-Type: application/json" --data-binary @data/mapping.json
curl -X POST "localhost:9200/_bulk?refresh=true" -H "Content-Type: application/x-ndjson" --data-binary @data/talks.bulk.ndjson

cp .env.example .env                                   # add OPENAI_API_KEY
export $(grep -v '^#' .env | xargs) && python scripts/embed_talks.py   # optional: semantic search
uvicorn app.main:app --reload --env-file .env          # → http://localhost:8000
```
Windows PowerShell: use `curl.exe`, and load `.env` with
`Get-Content .env | % { if ($_ -match '^([^#=]+)=(.*)$') { Set-Item "env:$($matches[1])" $matches[2] } }`.

**Tests:** `pytest tests -q` (CI runs `tests/test_search.py`; no Elasticsearch or OpenAI needed).

## Data
- Talks: public KubeCon NA 2026 schedule (Sessionize), built locally and not committed; only speaker names
  and companies are kept. `static/js/mockData.js` is a small offline sample.
- Accessibility: official KubeCon page only; other venues are labeled *unverified*.
- Topics: official track, else a keyword guess stored separately (`topics_inferred`).
- Floor plans: simplified layouts drawn by the team.

**Limitations:** no floor plan for the Hyatt and off-site venues; room sizes are approximate.

## AI disclosure
- **Claude (Anthropic, Claude Code)**: planning, the dataset script, Docker setup and Kibana cheat sheet
  (before the event); guidance and code review on the backend we wrote; and, at our request, the
  frontend↔backend connection, talk-details dialog, map panning, Level 1 redraw, venue/room filters,
  UI bug fixes and this README. All of it was reviewed and tested by us.
- **AI coding agents** (see `docs/ai-context/`) for parts of the frontend. _TODO (Jorge): tools and usage._
- **Gitar** reviewed PRs. **OpenAI** `text-embedding-3-small` powers semantic search in the product.

## Team
- **Keaton Voordeckers** ([keatonvoordeckers](https://github.com/keatonvoordeckers)): backend and search
- **Jorge** ([TheFlawedDev](https://github.com/TheFlawedDev)): frontend, floor plans, calendar export
