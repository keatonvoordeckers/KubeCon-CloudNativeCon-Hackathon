### Platform Support

*Source: [docs.gitar.ai/connecting-code/platform-support](https://docs.gitar.ai/connecting-code/platform-support)*

Gitar reviews pull requests on GitHub, GitLab, Azure DevOps, and Bitbucket; AWS CodeCommit is in preview for Enterprise organizations, requested through your account manager. Code review, rules, and CI failure analysis run on every host. Merge control, fix application, and the verified badge differ.

#### Common connection procedure

Every host takes these five steps; the host sections below record only the differences.

1. **Start in Gitar, signed in:** **Settings → Configuration** (or the **Connect your repositories** onboarding step) → **Connect**; never from a marketplace listing.
2. **Authorize:** install the app (GitHub App, Bitbucket Forge app, Bitbucket Data Center plugin), complete OAuth, or paste a token with the host, group, collection, or account details.
3. **Select scope:** all or some repositories — repository (GitHub, CodeCommit), workspace (Bitbucket), group or project (GitLab), project (Azure DevOps).
4. **Confirm:** Gitar validates credential, permissions, and reachability, then registers webhooks or service hooks on the selected projects.
5. **Verify:** open a PR or push to an open PR; re-run **Configure**, **Add projects**, or **Refresh** after adding a repository, since new ones are rarely auto-discovered.

#### Feature support

Yes = supported · Partial = supported with a difference, see note · No = not available

| Feature | GitHub | GitLab | Azure DevOps | Bitbucket Cloud | Bitbucket Data Center | CodeCommit Preview |
| - | :-: | :-: | :-: | :-: | :-: | :-: |
| **Review** | | | | | | |
| Code review with inline findings | Yes | Yes | Yes | Yes | Yes | Partial¹¹ |
| Agentic Security | Yes | Yes | Yes | Yes | Yes | Partial¹¹ |
| Suggested fixes | Yes | Yes | Yes | Yes | Yes | Yes |
| One-click apply | Yes¹ | Yes¹ | No² | No² | No² | No² |
| Rules | Yes | Yes | Yes | Yes | Yes | Yes |
| PR summaries | Yes | Yes | Yes | Yes | Yes | Yes |
| Cross-repo analysis | Yes | Yes | Yes | Yes | Yes | Yes |
| **Merge control** | | | | | | |
| Block merge | Yes | Partial³ | Yes | Partial⁴ | Partial⁴ | Yes¹³ |
| Auto-approve | Yes | Yes | Yes | Yes | Yes | No |
| Auto-merge | Yes | Yes | Yes | No⁵ | Partial⁶ | No |
| Choose the merge method | Yes | No⁷ | Yes | No | No | No |
| **CI** | | | | | | |
| CI failure analysis | Yes | Yes | Yes | Yes | Partial⁸ | Yes¹² |
| Connected CI providers | Yes | Yes | Yes | Yes | Yes | Partial¹² |
| **Commits** | | | | | | |
| Signed fix commits | Yes | Yes | Yes | Yes | Yes | Yes |
| Verified badge on the commit | Yes | Yes | No⁹ | No⁹ | Yes¹⁰ | No⁹ |

1. Fix application differs per host (Code Review → Providing feedback).
2. Reply `gitar fix`; on Azure DevOps Server use the checkbox.
3. Instance must enforce merge-request approval rules.
4. Shown, not a merge gate; a person can still merge.
5. No native auto-merge to arm.
6. Gitar merges once Bitbucket's own checks pass.
7. Uses the project's own merge-method setting.
8. Build status by poll, so analysis starts later.
9. Signed, verifies locally, no platform badge.
10. Gitar registers its key on connect.
11. Threads leave **Changes** after a commit; **Activity** keeps context.
12. CodeBuild only, including CodeBuild actions in CodePipeline.
13. Native approval rule, removed on clear or `gitar unblock`.

Concourse and Woodpecker CI connections support GitHub repositories only.

#### Self-hosted and server editions

| Self-hosted deployment | Supported |
| - | - |
| GitLab self-managed, including Free | Yes |
| Azure DevOps Server | Yes |
| Bitbucket Data Center | Yes |
| GitHub Enterprise Server | No |

A self-hosted server must be reachable from Gitar and able to send webhooks out; see [Network Access](#network-access).

### GitHub

*Source: [docs.gitar.ai/connecting-code/github](https://docs.gitar.ai/connecting-code/github)*

App-based, no tokens; needs a Gitar organization admin plus rights to install a GitHub App on the organization.

- **Permissions, both sets required:** read/write code, issues, and pull requests (analyze code, create PRs and issues, push branches); read/write actions, checks, commit statuses, and workflows (Actions logs, PR comments, build fixes). Code is not stored.
- **Setup:** **Settings → Configuration** → **Connect** → organization → all or selected repositories → approve. Access later at GitHub **Settings → Installed GitHub Apps → Gitar → Configure**.
- **Trigger:** PR events from the app's webhooks; draft vs ready-for-review (not specified).
- **Limits:** [github.com](https://github.com) only, no GitHub Enterprise Server; an install binds to the Gitar organization active at redirect. Add the app to branch-protection bypass lists if pushes fail; installed while signed out, the app connects nothing in Gitar.

### GitLab

*Source: [docs.gitar.ai/connecting-code/gitlab](https://docs.gitar.ai/connecting-code/gitlab)*

A **personal access token** on a **GitLab service account** (preferred; a dedicated user is the fallback, taking a seat and breaking if that user leaves) with the `api` scope. Needs 16.0+, **Maintainer** or **Owner** on projects; Community Edition and Free lack service accounts. Gitar registers **one webhook per project**, never on the group, so later projects need connecting by hand.

- **Account:** **Settings → Service accounts** → **Add service account**, in the **top-level group**, since it can only join that group and its descendants; then **Manage access tokens** → **Add new token** → `api`. Group and project tokens are rejected.
- **Invite:** **Manage → Members** → **Invite members** → **Maintainer** or **Owner**; membership inherits downwards.
- **Connect:** one connection per host, with **GitLab Host**, **Group/Namespace Path** (full path with parents), optional **Project ID**, and the PAT; onboard via **Configure** → **Groups** → **Onboard N projects**, single repositories via **Projects** → **Add**. A second connection per host is rejected.
- **Merge blocking:** an approval rule, enforced on Premium and Ultimate only; elsewhere Gitar reports merge blocking unavailable — or fail a job on the merge-request status endpoint.
- **Self-hosted:** allow committer `noreply@gitar.ai` in **Admin Area → Push Rules** (regex `@yourcompany\.com$|^noreply@gitar\.ai$`) or your hooks; allowlist Gitar's IPs, then **Refresh** the Repositories card.

### Bitbucket

*Source: [docs.gitar.ai/connecting-code/bitbucket](https://docs.gitar.ai/connecting-code/bitbucket)*

The Gitar app runs on Atlassian's Forge platform; needs a Gitar organization (not a personal account) with the **Admin** role, workspace access, and workspace-admin rights to install a Forge app.

- **Setup:** **Settings → Configuration → Connections** → **Connect Bitbucket** → OAuth → pick the workspace (claimed ones show "Connected to another organization") → install the Forge app **on that same workspace**, since a mismatch fails silently → return to the Gitar tab yourself. Detection takes seconds to about a minute, then every repository is discovered.
- **Permissions:** read workspace; read/write repository (code, diffs, fix commits); read/write pull requests (metadata, comments); PR and repository events.
- **Trigger:** PR and repository events; drafts (not specified).
- **Limits:** one Gitar organization per workspace; no native auto-merge or merge-method choice; revoked access surfaces only after repeated token-refresh or clone failures, dropping events until reinstalled.

### Bitbucket Data Center

*Source: [docs.gitar.ai/connecting-code/bitbucket-data-center](https://docs.gitar.ai/connecting-code/bitbucket-data-center)*

Two paths: the **Gitar app** (recommended — it also registers the signing key, so commits show as Verified) or a **service-account token**, where Gitar registers a webhook per repository. Needs Data Center or Server 7.x+ reachable from Gitar (VPN, IP allowlist, or same-VPC link) and Bitbucket admin access; air-gapped instances are unsupported.

- **App:** Bitbucket 10 needs `-Dupm.plugin.upload.enabled=true` and `-Datlassian.upm.signature.check.disabled=true` in the JVM arguments (7.x and 8.x–9.x need neither); then **Administration → Manage apps → Upload app** with the URL from Gitar's **Settings → Configuration → Bitbucket → Server** dialog — Jakarta build for 10.x, standard for 7.x/8.x–9.x. Then **Generate a connect code** and paste it under Bitbucket **Administration → Gitar** (single use, 30 minutes).
- **Token:** a dedicated account with a **valid email** (merges are rejected without one, blocking auto-merge), **Write** per project, plus **Project Administrator** where Gitar registers webhooks; connect on the **Server** tab with the base URL.
- **New repositories:** **Refresh** on **Settings → Configuration → Repositories** re-scans and registers their webhooks.
- **Limits:** no outbound-only tunnel, so no fully firewalled instance; **Skip draft PRs** works only on 10.x+; service-account commits stay unverified; a base URL change means reconnect.

### Azure DevOps

*Source: [docs.gitar.ai/connecting-code/azure-devops](https://docs.gitar.ai/connecting-code/azure-devops)*

A PAT on a dedicated service account — required, since Gitar identifies its own comments by the PAT owner — with Project Administrator on the projects, which grants "Edit subscriptions" to create and delete webhooks. For self-hosted, see Azure DevOps Server.

- **Create the account:** **Organization Settings → Users → Add users**, e.g. `gitar-bot@yourcompany.com`; then add it to **Project Administrators** under **Project Settings → Permissions**, or to **Organization Settings → Permissions → Project Collection Administrators** for every project.
- **PAT scopes** (profile avatar → **Personal access tokens** → **New Token** → **Custom defined**): **Code** Read & write, **Pull Request Threads** Read & write, **Build** Read (Read & execute for CI retry), **Graph & Identity** Read, optional **Work Items** Read.
- **Connect:** **Settings → Configuration → Connections** → **Connect** → organization name (the part after `dev.azure.com/`) → PAT → projects → **Connect**.
- **Limits:** one Gitar organization per Azure DevOps organization (several Azure DevOps organizations per Gitar organization via **Add another org**); hooks are per project, so later projects need **Add projects**; token expiry is detected only after a call fails.
- **Renames self-heal** off an immutable ID; if reviews still fail, reconnect with the new name.

### Azure DevOps Server

*Source: [docs.gitar.ai/connecting-code/azure-devops-server](https://docs.gitar.ai/connecting-code/azure-devops-server)*

Same PAT model, but both network paths must be open; needs Server 2022 or 2025 and Project Administrator on the projects.

| Direction | Requirement |
| - | - |
| Gitar → Server (inbound) | Stable public HTTPS URL (e.g. `https://devops.yourcompany.com`), publicly trusted TLS certificate (self-signed unsupported), Gitar's public IPs allowed if an allowlist is enforced |
| Server → Gitar (outbound) | Egress to `https://api.gitar.ai` on port 443, directly or through an outbound proxy |

No Server setting needs to change: external webhook subscriptions are accepted by default, so opening egress is all that is required. If PR events never arrive, this path is the usual cause.

- **Setup:** dedicated account in the identity source plus Project Administrator (or **Collection Settings (or Azure DevOps Server admin) → Security → Project Collection Administrators**), then a PAT with the Azure DevOps scopes minus **Graph & Identity**, which Server does not use because the member picker is empty (add seats manually in **Settings → Billing**).
- **Connect:** **Settings → Configuration → Connections** → **Connect** → check **Connecting to Azure DevOps Server (on-premises)** → **Server URL** (host plus virtual directory, not the collection) → **Azure DevOps Collection Name** (first path segment, commonly `DefaultCollection`) → PAT → projects.
- **Comments:** 2022 and 2025 deliver them automatically; Server 2019 sends no comment events, so Gitar adds an **Ask Gitar to read my new comments** checkbox to the PR description — check it and save after each command, such as `gitar fix`, and Gitar clears it.
- **Diagnosis:** failures mean a wrong URL, an untrusted certificate, or Gitar's IPs missing from the allowlist; a 'Service Hooks permission' error is the project role, a 'Build (Read) scope' error is the PAT.

### AWS CodeCommit

*Source: [docs.gitar.ai/connecting-code/aws-codecommit](https://docs.gitar.ai/connecting-code/aws-codecommit)*

Preview, on the **Enterprise plan** — contact your enterprise account manager to enable access. One AWS account and region per installation; needs an AWS CLI with an SSO profile for the repository account and rights to create IAM roles and inline policies there.

- **Setup:** **Settings → Configuration** → **Amazon CodeCommit** → **+ Add installation** → 12-digit **AWS account ID** and **AWS region** (e.g. `us-east-1`) → **Get Setup Instructions** → select capabilities → run the script below → **I'm Done** → **Add repositories** → **Add selected** → **Validate AWS access**. It checks the account ID and creates the Gitar bot, provisioner, and EventBridge roles:
  ```bash
  bash gitar-codecommit-setup.sh <aws-profile>
  ```
- **Capabilities:** review, interactive PRs, fixes, summaries, and CI analysis — CodeBuild only, including CodeBuild actions in CodePipeline; CI analysis is selected by default during onboarding.
- **Comments and blocking:** reply `Gitar fix`; the requester, including the PR author, needs push permission Gitar validates through AWS IAM. Merge blocking adds a native approval rule, removed when the review clears or via `gitar unblock`, leaving customer rules in place.
- **Limits:** threads leave **Changes** after a fresh commit but **Activity** keeps context; **Delete installation** revokes webhook credentials and removes EventBridge resources, while customer IAM roles remain.

### Network Access

*Source: [docs.gitar.ai/connecting-code/network-access](https://docs.gitar.ai/connecting-code/network-access)*

Allowlist Gitar's addresses on any host with IP restrictions; every outbound request — validation, clones, pushes, webhook registration, API calls — leaves from them.

```text
44.208.227.28
44.221.203.128
44.213.34.15
```

Add all three, one per availability zone: Gitar spreads work across zones and fails over between them, so a partial allowlist breaks intermittently rather than cleanly. Access is IPv4 only — remove the former `2600:1f28:74:4000::/60` range if it is still listed, since it will be released. The addresses are stable Elastic IPs, production only; staging egresses from a different, non-customer-facing set.
