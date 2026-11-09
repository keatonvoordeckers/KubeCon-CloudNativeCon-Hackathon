| Integration | Gitar reads | Gitar writes / updates | Auth method | Plan / self-hosted caveats |
| - | - | - | - | - |
| Custom MCP server | Advertised tools; the arguments Gitar sends per call | Nothing in Gitar's data; tool results steer the agent | `None`, or one HTTPS auth header (name and value, prefix included) | Enterprise, org admins, unlimited connections; remote Streamable HTTP only, no stdio |
| Skills | `SKILL.md` frontmatter and body, plus directory files the agent opens | Review comments and other output of the procedure | None of its own; uses the agent's existing tools | Pro and Enterprise; lives in the repo or a configuration repo, not the dashboard |
| Jira | Issues, user info, watchers, ticket references in PR title, body, branch | Transitions, comments, new issues, issue links | Gitar Atlassian app (Cloud, no stored token) or personal access token plus instance URL and email (Data Center/Server) | Cloud app install needs a site admin; Data Center tokens expire; scope names (not specified) |
| Linear | Issues, watchers and stakeholders | Status, comments, new issues, issue relationships | Linear OAuth app | Cloud OAuth only; no token path documented; scope names (not specified) |
| Plane | Work items, project lists, search results | New and updated work items, comments, transitions, follow-ups | Service-account API token, base URL, workspace slug | Cloud or self-hosted v0.28.0+, HTTPS 443 with a publicly trusted certificate; 60 requests/minute per token (fixed on Cloud) |
| YouTrack | Issues, projects, search via YouTrack's query language | New and updated issues, comments, transitions | Permanent token plus base URL, including any context path | InCloud or self-managed; Contributor role (Developer before 2026); token expires |
| Slack | Channel and DM context pulled into a review | Posts to public/private channels and DMs | Slack app OAuth installation | Installation per workspace; scopes (not specified) |

A bare key such as `PROJ-123` looks identical across all four trackers, so Gitar attributes it by precedence: Jira, then Linear, then Plane, then YouTrack. An organization with two trackers never resolves a bare key to the second one.

