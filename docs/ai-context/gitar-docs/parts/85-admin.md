### SSO

*Source: [docs.gitar.ai/administration/sso](https://docs.gitar.ai/administration/sso)*

**Enterprise plan only.** Contact `developers@gitar.ai` to have SSO enabled for the organization.

Gitar supports **OIDC** and **SAML 2.0**; **OIDC is recommended** (fewer values to exchange, no certificates to rotate). Use SAML only when required by the IdP or a security policy. Okta is documented step by step; Microsoft Entra ID, Google Workspace, and OneLogin follow the generic paths.

**Credential handling:** never send a client secret by email, chat, or support ticket — use 1Password or an approved secret-sharing tool. Client IDs, domains, SAML sign-in URLs, and signing certificates are not secret and may be emailed.

**How users sign in:** users open Gitar from a tile on the IdP app dashboard. The tile opens a Gitar login link that Gitar supplies during setup. Starting sign-in from the Gitar login page is **not supported yet**.

#### Okta — OIDC

| Step | Action |
| --- | --- |
| 1 | Request OIDC SSO from your account manager or `developers@gitar.ai`, including the email domains (e.g. `example.com`). |
| 2 | Okta: **Applications → Applications → Create App Integration** → **OIDC – OpenID Connect** → **Web Application**. |
| 3 | Name it "Gitar"; grant type **Authorization Code**; sign-in redirect URI **`https://auth.sonarqube.us/login/callback`**; limit access to the groups that need Gitar. |
| 4 | Send Gitar: Okta domain (not secret), Client ID (not secret), Client Secret (secret). Gitar replies with an **Initiate login URI**. |
| 5 | Okta **General → Login → Edit**: login initiated by Okta or App; visibility "display application icon to users"; flow "Redirect to app to initiate login (OIDC Compliant)"; set the Initiate login URI Gitar supplied. |
| 6 | Assign users/groups in Okta. Gitar confirms when the connection is active. |

Initiate login URI format:

```text
https://app.gitar.ai/auth/login?connection=<connection>&organization=<organization>
```

#### Okta — SAML 2.0

1. Request SAML SSO with your email domains; Gitar emails a **Single sign-on URL** and **Audience URI**.
2. Okta: **Create App Integration → SAML 2.0**, name "Gitar", check **Do not display application icon to users** (users sign in via a bookmark tile added later).
3. SAML settings: Single sign-on URL = Gitar's value; Audience URI (SP Entity ID) = Gitar's value; Name ID format **EmailAddress**; Application username **Email**; keep **Use this for Recipient URL and Destination URL** checked.
4. Attribute statements (**Show legacy configuration → Profile attribute statements**): `email` → `user.email`, `name` → `user.displayName`.
5. Assign users/groups, then **Sign On → SAML 2.0 → More details** and send Gitar the **Sign on URL** (e.g. `https://example.okta.com/app/example_gitar_1/exk1a2b3c4/sso/saml`) and the **Signing Certificate**. Gitar replies with a **Gitar login link**.
6. Add a **Bookmark App** named "Gitar" pointing at that login link, assign the same users/groups, and hide the SAML app's own tile.

#### Generic OIDC provider

1. Request OIDC SSO from `developers@gitar.ai` with your email domains.
2. Create a web application using the **Authorization Code** flow.
3. Redirect URI: `https://auth.sonarqube.us/login/callback`.
4. Allow scopes `openid`, `profile`, `email`.
5. Send **Issuer URL**, **Client ID**, **Client Secret** (secret via secure channel). Issuer URL = base URL serving `/.well-known/openid-configuration`.
6. Set the initiate login/launch URI to the value Gitar sends.

#### Generic SAML 2.0 provider

1. Request SAML SSO; Gitar sends an **ACS URL** and **Entity ID**.
2. Create a SAML 2.0 app; ACS URL as SSO/reply URL, Entity ID as audience/identifier.
3. Name ID format = email address.
4. Map `email` → user email and `name` → display name.
5. Send Gitar the **Sign-in URL** (SSO/login URL) and the **X.509 signing certificate**.
6. Gitar replies with a login link; add it as a bookmark tile and hide the SAML app tile.

#### SSO troubleshooting

| Symptom | Fix |
| --- | --- |
| Users can't sign in | Confirm they are assigned to the Gitar app; for SAML confirm `email`/`name` mappings; sign-in must start from the IdP tile (for SAML, the bookmark tile, not the SAML app tile). |
| Redirect URI mismatch | OIDC redirect must be exactly `https://auth.sonarqube.us/login/callback`; SAML SSO URL must match Gitar's value exactly — even a trailing slash breaks it. |
| Updating config or rotating credentials | Contact `developers@gitar.ai`; for SAML send the new signing certificate **before** the old expires. |

### Security

*Source: [docs.gitar.ai/administration/security](https://docs.gitar.ai/administration/security)*

Headline posture: code is processed in **ephemeral, isolated containers**, encrypted in transit and at rest, and **never used to train models**.

| Area | Practices |
| --- | --- |
| Infrastructure | AWS; separate AWS accounts for development, staging, production, management; AWS SSO with AdministratorAccess limited to authorized personnel; private VPCs with controlled ingress/egress. |
| Containers | Non-root execution; minimal dependencies; regularly scanned images; custom bootstrap with security validation. |
| AuthN/AuthZ | Auth0 with MFA; OAuth 2.0 flows; secure session handling with automatic expiration; scope-based authorization; complete organization isolation; API tokens with configurable expiry. |
| Encryption | TLS 1.3 in transit; **AES-256-GCM** at rest for sensitive file storage; SHA-256 key derivation with proper nonce generation. |
| Repository access | Repository validated before any code access; secure Git credential handling; sandboxed workspaces; path sanitization. |
| Secrets | All sensitive credentials in **AWS Secrets Manager**, environment-specific, with rotation support; encrypted DB connection strings; automatic token refresh. |
| Webhooks | **HMAC-SHA256** signature verification, constant-time comparison, timestamp tolerance (default **5 minutes**) against replay; per-provider validation (GitHub, GitLab, Slack, Linear, others). |
| SDLC | Security-focused peer review on all changes; dependency scanning; **annual** third-party penetration tests; **quarterly** vulnerability assessments; IaC; immutable production images; annual security training; quarterly incident-response drills. |
| Retention | Zero data retention: code processed in temporary isolated containers, no source retained beyond what functionality requires; short-lived disk caching for latency; encrypted RAM; **zero-retention agreements with all AI providers** (listed on the Sonar sub-processor list). |
| Isolation | Each customer task in a separate container; no network access between customer environments; strict CPU/memory/time limits; stateless processing with no persistent local storage. |
| Compliance | Controls aligned with **SOC 2 Type II** and **ISO 27001** (docs state they are certified); **GDPR** compliant; immutable audit logs. |
| Enterprise extras | IP allowlisting; SAML 2.0 SSO; native Okta integration. |

**Contacts:** security issues → `security@gitar.ai`; general support → `developers@gitar.ai`.

#### Security FAQ

- **Repository access:** via secure OAuth integrations with GitHub and GitLab; only configured repositories, only approved maintenance tasks; all access logged and auditable.
- **Is code stored?** No — processed in ephemeral environments destroyed immediately after the task; zero-retention agreements with all AI providers.
- **Model training?** No customer code is used for training.
- **Secrets in code?** Secrets encountered during processing are not logged, stored, or transmitted outside the environment; they exist only in encrypted memory and are erased on completion.
- **Org isolation:** at database, application, and infrastructure levels.

### Members & Seats

*Source: [docs.gitar.ai/administration/members](https://docs.gitar.ai/administration/members)*

Gitar separates **organization members** (people with dashboard access) from **seats** (who Gitar reviews for and what you pay for). They are managed on different pages and need not match.

#### Organization members

Settings → Organization lists everyone with dashboard access and their role. Admins invite by email; invitees appear as **Pending** until they accept.

| Role | Permissions |
| --- | --- |
| **Admin** | Manage seats, configure settings, manage billing, set up integrations. |
| **Member** | View the organization dashboard. |

Dashboard access and roles are unrelated to seats: an admin may have no seat, and a seated developer never needs dashboard access to have PRs reviewed.

#### Seats

Seat management applies to **Core** and **Pro** (where **bots need their own paid seats**). Enterprise includes unlimited seats, so bots need none. Admins assign seats from **Settings → Billing**.

The seats list comes from the connected code host — members of your GitHub org, GitLab group, Azure DevOps org, or Bitbucket workspace — whether or not they have logged into Gitar. Users can be added manually when the platform exposes no readable member list.

| Platform | Flagged as external |
| --- | --- |
| GitHub | Outside collaborators |
| GitLab | Not flagged |
| Azure DevOps | Guest users |
| Bitbucket | Users with `collaborator` permission |

**With a seat:** automatic code review on their PRs, CI failure analysis, and all other plan features.

**Without a seat:** they can open PRs, but Gitar does not automatically review their changes or act on their commands. Gitar posts a notice when they open a PR and replies when they send a command; a seated teammate can still request work on the same PR. Nothing is billed until a seat is assigned.

**Seat tiers on the seats page**

| Group | Who |
| --- | --- |
| **Seated** | Seat assigned, full features |
| **Active, no seat** | No seat but Gitar activity in the last 30 days (GitHub, Azure DevOps, Bitbucket) |
| **Inactive** | No seat and no activity in 30 days; GitLab users always appear here because activity status is unavailable |

**Trial:** seat limits are not enforced; every PR author is reviewed regardless of seat assignment.

#### Billing context

| Plan | Seats and billing |
| --- | --- |
| Free | PR summaries on unlimited repos; no seat management |
| Core / Pro | Usage allocated per seat on a monthly cycle; billed on seats assigned |
| Enterprise | Unlimited usage, no seat limits |

#### Members troubleshooting

- **Missing from members list:** members are invite-only — an admin must invite by email.
- **Missing from seats page:** confirm membership in the connected org/group/workspace; for Azure DevOps confirm the Gitar token has **Graph & Identity (Read)** scope; for platform-less member lists (e.g. Azure DevOps Server) add the person manually.
- **"No seat" message:** an admin assigns a seat in Settings → Billing. Should not appear during a trial.

### Bring Your Own Model

*Source: [docs.gitar.ai/administration/bring-your-own-model](https://docs.gitar.ai/administration/bring-your-own-model)*

Serves **every LLM call** for your organization from your own provider account — "your provider agreement, your data boundary, your bill." Gitar still chooses the model per task; you choose the account and where calls run.

**Prerequisites:** BYOM enabled for the org (contact `support@gitar.ai` if the card is missing), organization admin role, and **Settings → Configuration → Bring Your Own Model**. **One provider option serves traffic at a time.**

| Option | What you supply |
| --- | --- |
| **Anthropic** | API key (stored encrypted; calls `api.anthropic.com`). Key needs access to Opus, Sonnet, and Haiku. |
| **AWS Bedrock** | A residency geography and an IAM role |
| **LiteLLM** | Gateway URL (bare `https://` origin, no path) and a virtual key; Gitar calls `/v1/messages` in Anthropic Messages format |
| **Portkey** | Provider slug (the name of the Anthropic integration in your Portkey workspace) and API key |
| **OpenRouter** | API key — a broker, **not** a data boundary; use Bedrock if residency is the requirement |
| Other gateway | Not supported self-serve; contact support |

#### AWS Bedrock specifics

- **Residency geographies:** United States (us-east-1, us-east-2, us-west-2); European Union (**6 EU regions, entering at eu-central-1**); Australia (ap-southeast-2 Sydney, ap-southeast-4 Melbourne); Japan (ap-northeast-1 Tokyo, ap-northeast-3 Osaka). Service control policies must allow **every** region in the chosen geography.
- **Role:** Gitar assumes it per request via AWS STS, so no standing credential is stored. **The role name must start with `gitar-bedrock-`** — Gitar's assume-role permission is scoped to that prefix.
- **External ID:** fixed per organization, never changes, not a secret — but the role's trust policy **must require it**, which is what stops others who learn the role ARN from having Gitar assume it. The **Create the role in AWS** panel shows the external ID and policies and stays available for audits.
- **Model enablement:** submit the Anthropic use-case form, then have a principal with AWS Marketplace permissions invoke each model once from a region in the geography. Listing models ≠ being allowed to call them.
- **Global cross-region inference:** off by default; routes worldwide including outside the geography — enable only if throughput outweighs residency. With it off, a model the geography cannot serve fails rather than leaving the geography.
- **Guardrails (optional):** name a guardrail ID/ARN plus a version or `DRAFT` (both required); Gitar sends it on every inference call. The role then needs `bedrock:ApplyGuardrail`. Verification sends test calls with the guardrail attached so mistakes fail at setup.

> **Guardrail pitfall:** for PII masking, set the **input** direction explicitly. Bedrock applies an action per direction; a policy that sets only the default action leaves input untouched, so the model still sees raw text. Set `inputAction` to `ANONYMIZE` and `inputEnabled` to `true` per entity type.

> **Masking code changes what Gitar reviews:** placeholders like `{EMAIL}` replace real text, so findings describe the masked version. Blocking is usually better for source code; reserve masking for entity types that must never leave your account.

#### Verification results

Saving stays disabled until verification passes. Gitar sends one small request per required model **from your account**.

| Row | Meaning |
| --- | --- |
| **Answered** | Model exists and the credential may call it |
| **Refused** | Endpoint denied the call — bad credential, upstream auth failure, or restricted model access |
| **Not offered** | Endpoint does not carry the model (geography without it, or a gateway catalog lacking it) |
| **No answer** | Throttled or transient fault; verify again |

#### Live monitoring and storage

| Card | Action |
| --- | --- |
| **API Key Invalid** | Re-enter the key and verify |
| **Permission Denied** | Credential refused; for Bedrock check the trust policy still names Gitar's principal and model access is on |
| **Configuration Cannot Serve Traffic** | Geography carries no usable model; change geography or allow global inference |
| **Spend Limit Reached / Billing Issue** | Raise the limit or settle with the provider |

Reviews are **held**, not silently routed back through Gitar's account. Saving a replacement key or changing provider resumes held work; so does a later successful provider request.

- Anthropic/gateway credentials: stored encrypted in Gitar's secret store; config holds only a reference.
- Bedrock: **no credential stored** — ARN, geography, and external ID are non-secret, and credentials are minted per request by STS.
- **Clear** removes the configuration and every stored credential and returns the org to Gitar's account.

#### Gateway network rules

The proxy must be reachable from the public internet. Gitar **refuses on save** a bare IP, `localhost`, or any `.internal`, `.local`, `.svc.cluster.local` host, and **refuses on connect** a hostname resolving into private address space. If the proxy enforces an IP allowlist, permit Gitar's public IPs (see [Network Access](#network-access)). Gitar sends `x-api-key` to LiteLLM (which also accepts `Authorization: Bearer`).

#### Model aliases on gateways

LiteLLM `model_name` values are gateway-chosen, not a universal catalog — query `/v1/models` with the Gitar virtual key. Gitar's Anthropic and LiteLLM options request **`claude-haiku-4-5`**, Anthropic's short alias following the most recent snapshot of that minor version. For a mismatch on `/v1/messages`, add a `model_list` entry with the exact name shown by **Verify connection**, copying the existing deployment's `litellm_params` and changing only `model_name`, while keeping the original entry for other clients.

### Audit Logs

*Source: [docs.gitar.ai/administration/audit-logs](https://docs.gitar.ai/administration/audit-logs)*

**Enterprise plan.** Records every configuration change with the user and timestamp.

| Category | Examples |
| --- | --- |
| Organization settings | Enabling/disabling code review, changing auto-fix defaults |
| Repository configuration | Adding or updating repo-level settings |
| Agent settings | Changes to agent behavior and rules |
| Integrations | Setup/removal of Jira, Slack, Linear |
| SSO configuration | Changes to single sign-on settings |
| Billing | Checkout, plan changes, portal access, seat updates |
| Members and seats | Seat assignments, role changes, member management |

Access: organization settings in the dashboard → **Audit Logs** in the sidebar. Each entry has **Timestamp**, **User**, **Action**, **Details**. Pagination browses older entries; **Export CSV** downloads the entries on the current page. **Retention: the duration of the Enterprise subscription.**

### Plans

*Source: [docs.gitar.ai/account-billing/plans](https://docs.gitar.ai/account-billing/plans)*

Paid plans are **Core**, **Pro**, and **Enterprise**. Eligible new organizations get a **14-day free trial of Pro**. Vetted open-source projects use Gitar free on the Open Source plan. **Current pricing lives at <https://gitar.ai/pricing>** — the docs deliberately do not restate numbers.

PR summaries are free for unlimited public and private repos, no credit card required.

#### Feature comparison

| Feature | Core | Pro | Enterprise |
| --- | :-: | :-: | :-: |
| Users | Up to 50 | Up to 50 | Unlimited seats, including bots |
| Repos | Unlimited | Unlimited | Unlimited |
| Code reviews | Yes | Yes | Yes |
| PR summaries | Yes | Yes | Yes |
| CI failure analysis | Yes | Yes | Yes |
| Fixes via comments | Yes | Yes | Yes |
| Interactive agent | Yes | Yes | Yes |
| Developer insights | Yes | Yes | Yes |
| Auto-approve & merge blocking | — | Yes | Yes |
| Auto-apply | — | Yes | Yes |
| Advanced CI analysis | — | Yes | Yes |
| Integrations (Slack, Linear, Jira) | — | Yes | Yes |
| Custom checks & automations | — | Yes | Yes |
| Advanced insights | — | Yes | Yes |
| **Thorough review** | — | — | Included |
| Agentic Security | — | — | Included |
| Custom integrations (MCP) | — | — | Yes |
| Functional validation | — | — | Yes |
| Knowledge | — | — | Included |
| Cross-Repo Analysis | — | — | Included |
| Cross-PR Analysis | — | — | Included |
| API access | — | — | On request |
| Self-hosted GitLab | — | — | Yes |
| Bring Your Own Model | — | — | On request |
| SSO (OIDC or SAML) | — | — | Yes |
| Audit logs | — | — | Yes |
| Dedicated support / custom agreements | — | — | Yes |

#### Enterprise allowances

| Capability | Allowance |
| --- | --- |
| Review volume | Unlimited reviews per author, including allowed bot authors |
| Cross-Repo Analysis | Unlimited linked repositories, including across supported code hosts |
| Custom rules | Unlimited per organization |
| Custom MCP integrations | Unlimited connections |
| Skills | Unlimited reusable skills |

Gitar supports **unlimited changed files per PR**, with context selected for the review.

#### Usage limits (Core and Pro)

Enterprise is exempt from per-author full-review allowances and the cost-based processing budget. For Core and Pro, "full-review allowances are being measured during rollout. The existing budget policy continues to apply. Enforced allowances will be published here when available." When a full review is deferred, existing findings stay visible, the UI shows when review capacity returns, findings can still be rechecked, and **the deferred report does not issue a new approval for the unreviewed commit**.

#### Open Source plan

Everything in Pro plus unlimited seats; every contributor is covered with no seats to assign.

| Eligibility | Detail |
| --- | --- |
| License | OSI-approved; commercial open-source products generally do not qualify |
| Repos | **Public only** — private repos are never processed on this plan, even in the same org |
| Hosting | **github.com or gitlab.com only** — self-hosted GitLab, Bitbucket, Azure DevOps excluded |
| Approval | Each repository approved individually and added to the account allowlist; unlisted repos are not processed |

Apply via the Gitar for OSS form linked from <https://gitar.ai>, as an owner/admin of the repositories, providing a contact email and repo links. Comments on Open Source orgs include a short attribution line identifying free open-source access; other orgs do not show it.

**"Gitar says I don't have a seat"** appears on Core/Pro when no admin allocated a seat: an admin assigns one in Settings → Billing; during a trial seats are not enforced.

### Managing Your Subscription

*Source: [docs.gitar.ai/account-billing/managing-subscription](https://docs.gitar.ai/account-billing/managing-subscription)*

**14-day free trial with full Pro features.** Upgrading happens in the organization's billing settings (`app.gitar.ai/upgrade`).

**Seats** (Core/Pro; Enterprise unlimited): add or remove in **Settings → Billing**. Adding gives the user the plan's features; removing still lets them open PRs, but their events and commands no longer trigger seat-gated features.

**Monthly ↔ annual**

| Change | Effect |
| --- | --- |
| Monthly → Annual | Takes effect immediately; prorated charge for the remainder of the current period |
| Annual → Monthly | Takes effect at the **end** of the current annual period; cancellable any time before then |

**Canceling (Core/Pro):** **Settings → Billing → Manage Billing** opens Stripe's Billing Portal, where the cancellation is completed and confirmed. Access continues until the end of the current billing period and the subscription does not renew.

> **Warning:** disconnecting a repository does **not** cancel a subscription or stop billing.

Enterprise cancellations, or an unavailable billing portal → `support@gitar.ai`.

**Invoices** are in billing settings; billing is based on seats assigned. Past invoices: contact `support@gitar.ai`. Billing support responds **within one business day**.

| Question | Answer |
| --- | --- |
| Upgrading from trial | Choose a plan in billing settings; trial features continue uninterrupted |
| Trial ends without subscribing | Organization moves to **Free**: PR summaries and Basic Insights remain; code review (including manual review commands) requires a plan that includes it |
| Change plan later | Upgrade between Core and Pro any time; Enterprise via `support@gitar.ai` |
| Cancel | Settings → Billing → Manage Billing (Stripe portal) |
