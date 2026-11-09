### Introduction

*Source: [docs.gitar.ai/introduction](https://docs.gitar.ai/introduction)*

Gitar is an AI code review agent that also fixes what it finds, pushing commits for broken builds, failing tests, and review feedback instead of stopping at comments.

- **Code Review** — security issues, bugs, and code-quality problems caught before merge.
- **CI Failure Analysis** — failing builds and tests detected, root-caused, and fixed on the PR.
- **Repository Rules** — automated workflows in natural language, no code required.

Start with the Quickstart (free 14-day trial, no credit card). Gitar connects to GitHub, GitLab, Bitbucket, and Azure DevOps; AWS CodeCommit is available in preview by request for Enterprise organizations. Setup is zero config, customized later with `.gitar/` rules; review comments and fix requests stay in the PR, while settings and insights live in the dashboard.

### Quickstart

*Source: [docs.gitar.ai/quickstart](https://docs.gitar.ai/quickstart)*

Connect a repository and get a first review in under 5 minutes (free 14-day trial, no credit card).

#### Prerequisites

- Repository access on a supported code host, with permission to connect it.
- An open PR, or a repository where you can create one.
- For AWS CodeCommit: an Enterprise plan with preview access.

#### Steps

1. **Sign up or sign in** at app.gitar.ai/sign-up with GitHub, GitLab, Bitbucket, or Azure DevOps.
2. **Connect a repository.** GitHub: add the Gitar GitHub App for all or selected repositories, changeable later under **Installed GitHub Apps**. GitLab: enter a personal access token from a dedicated user or service account. Bitbucket: authorize the account and install the app for the workspace. Azure DevOps: use a personal access token from a dedicated service account. Repositories appear under **Connected Repositories**; select **Next**.
3. **Optionally connect Jira or Linear** for issue context and automated issue management, then select **Go to Dashboard**; integrations can be added later from settings.
4. **Trigger a review.** Gitar scans connected repositories on install. Open a new PR, or select **Start Review** beside a PR on the "Try Gitar on Your Open PRs" dashboard card.
5. **Read the feedback.** Within minutes a dashboard comment appears (appearance varies by platform): CI failures get a root cause and, with auto-apply or on request, a fix commit; review findings become inline comments summed up in the comment; Verification lists rule and linked-issue objective results; replies in natural language request changes.

Gitar never force-pushes: every fix is a new commit, so history stays intact.

### How Gitar Works

*Source: [docs.gitar.ai/how-gitar-works](https://docs.gitar.ai/how-gitar-works)*

Gitar reviews changes in their engineering context, combining the diff with code structure and team knowledge, then investigates what needs more evidence.

#### What a review covers

| Review concern | What Gitar examines | Result |
| - | - | - |
| Code defects | Changed behavior and surrounding implementation. | Inline findings with a proposed fix. |
| Risk triage | Whole-PR impact under team risk policy. | Low, Medium, or High risk label. |
| Functional validation | Each objective in the issue the PR claims to implement. | Completion status per objective, refreshed across pushes. |
| Cross-Repo Analysis | Contracts and dependencies shared with other repositories. | Findings naming the affected repository and needed change. |
| Cross-PR Analysis | Related open PRs whose changes interact. | Findings explaining the mismatch and linking the related PR. |
| Knowledge | Team guidance and lessons from earlier reviews. | Advice grounded in codebase conventions. |
| CI Failure Analysis | Failing build and test output in the context of the change. | Root cause plus a suggested or applied fix. |

The **Review coverage** section on the PR shows outcomes for functional validation and automation; availability follows the organization's plan.

#### Review context

Structural outlines of functions and types place a change within a larger file, and Gitar reads implementations and checks callers when behavior elsewhere is in question. Context includes the diff and metadata, changed files, related files and tests, repository and organization instructions, learned conventions and reviewer feedback, linked issues, other repositories across code hosts, connected documentation such as Confluence, web documentation, and CI logs; a configuration repository shares guidance org-wide, and Skills provide procedures loaded when a rule or PR comment calls them.

Cross-Repo Analysis supports unlimited linked repositories: repository summaries identify likely connections, then Gitar reads files to verify impact, and findings name the repository and which side needs a fix. Findings land on changed lines, explain the behavior behind the issue, and can cite the source of learned guidance; the dashboard comment's Code Review section holds findings and the verdict and refreshes on later pushes.

#### Fixes and validation

Gitar applies a fix on request or automatically under auto-apply, and later CI shows whether it builds and passes checks; functional validation separately tracks the linked issue's objectives. If a Gitar fix breaks CI, automatic recovery can continue without another developer request. Access follows connected code hosts, work runs in isolated environments with repository caches, and Enterprise organizations can use their own model account (Bring Your Own Model).

### The Gitar Dashboard

*Source: [docs.gitar.ai/gitar-dashboard](https://docs.gitar.ai/gitar-dashboard)*

Gitar operates inside the PR interface: interactions, status updates, and approvals happen where the code lives. Use `gitar-skip` to skip automatic processing for a PR.

- **Dashboard comment** — posted when a PR is created and updated in realtime; the status surface and control panel, covering automatic CI failure fixing and comment detail level.
- **Code review and Verification** — Code Review collects findings and the verdict; Verification collects recorded outcomes after it; Risk Triage labels whole-PR impact. Knowledge-backed findings can carry source citations, and Functional Validation lists covered objectives under Verification.
- **CI Failure Analysis** — failing CI is analyzed automatically, root cause identified, and a fix can be pushed.
- **Interactive commands** — PR comments request fixes, ask questions, or toggle settings.

#### Troubleshooting

If Gitar doesn't respond, check that the comment starts with `Gitar` (case-insensitive), `@gitar`, or `@gitar-bot` (GitHub), or replies to one of Gitar's own comments without a prefix; only users with write access trigger responses; automatic fixes need `gitar auto-apply:on`. Persistent CI failures can take several fix rounds and further fixes depend on auto-apply or CI recovery eligibility; more detail in a comment helps, as do repository instructions about build environments and practices.

### Commands & Interactions

*Source: [docs.gitar.ai/commands](https://docs.gitar.ai/commands)*

#### Addressing Gitar

Address Gitar by starting a comment with `gitar` or `@gitar` (case-insensitive), mentioning `@gitar-bot` anywhere (GitHub), or replying to one of Gitar's comments or inline findings (no prefix). On GitLab the connected account can be mentioned, for example `@gitar-service-yourorg`; on Azure DevOps Server, follow the comment checkbox instructions when the PR description includes **Ask Gitar to read my new comments**. Commands require write access to the PR, and bot accounts are ignored unless an admin lists them under **Allowed bots** in scope settings. Gitar reacts with eyes on start and thumbs-up when a command or integration request finishes, except on Azure DevOps and both Bitbucket editions. Natural language also works: `gitar fix this` (or reply `fix` on an inline finding), `gitar please add a unit test for this`, `gitar why was this file changed?`, `gitar create a Jira ticket for this`.

#### Command reference

Commands are exact phrases (case-insensitive). Put multiple on separate lines; when two conflict, the last wins.

| Command | Syntax | What it does | Requirement / alias |
| - | - | - | - |
| Unblock | `gitar unblock` | Dismisses Gitar's blocking review so the PR can merge immediately. | Enabled by an org admin in **Settings -> Configuration -> Behavior**; hint shows only while Gitar is blocking; unavailable on Bitbucket Data Center, where review does not gate merge; trailing punctuation accepted (`gitar unblock.`, `gitar unblock!`). |
| Auto-apply on | `gitar auto-apply:on` | Enables automatic fixes for review findings and CI failures. | Lasts for the life of the PR; status shows in the dashboard comment; org and repository criteria limit which findings may be fixed. |
| Auto-apply off | `gitar auto-apply:off` | Disables automatic fixes (analysis only). | Overrides `gitar-managed`; same lifetime and status behavior. |
| Auto-merge on | `gitar auto-merge:on` | Arms auto-merge for this PR, overriding the organization setting. | This PR only, for its lifetime; merge must still meet the documented criteria. |
| Auto-merge off | `gitar auto-merge:off` | Leaves this PR for a human to merge. | This PR only, for its lifetime. |
| Display verbose | `gitar display:verbose` | Shows all rules, including non-applicable ones, with explanations. | Persists across comment updates; footer hints at the opposite command. |
| Display compact | `gitar display:compact` | Shows only relevant rules, with a count of hidden ones. | Default mode; persists across comment updates. |

On GitHub and GitLab, the `gitar-managed` label also enables auto-apply.

### Labels

*Source: [docs.gitar.ai/labels](https://docs.gitar.ai/labels)*

Labels control individual PRs; matching is case-insensitive. Comment controls are covered in Commands & Interactions.

| Label | Meaning | Who applies it |
| - | - | - |
| `gitar-managed` | Enables auto-apply on GitHub PRs and GitLab MRs, letting Gitar commit fixes for review findings and CI failures to the branch; adding it to an existing PR starts processing and can fix existing findings and failures. | A person or automation, including automation that adds it when creating a PR. |
| `gitar-skip` | Skips automatic processing — code review, CI analysis, and rule evaluation — on GitHub, GitLab, and Azure DevOps; removing it allows processing on subsequent events. | A person or automation. |
| `gitar-approved` | Marks a PR Gitar has auto-approved; Gitar creates it if needed and removes it when approval is revoked. | Gitar, when **Apply gitar-approved label** is enabled in auto-approve settings. |

#### Precedence and removal

An explicit auto-apply setting from a command or dashboard toggle takes precedence over `gitar-managed`:

| Per-PR auto-apply setting | `gitar-managed` | Behavior |
| - | - | - |
| On | Present or absent | Enabled. |
| Off | Present or absent | Disabled. |
| Not set | Present | Enabled when auto-apply is available on the plan. |
| Not set | Absent | Repository or organization default. |

Removing the label restores the configured default when no per-PR setting exists; use `gitar auto-apply:off` to stop fixes explicitly. When removing and re-adding, wait at least one second — a quick re-add can leave auto-apply off, so remove and re-add after a second or use `gitar auto-apply:on`. Repository filters and author restrictions still apply, including **Allowed bots** for bot-authored PRs, and repositories configured to process only on comment still require one. Auto-Approve and Auto-Merge are separate settings; the managed label only enables automatic fixes. While `gitar-skip` is present, explicit comment commands still work, and the skip label takes precedence over `gitar-managed`. Adding `gitar-approved` manually submits no approval and enables no auto-merge.