### Custom Integrations (MCP)
*Source: [docs.gitar.ai/integrations/custom-integrations](https://docs.gitar.ai/integrations/custom-integrations)*

Register your own MCP server and its tools reach every rule and agent, beside the built-in integrations. Enterprise feature, unlimited connections, organization administrators only; deletion stays available if the entitlement is later removed. Prefer a skill when the guidance has no server behind it, because a skill is versioned with the code it describes.

| Transport | Supported | Notes |
| - | - | - |
| Streamable HTTP over HTTPS | Yes | JSON and streaming responses work |
| Legacy SSE plus a separate message endpoint | No | The older two-endpoint shape is unsupported |
| stdio / local package | No | A server shipping only as a local package must be hosted at a URL Gitar can reach |

**Configuration.** The endpoint URL is the only thing you supply: the name comes from the endpoint host, so `https://mcp.acme.com/mcp` becomes **Acme**, and tool descriptions come from your server. HTTPS only; a URL with credentials, a query string, a bare IP, or an internal hostname is rejected with an explanation. An integration saved without an endpoint under the older schema still loads and needs an endpoint or deletion. Config lives in the dashboard at **Settings → Integrations → Custom MCP servers → Add MCP server**; there is no JSON manifest or repository file.

**Credentials.** One row is a header name and its value: it starts as `Authorization`, and the value includes the prefix your server expects, so a bearer token goes in as `Bearer sk-...` Leave **Authentication** on **None** when no auth is needed. Values are stored securely per organization and per server, never read back into the form (an edit shows **Unchanged**), never written to rule files or the repository, and the model never sees them. Two servers can hold different values on the same header without either receiving the other's. Never put a credential in the URL.

**Allowed Tools.** Empty means every tool the server advertises; naming tools, spelled exactly as the server advertises them, narrows the set and is the only way to withhold one. Gitar does not enumerate your server's tools, so take names from its documentation. A server narrowed to nothing is badged **No tools allowed** and is not started.

**Exposure.** The server receives its auth headers and the tool arguments Gitar sends, which can include repository content or facts extracted from a pull request. It gets no access to the checkout or to Gitar's configuration and never sees another integration's credentials, so register only servers trusted with repository data. A rule or skill can pass extracted facts as arguments, for example a ticket reference and whether the diff touches CI configuration, then use the returned risk level to choose its next step. The auto-approve evaluator cannot call MCP tools and does not inherit earlier results, so naming a risk tool there does not make its result an approval condition.

**From a rule.** Once enabled, an integration is available to every rule; name it in plain language:

```markdown
---
title: "Enrich PRs with Internal Docs"
description: "Look up internal documentation for changed modules"
when: "PRs that modify a documented internal service"
actions: "Comment with links to the relevant internal docs"
---

# Internal Docs Enrichment

When a PR touches a documented service, use the Acme Search integration
to find the relevant internal docs and link them in a review comment.
```

### Skills
*Source: [docs.gitar.ai/integrations/skills](https://docs.gitar.ai/integrations/skills)*

A skill is a markdown file of instructions; calling it by name loads the procedure into the agent's turn, so it lives in one file instead of being repeated in every rule. Pro and Enterprise, alongside repository rules. It is instructions plus any scripts beside them, where a custom integration is a server the agent calls. Commit it to a repository, or to one of up to three configuration repositories the organization inherits from.

```text
your-repo/
  .gitar/skills/
    migration-check/
      SKILL.md
      scripts/
        find_callers.sh
    release-notes/
      SKILL.md
```

Gitar reads four directories in a repository, in this order: `.gitar/skills/`, which wins a name collision, then `.claude/skills/`, `.agents/skills/`, and `.github/skills/`, each read as-is, so a skill already written for Claude Code, Codex, or Copilot needs no second copy. Nesting works (`.gitar/skills/packages/api/migration-check/SKILL.md`), and the directory holding a `SKILL.md` is the skill, so nothing inside it is read as a second one. Configuration repositories add `skills/` and `plugins/<plugin>/skills/`, making a marketplace repository work as-is; a repository's own skill wins a collision.

Frontmatter, then the instructions:

```markdown
---
name: migration-check
description: Verify a database migration is reversible and safe to run against production
---

# Migration Check

When a PR adds a file under `db/migrations/`:

1. Confirm the migration has a `down` step, or a comment saying why it cannot.
2. Run `scripts/find_callers.sh <table>` to list the code paths that read the
   affected table.
3. Flag any column drop or rename that ships in the same PR as code reading it,
   since the deploy is not atomic.

Report each problem with the file and line. Say nothing when the migration is clean.
```

| Field | Required | Description |
| - | - | - |
| `name` | No | How the skill is called, kebab-case; defaults to the directory name |
| `description` | No | One line on when it applies, read when the agent decides whether to call it, so write a trigger |
| `disable-model-invocation` | No | `true` hides the skill from the agent's list; a rule naming it still loads it |

The body reaches the agent as written, so write instructions to follow, not documentation. Keys Gitar does not read, such as `allowed-tools` or `license`, are ignored rather than rejected.

Name the skill in a rule:

```markdown
---
title: "Migration Safety"
description: "Check database migrations before they merge"
when: "PRs that add or modify files under db/migrations/"
actions: "Comment with any reversibility or ordering problems"
---

# Migration Safety

When a PR touches `db/migrations/`, use the `migration-check` skill and post
its findings as a review comment. Say nothing when the migration is clean.
```

Or ask on any PR: `gitar run the migration-check skill on this`. Naming the skill is what calls it; slash syntax does not work, so `/migration-check` does nothing.

**Limits.** The agent follows a skill with the tools it already has and the repository checked out, so the skill can read files and run scripts from its directory. Only `SKILL.md` is read up front, but the rest of the directory is checked out, so it can point at `references/schema.md` or run `scripts/check.sh`. It gets no MCP server and no secrets, so anything reaching an external system belongs in a custom integration, and a skill cannot use your Jira or Slack credentials. A skill runs only when something calls it and costs nothing on other runs, unlike `.gitar/review/` instructions, which load and are paid for on every run.

| You want | Use |
| - | - |
| Guidance on every PR | `.gitar/review/` |
| A procedure the agent runs when asked | A skill |
| A workflow that fires on a condition | A rule |
| To read or write an external system | A custom integration |

### Jira
*Source: [docs.gitar.ai/integrations/jira](https://docs.gitar.ai/integrations/jira)*

Gitar reads Jira issues, updates their status, and comments on them from pull requests. It auto-links issues even when ticket references are missing, posts implementation summaries on merge, suggests reviewers from issue watchers and stakeholders, and opens follow-up issues for unresolved comments and new TODOs.

| Method | Use it when | Credentials Gitar stores |
| - | - | - |
| Gitar Atlassian app | Jira Cloud, recommended | None |
| Personal access token | Jira Data Center or Server, where the app cannot be installed | The token you paste |

**Cloud, with the app.** Under **Settings → Integrations**, find the **Atlassian** card under **Ticketing & Documentation**, click **Connect**, choose **Gitar Atlassian app**, click **Install for Jira**, and install as a site admin. Then in Atlassian open **Apps → Manage apps → Gitar → Get started** and generate a connect code shaped `GITAR-XXXX-XXXX-XXXX-XXXX`, valid for 15 minutes, and paste it under **Paste your connect code** on the Atlassian card. The app is installed once per site and reads and writes as the app, so no user token is stored and nothing expires when an admin leaves. A site admin already signed in to Gitar may see an Atlassian authorization screen instead of a code; that proves ownership only, keeps no token, and reads still run through the app.

**Data Center or Server, with a token.** In Jira, create a token under **Profile → Personal Access Tokens** named `Gitar Integration` (shown once). On the Atlassian card choose **Personal Access Tokens**, expand **Jira**, enter the **Jira Instance URL** (for example `https://jira.your-company.com`), the **Jira User Email**, and the token, then review and **Save**. An expired token makes Jira calls fail; generate a new one and update the card.

**Permissions and use.** Gitar needs read access to issues and user information, and write access to create and update issues, add comments, and transition them; exact scope names are (not specified). Enable the Jira rules per repository under **Rules** in the sidebar, or ask for Jira by name in a custom rule.

### Linear
*Source: [docs.gitar.ai/integrations/linear](https://docs.gitar.ai/integrations/linear)*

Gitar reads Linear issues, updates their status, and comments on them from pull requests, matching the Jira capabilities. To connect, open **Settings → Integrations**, find the **Linear** card under **Ticketing & Documentation**, click **Connect**, then on Linear's authorization page select the workspace, review the permissions, and click **Approve**. The card confirms the connection.

The OAuth app is the only documented path; token-based or self-hosted setups and granular scope names are (not specified). Gitar holds read and write access to issues in the workspace, enough to read issue details, create issues, and comment on a user's behalf.

Five built-in rules appear in the catalog once connected: **Linear Auto-Linking** (attach relevant issues to PRs with no linked ticket), **Summary of change to Linear issue** (implementation summary on merge), **Multi-Issue Relationship Linking** (relate issues attached to the same PR), **Reviewer Assignment from Issue** (assign reviewers from watchers and stakeholders), and **Unaddressed Items Follow-up** (follow-up issues for unresolved comments and new TODOs on merge). Enable them per repository under **Rules**, or name Linear in a custom rule.

### Plane
*Source: [docs.gitar.ai/integrations/plane](https://docs.gitar.ai/integrations/plane)*

Plane Cloud and self-hosted both connect. Gitar resolves a `PROJ-123` reference from a PR title, description, or branch, reads work items, creates and updates them, comments, and moves them between states. It also reads work items for functional validation, which judges a PR against the objectives its work item asks for; that needs no rule. On Cloud, enter `https://app.plane.so` as the base URL.

**Self-hosted prerequisites.** Version v0.28.0 or later, since earlier versions lack the route that resolves a work item by display key; HTTPS on port 443 with a publicly trusted certificate, as a self-signed certificate does not work; and reachability from Gitar, adding its egress IP addresses if you enforce an inbound allowlist. No webhook is registered, so traffic runs one direction, Gitar reaching your instance on 443.

1. **Service account.** Create a Plane user named `gitar-service` and invite it to the workspace, so its activity stays attributable and survives staff changes.
2. **Project membership.** Plane scopes access by project membership, not by token, so add `gitar-service` as a **Member** to each project. **Member** is the minimum role permitting writes (comment, create, update, transition); **Guest** is read-only.
3. **API token.** Signed in as `gitar-service`, open **Workspace Settings → API tokens**, click **Add API token**, name it `gitar`, and copy it; Plane shows it once, so record the expiry.
4. **Rate limit, self-hosted only.** The default `60/minute` per token is shared by every Gitar run in the organization. Set `API_KEY_RATE_LIMIT=600/minute` and restart the `api` container even if you only changed the environment, because Plane reads the rate at startup. The Cloud cap is fixed.
5. **Connect.** Under **Settings → Integrations**, open the **Plane** card under **Ticketing & Documentation**, click **Connect**, and enter the values below.

| Field | Value | Example |
| - | - | - |
| Plane Base URL | Your instance, HTTPS only, or `https://app.plane.so` on Cloud | `https://plane.your-company.com` |
| Workspace Slug | The slug in your Plane URL | `acme` for `https://app.plane.so/acme/` |
| Plane API Token | The token copied earlier | `plane_api_...` |

In a rule, ask for Plane by name; Gitar can look up a work item by key, search, list a project, create, update, comment, and transition. A **Guest** membership gives read-only access, enough for functional validation because every write fails. Gitar sees only the projects `gitar-service` belongs to, even though the token itself reaches every workspace its user can access. An expired token makes Plane calls fail until a new one is entered under **Settings → Integrations → Plane**, and a base URL is rejected unless it is HTTPS, with no exception for an internal hostname.

### YouTrack
*Source: [docs.gitar.ai/integrations/youtrack](https://docs.gitar.ai/integrations/youtrack)*

InCloud and self-managed both connect with a single field. Gitar resolves a `PROJ-123` reference from a PR title, description, or branch, reads issues, creates and updates them, comments, and moves them between states, and reads issues for functional validation without a rule.

**Prerequisites.** InCloud needs no checks; enter your tenant URL, for example `https://acme.youtrack.cloud`, with no separate API host. Self-managed needs HTTPS on port 443 with a publicly trusted certificate and reachability from Gitar, whose egress IP addresses you add if you enforce an inbound allowlist. No webhook is registered. If the instance sits under a context path, enter the whole base URL including it, for example `https://tools.your-company.com/youtrack`.

1. **Service account.** Under **Administration → Users → New user**, create `gitar-service`.
2. **Project role.** A permanent token carries its user's permissions, so roles decide what Gitar reaches. In each project, open **Settings → Access**, add `gitar-service`, and give it **Contributor** (comment, create, update, transition); **Observer** is read-only. YouTrack renamed these roles in 2026; earlier versions call them **Developer** and **Reporter**.
3. **Permanent token.** Signed in as `gitar-service`, open **Profile → Account Security**, click **New token** under **Authentication tokens**, name it `gitar`, leave the scope at **YouTrack**, and copy it; it is shown once, so record the expiry.
4. **Connect.** Under **Settings → Integrations**, open the **YouTrack** card under **Ticketing & Documentation**, click **Connect**, and enter the values below.

| Field | Value | Example |
| - | - | - |
| YouTrack Base URL | Your instance, HTTPS only, including any context path | `https://acme.youtrack.cloud` |
| Permanent Token | The token copied earlier | `perm-...` |

Ask for YouTrack by name in a rule; Gitar can look up an issue by id, search, list a project, create, update, comment, and transition. Search takes YouTrack's own query language, so a rule can ask for `#Unresolved Assignee: me` and get what the UI returns. Markdown needs no enabling, as YouTrack renders the markdown Gitar writes. Gitar sees only projects `gitar-service` holds a role on; a card that connects but reports no projects means the account has no role yet. An expired token makes calls fail until a new one is entered under **Settings → Integrations → YouTrack**. The base URL is HTTPS only, and a trailing `/api` is trimmed.

### Slack
*Source: [docs.gitar.ai/integrations/slack](https://docs.gitar.ai/integrations/slack)*

The Gitar Slack App posts pull request activity to a workspace, so the team follows reviews and CI failures inside Slack. Gitar posts to public and private channels, sends direct messages to individual users, and pulls Slack context back into a review. Connect under **Settings → Integrations** from the **Slack** card under **Communication**: click **Connect**, then on Slack's authorization page select the workspace and click **Allow**. The card's button becomes **Configure** once the install completes. To send something, comment on the pull request with what to send and to whom; name Slack in a custom rule and the agent picks it up like Jira or Linear. Required OAuth scopes, plan eligibility, and any self-hosted caveat are (not specified).
