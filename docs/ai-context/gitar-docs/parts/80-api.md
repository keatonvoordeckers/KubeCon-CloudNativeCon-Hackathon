### API Reference Overview

*Source: [docs.gitar.ai/api-reference/overview](https://docs.gitar.ai/api-reference/overview)*

The Gitar API manages your installation programmatically: onboard projects, read review/blocking status, check integration health, and create customer organizations (partner flow).

**Base URL**

```text
https://api.gitar.ai/v1
```

**Authentication** — every endpoint requires a bearer token:

```text
Authorization: Bearer <GITAR_API_TOKEN>
```

**Creating an API token**

1. Open <https://app.gitar.ai> → **Settings → API Tokens**.
2. Select **Create Token**.
3. Configure **Alias** (optional, e.g. `Health Monitor`) and **Duration** (expiration, default **30 days**).
4. Copy the token immediately — it is not shown again. Store it in CI/CD secrets or environment variables.

**Response format** — all responses are JSON. Errors carry a message:

```json
{ "message": "Not Found" }
```

**API quick reference**

| Method | Path | Purpose | Required token scope |
| --- | --- | --- | --- |
| `GET` | `/external/installation/health` | Health of connected integrations | `integrations:read` |
| `GET` | `/external/gitlab/mr_status` | Gitar blocking status for a GitLab MR | `integrations:read` |
| `POST` | `/external/gitlab/projects` | Onboard a GitLab project + create webhooks | `integrations:write` |
| `POST` | `/external/organizations` | Create a partner/customer organization | `organizations:create` or `admin` |

**Quick example — installation health (three languages)**

```bash
curl https://api.gitar.ai/v1/external/installation/health \
  -H "Authorization: Bearer $GITAR_API_TOKEN"
```

```python
import requests, os

response = requests.get(
    "https://api.gitar.ai/v1/external/installation/health",
    headers={"Authorization": f"Bearer {os.environ['GITAR_API_TOKEN']}"}
)
data = response.json()
for platform, info in data["code_hosting"].items():
    print(f"{platform}: {info['status']}")
```

```typescript
const response = await fetch("https://api.gitar.ai/v1/external/installation/health", {
  headers: { "Authorization": `Bearer ${process.env.GITAR_API_TOKEN}` }
});
const { code_hosting } = await response.json();
if (code_hosting.gitlab) console.log(`GitLab: ${code_hosting.gitlab.status}`);
if (code_hosting.github) console.log(`GitHub: ${code_hosting.github.status}`);
```

Example success body:

```json
{
  "code_hosting": {
    "gitlab": { "status": "ok", "host": "gitlab.example.com", "group": "my-org" },
    "github": { "status": "ok" }
  }
}
```

#### Endpoint: Get installation health

*Source: [docs.gitar.ai/api-reference/installation/get-installation-health](https://docs.gitar.ai/api-reference/installation/get-installation-health)*

`GET /installation/health` — returns health for **connected integrations only** (each `code_hosting.<platform>.status`). Requires `integrations:read`.

#### Endpoint: Get blocking status for a GitLab MR

*Source: [docs.gitar.ai/api-reference/gitlab/get-mr-status](https://docs.gitar.ai/api-reference/gitlab/get-mr-status)*

`GET /external/gitlab/mr_status` — reports whether Gitar is blocking a merge request. Designed for CI: fail the job when `blocked == "yes"` and mark that job required for merge.

**Parameters**

| Param | Type | Required | Notes |
| --- | --- | --- | --- |
| `project_id` | integer/string | yes | Use `$CI_PROJECT_ID` |
| `mr_iid` | integer/string | yes | Use `$CI_MERGE_REQUEST_IID` |
| `host` | string (URL) | Only when >1 GitLab instance is connected | Use `$CI_SERVER_URL` |

**Blocking status values**

| Value | Meaning | CI job |
| --- | --- | --- |
| `yes` | Gitar found issues | Fails; MR cannot merge |
| `no` | Gitar approved, or a human bypassed the block | Passes |
| `pending` | Gitar has not reviewed the MR yet | **Passes by default** |

**Why this exists:** Gitar blocks through merge-request *approval rules*, which is a GitLab Premium/Ultimate feature. A CI job gives equivalent gating on **every GitLab tier** via **Settings → Merge requests → Merge checks → Pipelines must succeed**.

```yaml
gitar-check:
  stage: test
  script:
    - |
      BLOCKED=$(curl -sf -H "Authorization: Bearer $GITAR_TOKEN" \
        "https://api.gitar.ai/v1/external/gitlab/mr_status?project_id=$CI_PROJECT_ID&mr_iid=$CI_MERGE_REQUEST_IID" \
        | python3 -c "import sys,json; print(json.load(sys.stdin)['blocked'])")
      echo "Gitar blocking status: $BLOCKED"
      if [ "$BLOCKED" = "yes" ]; then
        echo "This MR is blocked by Gitar. Resolve the findings or comment 'gitar unblock' to bypass."
        exit 1
      fi
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
```

Multi-instance form — append `&host=$CI_SERVER_URL`:

```text
"https://api.gitar.ai/v1/external/gitlab/mr_status?project_id=$CI_PROJECT_ID&mr_iid=$CI_MERGE_REQUEST_IID&host=$CI_SERVER_URL"
```

**Caveats**

- "Pipelines must succeed" gates on the *whole pipeline*, so an unrelated failure also blocks the merge. On Premium/Ultimate, Gitar's own approval rule is already scoped to Gitar and this job is unnecessary.
- Store the token as a CI/CD variable (e.g. `GITAR_TOKEN`). `CI_PROJECT_ID`, `CI_MERGE_REQUEST_IID`, `CI_PIPELINE_SOURCE`, `CI_SERVER_URL` are predefined GitLab variables.
- Without `host` on a multi-instance org, Gitar can match a same-numbered project on another instance and wrongly report `pending`.
- Bypass: a team member comments `gitar unblock`; Gitar updates status, re-triggers the pipeline, and the `gitar-check` job passes.

#### Endpoint: Onboard a GitLab project

*Source: [docs.gitar.ai/api-reference/gitlab/onboard-project](https://docs.gitar.ai/api-reference/gitlab/onboard-project)*

`POST /external/gitlab/projects` — registers a project for review and configures a project-level webhook for push and merge request events. **Idempotent**: re-posting an already-connected project returns `"status": "already_connected"`.

**Prerequisites:** token scope `integrations:write`; the connected GitLab account must be **Maintainer or higher** on the project.

**Body fields**

| Field | Type | Required | Example | Notes |
| --- | --- | --- | --- | --- |
| `project_id` | integer | one of | `12345` | Takes precedence over `project_path` |
| `project_path` | string | one of | `"my-group/my-project"` | |
| `host` | string (URL) | Required once the org has >1 GitLab instance | `"https://gitlab.com"` | |
| `offer_code` | string | no | — | Only on the organizations endpoint; see below |

**Behavior**

1. Verifies the project exists on the selected instance.
2. Registers the project for Gitar code review.
3. Configures a project-level webhook for push and merge-request events.

**Multi-instance rules**

- One connected instance → omit `host`; Gitar uses it.
- More than one → `host` is **required**; a missing or unconnected `host` is rejected with **`409 Conflict`**, and the response lists connected instances.
- The *same* project connected from two instances is supported (GitLab assigns a different ID per instance) — the normal case during migration.
- Two *different* projects sharing a numeric ID across instances is **not** supported: onboarding the second returns `409 Conflict` naming the instance that already holds the ID.

#### Endpoint: Create a partner organization

*Source: [docs.gitar.ai/api-reference/organizations/create-organization](https://docs.gitar.ai/api-reference/organizations/create-organization)*

`POST /external/organizations` — creates an Auth0 organization and emails the recipient an invitation to join it as **admin**.

**Prerequisites:** the creating org needs the **`CreateOrganizations`** entitlement; the token needs `organizations:create` or `admin` scope; token management requires `GitarAPI` access.

**Fields**

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `offer_code` | string | no | Partner offer code; omit for standard trial. Public signup offer codes are rejected. |
| recipient email / org name | — | — | (not specified in docs) |

**Behavior and gotchas**

- **Each call creates a new organization** — including retries after a partial failure or timeout. It is *not* idempotent.
- The recipient gets an email invitation expiring after **30 days**.
- The parent relationship records attribution only and **grants the creating partner no access**.
- The trial starts when the new organization connects its **first code host**, not at creation. Retired or repriced offers fall back to the standard trial at activation.
- **Rate limit:** **500 organizations per rolling 24 hours** by default; beyond that returns **`429`** and creates nothing. Contact Gitar to raise it.
