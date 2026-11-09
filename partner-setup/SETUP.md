# Hackathon setup (do this tonight)

This gets Elasticsearch + Kibana running on your laptop with all 582 KubeCon talks loaded.
Takes about 15 minutes, most of it waiting on downloads.

## 0. What's in this folder
- `docker-compose.yml`: runs Elasticsearch 9.0.0 + Kibana locally (official Elastic images)
- `mapping.json`: field types for the `kubecon-talks` index
- `talks.bulk.ndjson`: the 582 talks
- `SETUP.md`: this file

Keep these files **out of our public GitHub repo**. The dataset is gitignored.

## 1. Install the tools
- **Docker Desktop**: https://www.docker.com/products/docker-desktop/. Install it, open it, and wait until it says "Engine running".
  In Settings > Resources, give Docker **at least 4 GB of memory** (Elasticsearch + Kibana use about 2.5 GB).
- **Python 3.11+**: https://www.python.org/downloads/
- **Git**: https://git-scm.com/downloads (on Windows this also gives you Git Bash, which has `curl`)
- Python packages (run in a terminal):
  ```
  pip install "elasticsearch>=9,<10" fastapi uvicorn pytest
  ```
  The Elasticsearch client must be version 9 to match the server.

## 2. Accounts
- GitHub account (send Keaton your username so you can be added to the repo)
- Gitar account: https://gitar.ai (free trial, no credit card)

## 3. Start Elasticsearch and Kibana
Open a terminal **in this folder** (Windows: right-click the folder > "Open in Terminal" or Git Bash; Mac: Terminal + `cd`), then run:
```
docker compose up -d --wait
```
The first run downloads about 1.5 GB, so give it a few minutes. When it's done, check it:
```
curl localhost:9200
```
You should see `"number" : "9.0.0"` and `"You Know, for Search"`.

## 4. Load the talks
Same terminal, same folder:
```
curl -X PUT localhost:9200/kubecon-talks -H "Content-Type: application/json" --data-binary @mapping.json
curl -X POST "localhost:9200/_bulk?refresh=true" -H "Content-Type: application/x-ndjson" --data-binary @talks.bulk.ndjson
curl localhost:9200/kubecon-talks/_count
```
The last command should print `"count":582`.

> **Windows PowerShell note:** in PowerShell, `curl` is a different command. Use **Git Bash**, or type `curl.exe` instead of `curl`.

## 5. Try it in Kibana (counts as research, so it's allowed before kickoff)
Open http://localhost:5601, then Menu (☰) > **Dev Tools**, paste this, and click ▶:
```
GET kubecon-talks/_search
{
  "query": {
    "multi_match": {
      "query": "securty",
      "fields": ["title^3", "abstract"],
      "fuzziness": "AUTO"
    }
  }
}
```
It still finds security talks even with the typo. Also try a heatmap-style count:
```
GET kubecon-talks/_search
{
  "size": 0,
  "query": { "term": { "day": "2026-11-10" } },
  "aggs": { "levels": { "terms": { "field": "location.level" } } }
}
```

## Useful fields
| Field | Example |
|---|---|
| `title`, `abstract`, `speakers.name` | full-text search |
| `day` | `2026-11-10` |
| `start` / `end` | `2026-11-10T11:30:00` (Mountain Time, no time zone: don't convert it) |
| `location.venue` / `location.level` / `location.room` | `Salt Palace` / `Level 2` / `255 BC` |
| `topics` (official track) / `topics_inferred` (keyword guess) | `Security` |
| `audience_level` | `Beginner`, `Advanced`, `Any Level` |
| `registration.type` | `kubecon_pass`, `all_access`, `separate`, `free_open` |
| `accessibility.wheelchair_accessible` | `true`, or `null` for unverified off-site venues |

## Everyday commands (run in this folder)
- Start: `docker compose up -d`
- Stop (frees about 2.5 GB RAM): `docker compose stop`
- Wipe and start over: `docker compose down -v`, then redo step 4

## Rules reminders for tomorrow
- **No project code before 11:00 AM.** Setup, sketches, and playing in Kibana are fine.
- We'll disclose AI use in the README. The dataset was built with Claude's help.
- Every feature goes through a pull request reviewed by Gitar. No pushing to `main`.

## Monday logistics
- The Shop Workspace, 350 E 400 S, Salt Lake City. Check-in opens at **9:00 AM**. Get there early, because the room fills up.
- Bring your laptop, your charger, and your Luma ticket.
- Start Docker and run `docker compose up -d` before you leave home.
