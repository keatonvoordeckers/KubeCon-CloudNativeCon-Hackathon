#!/usr/bin/env python3
"""Assemble parts/*.md into a single agent-readable gitar-docs.md."""
import re, pathlib

BASE = pathlib.Path("/Users/jorgevelazquez/Documents/deepseek-harness/default-workspace/gitar-docs")
PARTS = BASE / "parts"

STRUCTURE = [
    ("Part 1 — Start here", ["00-start.md"]),
    ("Part 2 — Review and fix features", ["10-code-review.md", "20-analysis.md", "30-rules.md"]),
    ("Part 3 — Configuration", ["40-config.md"]),
    ("Part 4 — Setup: code hosts and CI", ["50-code-hosts.md", "60-ci.md"]),
    ("Part 5 — Integrations", ["70-integrations.md"]),
    ("Part 6 — Administration, security, billing, API", ["85-admin.md", "80-api.md"]),
    ("Part 7 — FAQ and release notes", ["90-faq-notes.md"]),
]

def anchor(text: str) -> str:
    t = text.lower()
    t = re.sub(r"[^\w\s-]", "", t)
    return re.sub(r"\s", "-", t).strip("-")

front = (BASE / "front.md").read_text().rstrip() + "\n"

def clean(text: str) -> str:
    """Strip Mintlify export artifacts (fence metadata, card wrappers)."""
    text = re.sub(r"^(```[\w+-]*) theme=\{null\}$", r"\1", text, flags=re.M)
    text = re.sub(r"^> \[(card|tab|accordion)\] (.+)$", r"**\2**", text, flags=re.M)
    return text

body_lines = []
for title, files in STRUCTURE:
    body_lines.append(f"\n## {title}\n")
    for f in files:
        text = clean((PARTS / f).read_text().rstrip() + "\n")
        body_lines.append(text)
body = "\n".join(body_lines)

# ---- TOC from ### page headings ----
toc = ["## Contents", ""]
current_part = None
for line in body.splitlines():
    if line.startswith("## Part "):
        current_part = line[3:].strip()
        toc.append(f"\n**{current_part}**\n")
    elif line.startswith("### "):
        t = line[4:].strip()
        toc.append(f"- [{t}](#{anchor(t)})")
toc.append("")
toc_md = "\n".join(toc) + "\n---\n"

# ---- source map ----
pages = []
lines = body.splitlines()
for i, line in enumerate(lines):
    if line.startswith("### "):
        title = line[4:].strip()
        url = ""
        for j in range(i + 1, min(i + 6, len(lines))):
            m = re.search(r"\*Source: \[[^\]]*\]\((https?://[^)]+)\)\*", lines[j])
            if m:
                url = m.group(1)
                break
        pages.append((title, url))

source_map = ["## Source map", "",
              "Every page of <https://docs.gitar.ai> consolidated here, in document order.", "",
              "| Page | Canonical URL |", "| --- | --- |"]
for t, u in pages:
    source_map.append(f"| {t} | {u or '(no explicit source line)'} |")
source_map_md = "\n".join(source_map) + "\n"

back = f"""
---

{source_map_md}
## About this compilation

**What was read.** The full Gitar documentation corpus — 63 pages — retrieved from the site's
machine-readable export (`https://docs.gitar.ai/llms-full.txt`, 8,366 lines, ~432 KB) plus the
`llms.txt` index and `sitemap.xml`. Interactive elements that only exist on the rendered site
(screenshots, accordions, tab groups) were flattened into prose or lists.

**Method.** Each documentation cluster was distilled page by page: section structure, tables,
procedures, and every operational fact (command syntax, label names, setting labels and defaults,
file paths, config keys, API routes and parameters, CI snippets, plan gates, limits). Marketing copy
and cross-link boilerplate were dropped. Code blocks and YAML/JSON/SQL templates are preserved
verbatim so they can be reused directly.

**Known issues in the source docs.** These are reproduced faithfully above rather than silently
"fixed", but worth knowing:

- Most behavior toggles do not publish an explicit default. Where Gitar's docs state one it is given;
  where they do not, the cell says `(not specified)`.
- The Repository Customization page says both that `.gitar/rules/` and `.gitar/review/` are read
  recursively *and* that "both rule directories are read one level deep". The conservative reading —
  Cursor/Claude rule directories are one level deep, `.gitar/` directories recurse — is used in
  [Repository Customization](#repository-customization).
- The release-notes page contains no Gitar version numbers, only dated entries; a sample
  `package_upgrades.md` rule sits inside the changelog and is not an upgrade guide for Gitar itself.
- Pricing is never stated in the docs; they link to <https://gitar.ai/pricing>. Plan **feature**
  gating is fully captured in [Plans](#plans).
- Subscription-cancellation and billing-portal details are Stripe-hosted and described only at the
  level of UI steps.

**Refresh guidance.** This compiles the docs as of 2025-11-09. Prices, IP ranges, plan limits, and
newly shipped features are the most volatile parts — re-pull `llms-full.txt` and diff against this
file before relying on those in a production decision.
"""

MARK = "## How to use this file"
i = front.index(MARK)
out = front[:i] + toc_md + "\n" + front[i:] + "\n" + body + "\n" + back
(BASE / "gitar-docs.md").write_text(out)

print("pages:", len(pages))
print("lines:", out.count("\n"))
print("chars:", len(out))
print("h3:", sum(1 for l in out.splitlines() if l.startswith("### ")))
print("h4:", sum(1 for l in out.splitlines() if l.startswith("#### ")))
print("tables rows:", sum(1 for l in out.splitlines() if l.startswith("|")))
print("fences:", sum(1 for l in out.splitlines() if l.startswith("```")))
missing = [t for t, u in pages if not u]
print("pages without source:", missing)
