# Gitar (by Sonar) — Complete Documentation Reference

> Consolidated, agent-readable reference for **Gitar**, Sonar's AI code-review agent that reviews pull requests *and pushes the fixes*. Compiled from every page of <https://docs.gitar.ai> (62 pages, full corpus pulled 2025-11-09 via the site's `llms-full.txt`).
>
> **Why this file exists:** the original docs are scattered across 62 pages with heavy cross-linking and repetition. This file keeps every operational fact — commands, labels, settings, file paths, config keys, API endpoints, CI snippets, limits — in one place, ordered so an agent can jump straight to the section it needs.

---

## Contents


**Part 1 — Start here**

- [Introduction](#introduction)
- [Quickstart](#quickstart)
- [How Gitar Works](#how-gitar-works)
- [The Gitar Dashboard](#the-gitar-dashboard)
- [Commands & Interactions](#commands--interactions)
- [Labels](#labels)

**Part 2 — Review and fix features**

- [Code Review](#code-review)
- [Auto-Apply](#auto-apply)
- [Auto-Approve](#auto-approve)
- [Auto-Merge](#auto-merge)
- [Block Merge](#block-merge)
- [Risk Triage](#risk-triage)
- [CI Failure Analysis](#ci-failure-analysis)
- [Agentic Security](#agentic-security)
- [Cross-Repo Analysis](#cross-repo-analysis)
- [Cross-PR Analysis](#cross-pr-analysis)
- [Functional Validation](#functional-validation)
- [Insights](#insights)
- [Repository Rules](#repository-rules)
- [Knowledge](#knowledge)

**Part 3 — Configuration**

- [Organization Settings](#organization-settings)
- [Repository Customization](#repository-customization)
- [Configuration Repository](#configuration-repository)
- [Signed Commits](#signed-commits)

**Part 4 — Setup: code hosts and CI**

- [Platform Support](#platform-support)
- [GitHub](#github)
- [GitLab](#gitlab)
- [Bitbucket](#bitbucket)
- [Bitbucket Data Center](#bitbucket-data-center)
- [Azure DevOps](#azure-devops)
- [Azure DevOps Server](#azure-devops-server)
- [AWS CodeCommit](#aws-codecommit)
- [Network Access](#network-access)
- [Buildkite](#buildkite)
- [CircleCI](#circleci)
- [Bitrise](#bitrise)
- [Harness](#harness)
- [Concourse](#concourse)
- [Jenkins](#jenkins)
- [TeamCity](#teamcity)
- [Woodpecker](#woodpecker)

**Part 5 — Integrations**

- [Custom Integrations (MCP)](#custom-integrations-mcp)
- [Skills](#skills)
- [Jira](#jira)
- [Linear](#linear)
- [Plane](#plane)
- [YouTrack](#youtrack)
- [Slack](#slack)

**Part 6 — Administration, security, billing, API**

- [SSO](#sso)
- [Security](#security)
- [Members & Seats](#members--seats)
- [Bring Your Own Model](#bring-your-own-model)
- [Audit Logs](#audit-logs)
- [Plans](#plans)
- [Managing Your Subscription](#managing-your-subscription)
- [API Reference Overview](#api-reference-overview)

**Part 7 — FAQ and release notes**

- [FAQ](#faq)
- [Release Notes](#release-notes)

---

## How to use this file

**If you only have 60 seconds,** read [The 60-second mental model](#the-60-second-mental-model) and the [Command cheat sheet](#command-cheat-sheet). That covers 90% of day-to-day Gitar interaction.

**If you are doing a task,** find it in the [Task router](#task-router) and follow the pointer.

**Conventions used below**

- `gitar <command>` means a PR/MR comment command, posted as its own line.
- "Org settings" = the Gitar app at `app.gitar.ai` → Settings. "Repo config" = files committed to the repository (see [Repository Customization](#repository-customization)).
- "PR" means pull request on GitHub/Bitbucket/Azure DevOps and merge request on GitLab. The docs use both interchangeably.
- Tables marked **Default** state what happens when nobody configures anything. Several automations are off by default; check before assuming behavior.
- Where the docs are silent or contradictory, the text says "(not specified)" rather than guessing.

**Source fidelity:** every section header carries a `*Source:*` link to the canonical page. Verify time-sensitive facts (prices, limits, IP ranges, plan gating) against the live page before relying on them in production.

---

## The 60-second mental model

Gitar is an **agent that operates inside the pull request**, not a dashboard you visit. Its whole surface area is:

1. **A dashboard comment.** On every new PR, Gitar posts one comment and then keeps editing it in place. It is the status board, the review report, and the control panel. Sections: Code Review, Verification, Auto-approval, and Options. Everything Gitar learns later updates that same comment — nothing is spammed as new comments.
2. **Findings.** Inline review comments attached to the changed lines they concern, each with an explanation and usually a proposed fix. Findings have severity and survive pushes — later pushes refresh the comment and *revisit earlier findings* rather than starting over.
3. **Fixes as commits.** When allowed, Gitar pushes fix commits to the PR branch itself (never to a separate branch). It never force-pushes over a human's work, and only merges when Auto-Merge is enabled and its criteria pass.
4. **Two control planes.** Persistent behavior is configured in **org settings** and **repo config files**; per-PR behavior is steered with **PR comment commands** and **labels**. Commands and labels beat org/repo defaults for that one PR.

The core loop is: *review → find → (optionally) fix → CI validates → findings and risk feed approval and merge gates.* CI is the arbiter — a fix is not "done" because Gitar said so, it is done because the build went green. If a Gitar fix *causes* CI to fail, an automatic recovery path can attempt a follow-up fix without a human asking (see [CI Failure Analysis](#ci-failure-analysis)).

#### The seven things a review checks

| Concern | What Gitar examines | What you get |
| --- | --- | --- |
| **Code defects** | Changed behavior and surrounding implementation | Inline findings with a proposed fix |
| **Risk triage** | Impact of the whole PR under team-defined risk policy | `Low` / `Medium` / `High` risk label |
| **Functional validation** | Each objective in the linked issue | Completion status per objective, refreshed on each push |
| **Cross-Repo Analysis** | Contracts and dependencies shared with other repositories | Findings naming the affected repo and what must change |
| **Cross-PR Analysis** | Related open PRs whose changes interact | Findings explaining the mismatch, linked to the other PR |
| **Knowledge** | Team guidance and lessons from earlier reviews | Review advice grounded in codebase conventions, with source citations |
| **CI Failure Analysis** | Failing build/test output in context of the change | Root-cause explanation plus a suggested or applied fix |

Feature availability is gated by the organization's plan — see [Plans](#plans).

#### What context it actually reads

PR diff and metadata · changed files plus structural outlines (functions/types, so it can place an edit inside a large file) · related files and tests, including callers outside the diff · repository and organization instruction files · learned conventions and prior reviewer feedback · linked issues · other repositories (even across different code hosts) · connected documentation and MCP tools · web documentation for dependency behavior · CI logs.

Structural context locates the code; Gitar then reads the implementation to judge the effect. That is why a one-line change to a shared helper can pull in callers and tests that are nowhere near the diff.

---

## Vocabulary

| Term | Meaning |
| --- | --- |
| **Dashboard comment** | The single PR comment Gitar creates and continuously edits. Holds review results, status, and toggles. |
| **Finding** | One inline review comment on changed lines, with severity and usually a fix. |
| **Verdict** | Gitar's overall judgement of the PR, collected in the dashboard comment's Code Review section. |
| **Verification** | The dashboard section collecting *recorded outcomes after* Code Review — including functional-validation objective status. |
| **Review coverage** | Dashboard section showing outcomes for functional validation and automation. |
| **Risk label** | `Low` / `Medium` / `High` label applied by Risk Triage to express whole-PR impact. |
| **Auto-apply** | Permission for Gitar to commit fixes for review findings and CI failures. |
| **Auto-approve** | Gitar submits a formal approval once a review is clean and criteria are met. |
| **Auto-merge** | Gitar merges the PR after its own approval, when criteria and platform checks allow. |
| **Block merge** | Gitar's review gates the merge until findings are resolved (or `gitar unblock` is used). |
| **Rule** | Natural-language automation committed to the repo; evaluated during review. |
| **Knowledge** | Indexed team guidance, docs, and prior-review lessons that ground review advice. |
| **Skill** | A reusable procedure committed to the repo that a rule or PR comment can invoke. |
| **Config repository** | A single repository whose Gitar config every repo in the org inherits. |
| **BYOM** | Bring Your Own Model — serve Gitar's LLM calls from your own Anthropic/AWS Bedrock account or gateway. |

---

## Task router

| If you want to… | Read |
| --- | --- |
| Install Gitar and see it work on one PR | [Quickstart](#quickstart) |
| Understand what a review covers and how fixes are validated | [How Gitar Works](#how-gitar-works) |
| Read or drive the PR dashboard comment | [The Gitar Dashboard](#the-gitar-dashboard) |
| Issue a command or ask Gitar a question in a PR | [Commands & Interactions](#commands--interactions) |
| Skip Gitar on one PR, or enable fixes via label | [Labels](#labels) |
| Turn on automatic fixes for findings | [Auto-Apply](#auto-apply) |
| Auto-approve clean PRs | [Auto-Approve](#auto-approve) |
| Auto-merge after approval | [Auto-Merge](#auto-merge) |
| Make Gitar's review gate the merge | [Block Merge](#block-merge) |
| Get risk labels on PRs | [Risk Triage](#risk-triage) |
| Fix failing CI automatically | [CI Failure Analysis](#ci-failure-analysis) |
| Check a PR against its linked issue | [Functional Validation](#functional-validation) |
| Catch breakage in other repos / other open PRs | [Cross-Repo Analysis](#cross-repo-analysis) · [Cross-PR Analysis](#cross-pr-analysis) |
| Write repo-specific review instructions | [Repository Customization](#repository-customization) |
| Share config across every repo in the org | [Configuration Repository](#configuration-repository) |
| Author custom rules in natural language | [Repository Rules](#repository-rules) |
| Teach Gitar your conventions and internal docs | [Knowledge](#knowledge) |
| Review changes to agent instructions / AI config | [Agentic Security](#agentic-security) |
| Connect GitHub / GitLab / Bitbucket / Azure DevOps | [Platform Support](#platform-support) then the host page |
| Connect a CI provider for log-level failure analysis | [Buildkite](#buildkite) · [CircleCI](#circleci) · [Jenkins](#jenkins) · … |
| Connect Jira / Linear / Slack / custom MCP tools | [Custom Integrations (MCP)](#custom-integrations-mcp) · [Jira](#jira) · [Slack](#slack) |
| Call the Gitar API | [API Reference Overview](#api-reference-overview) |
| Set up SSO, roles, audit logs, BYOM, security review | [SSO](#sso) · [Members & Seats](#members--seats) · [Audit Logs](#audit-logs) · [Security](#security) |
| Check pricing, seats, trial | [Plans](#plans) · [Managing Your Subscription](#managing-your-subscription) |
| Verify a commit Gitar pushed | [Signed Commits](#signed-commits) |
| Fix "Gitar isn't responding" | [FAQ](#faq) · [The Gitar Dashboard](#the-gitar-dashboard) |

---

## Command cheat sheet

Post as a PR comment. Commands are **exact phrases**, matched case-insensitively, one per line; conflicting commands resolve **last one wins**.

| Command | Effect |
| --- | --- |
| `gitar unblock` | Dismiss a blocking review so the PR can merge now. Must be enabled by an org admin; unavailable on Bitbucket Data Center. Trailing punctuation OK (`gitar unblock!`). |
| `gitar auto-apply:on` | Commit fixes for findings and CI failures on this PR. |
| `gitar auto-apply:off` | Analysis only, no automatic commits. |
| `gitar auto-merge:on` | Arm auto-merge for this PR. |
| `gitar auto-merge:off` | Leave merging to a human on this PR. |
| `gitar display:verbose` | Show all rules, including non-applicable ones with reasons. |
| `gitar display:compact` | Show only applicable rules (default). |

**Addressing Gitar** — any of these work: a comment starting with `gitar` or `@gitar` (case-insensitive); `@gitar-bot` mentioned anywhere (GitHub); a direct reply to one of Gitar's comments or inline findings (**no prefix needed**); on GitLab, mentioning the connected account (e.g. `@gitar-service-yourorg`).

**Requirements:** write access to the PR; bot accounts are ignored unless an admin lists them under **Allowed bots** in [scope settings](#scope). Gitar reacts 👀 when it starts and 👍 when done — except on Azure DevOps and both Bitbucket editions, which show no reactions.

**Natural language also works:** `gitar fix this`, `fix` (as a reply to a finding), `gitar please add a unit test for this`, `gitar why was this file changed?`, `gitar create a Jira ticket for this`.

**Azure DevOps Server** requires the comment-checkbox step if the PR description says *Ask Gitar to read my new comments* — see [Azure DevOps Server](#azure-devops-server).

---

## Label cheat sheet

| Label | Added by | Effect |
| --- | --- | --- |
| `gitar-managed` | A person or automation | Enables auto-apply (fixes) on GitHub and GitLab. Case-insensitive. |
| `gitar-skip` | A person or automation | Skips all automatic processing — review, CI analysis, rule evaluation — on GitHub, GitLab, Azure DevOps. |
| `gitar-approved` | Gitar | Marks a PR Gitar auto-approved. Safe to filter on; adding it by hand approves nothing. |

Precedence: an explicit per-PR command or dashboard toggle **beats** `gitar-managed`. `gitar-skip` beats `gitar-managed` for automatic processing, but explicit comment commands still work while `gitar-skip` is present. Full matrix in [Labels](#labels).

---

## Control-plane hierarchy

Behavior resolves from most specific to most general:

1. **Per-PR commands and labels** — this PR only, and for its whole lifetime. `gitar auto-apply:on/off`, `gitar auto-merge:on/off`, `gitar-managed`, `gitar-skip`, `gitar display:*`.
2. **Repository config files** — instructions, review rules, and the `.gitar` directory committed to the repo. See [Repository Customization](#repository-customization).
3. **Configuration repository** — org-wide defaults every repo inherits, overridable per repo. See [Configuration Repository](#configuration-repository).
4. **Organization settings** — the org-wide switches and scope filters in the app. See [Organization Settings](#organization-settings).

Scope filters at the org level (included/excluded repos, author restrictions, allowed bots) apply on top of all of the above — a label or command cannot pull a PR into scope that the org has excluded.

---

## Assumptions to check before you rely on this

- **Automations are not all on by default.** Auto-apply, auto-approve, auto-merge, and block-merge each have their own enablement path and defaults; confirm the default in each feature page rather than assuming.
- **Fixing requires permission and plan.** Auto-apply must be enabled *and* the plan must include it; several features are plan-gated.
- **Not every host supports every feature.** Review the support matrix in [Platform Support](#platform-support) — notably, Bitbucket Data Center reviews do not gate merges, and some label/command features are GitHub/GitLab-only.
- **CI depth varies by integration.** Basic review works without a CI connection; log-level failure analysis and automatic CI fixes are better (sometimes only possible) with a connected CI provider.
- **The docs change.** Prices, IP ranges, and plan limits in particular.

---


## Part 1 — Start here

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


## Part 2 — Review and fix features

### Code Review

*Source: [docs.gitar.ai/features/code-review](https://docs.gitar.ai/features/code-review)*

Gitar reviews a PR against the surrounding code and the team's engineering context, using AST-informed structure to read related files and search callers. Findings land on the changed lines with an explanation and a suggested fix.

#### What Gitar reviews for

| Category | Covers |
| - | - |
| Security | Vulnerabilities, unsafe patterns, input validation |
| Bug | Logic errors, null pointer risks, edge cases |
| Performance | Algorithm complexity, database queries, memory usage |
| Edge Case | Boundary conditions and uncovered inputs |
| Code Quality | Readability, maintainability, best practices |
| Cross-Repo | Impacts on other repositories; only when Cross-Repo Analysis is on |
| Cross-PR | Logic mismatches with related open PRs; only when Cross-PR Analysis is on |

Severity is **Critical**, **Important**, or **Minor**; blocking thresholds call the lowest bucket "suggestions", meaning minor findings. Optional layers add Agentic Security, Knowledge (conventions with citations), Cross-Repo and Cross-PR Analysis, Functional Validation, and Risk Triage.

#### Triggers and incremental review

- A review runs on PR creation and on each push to an open PR.
- A PR with only a single revert commit is skipped, even if the original change was never reviewed; pushing any commit beyond the revert makes it reviewable again. CI analysis and rule evaluation still run.
- No changed-file limit: Gitar prioritizes relevant code, condenses repetitive changes, and may exclude generated or low-value files. Enterprise allows unlimited review volume per author, including allowed bot authors.

#### How findings are reported

- **Inline comments**: one per unresolved finding, on the exact file and line.
- **Dashboard comment, Code Review section**: overall verdict, severity breakdown, and resolved-finding tracking. It is the PR's single source of truth (code review, CI analysis, and rule evaluations together), is **updated in place** on new pushes instead of reposted, and collapses resolved findings so open ones stay on top.
- Finding anatomy: category, severity, one-line description, details linking to the file and line, and citations to the instruction or earlier conversation behind learned guidance.
- Feedback persists across iterations, so Gitar does not re-report dismissed issues. Findings on code deleted or rewritten between iterations are resolved automatically.

#### Replying to findings

| Reply or action | Effect |
| - | - |
| Explanation | Confirmed fix resolves it; invalid finding is dismissed; leaving it unfixed closes it without counting as fixed |
| `gitar fix` | Applies the suggested fix; each inline finding has a "Reply `gitar fix` to apply this suggestion" footer |
| One-click apply | GitHub: check the box. GitLab: checkmark emoji. Multiple fixes are numbered |
| Resolve thread (GitHub) | Closes without marking fixed or invalid; unresolving reopens |
| Thumbs-down (GitLab) | Dismisses the finding |

GitLab inline replies need no `gitar` prefix. An unclear reply gets a follow-up question. Acknowledging a finding keeps it open and still counts toward merge blocking; a failed accepted fix shows **Fix could not be applied** and does not retry. With Knowledge enabled, replies can teach conventions for future PRs. **Verification** adds recorded outcomes such as `Objectives 5/7` and `Rules 3/4 met`, reporting assessments against code, not runtime tests.

#### Settings

| Setting | What it does | Default | Where configured |
| - | - | - | - |
| Review depth | **Focused** (higher-impact) or **Thorough** (adds smaller verified issues); overrides inherit, and resetting restores inheritance | (not specified) | **Settings -> Configuration -> Review depth**; per repo via **Customize** |
| `.gitar/review/*.md` | Project rules and gotchas; `@` includes share text | None committed | Config repo |
| Block merges | Severity threshold for a blocking review | Important or higher | **Settings -> Configuration -> Behavior** |
| Auto-approve PRs based on code review | Approves after a clean review | Off; admin enables the toggle | Behavior card |
| Auto-merge PRs | Arms native auto-merge after approval | Off; requires auto-approve | Behavior card |

### Auto-Apply

*Source: [docs.gitar.ai/features/code-review/auto-apply](https://docs.gitar.ai/features/code-review/auto-apply)*

Auto-apply commits fixes for review findings and CI failures to a PR's branch. It is opt-in per PR: `gitar auto-apply:on` or the `gitar-managed` label — saving criteria does not turn it on for any PR.

Organization criteria (**Settings -> Configuration -> Auto-apply review criteria**) take effect on each PR's next run and filter by severity, issue type, affected code, or PR risk ("Only fix minor findings on low-risk PRs"). The fixer cannot run shell commands or tests, so criteria requiring passing tests are never met, and an unavailable risk assessment does not meet a risk-dependent condition. Per-repo criteria in `.gitar/config/apply.md` extend the organization's and a fix must satisfy both; the file is read from the default branch, so a PR cannot authorize its own fixes.

```bash
mkdir -p .gitar/config
echo "Skip findings in database migrations." > .gitar/config/apply.md
```

Criteria select code review fixes only: CI fixes, CI recovery, rule actions, and explicit `gitar fix` requests ignore them, and auto-approve and auto-merge have separate criteria. Each run fixes up to eight findings, checks each patch before committing and again before pushing, and drops a rejected patch without losing earlier accepted fixes while leaving its finding open. **Options** in the dashboard comment shows `Auto-apply: 1 / 3 findings fixed` with reasons for skips.

| Setting | What it does | Default | Where configured |
| - | - | - | - |
| Auto-apply for a PR | Allows fixes on that PR | Off | PR comment `gitar auto-apply:on` or `gitar-managed` label |
| Organization review criteria | Limits which findings may be fixed org-wide | (not specified; criteria only restrict) | Auto-apply review criteria card |
| `.gitar/config/apply.md` | Adds repo criteria; both sets must be satisfied | None committed | Config repo, default branch |

### Auto-Approve

*Source: [docs.gitar.ai/features/code-review/auto-approve](https://docs.gitar.ai/features/code-review/auto-approve)*

Auto-approve submits an approving review on your behalf after a clean code review: Important or critical findings withhold approval (as does a merge blocking threshold that includes unresolved suggestions), criteria are then checked against the whole PR, and Gitar submits the approval with its rationale in the dashboard comment.

Enable it under **Settings -> Configuration -> Behavior** with **Auto-approve PRs based on code review**, then optionally enter criteria such as "Only approve if the changes are limited to documentation or test files."

Criteria use PR metadata, changed files, and review results, not CI status — "tests pass" is never verified, so enforce it with branch protection — and cannot call integration tools: naming a Jira, Slack, or custom MCP tool does not make its result a condition, nor are earlier integration results passed in.

- **Risk**: criteria may require low or medium risk; low risk never bypasses blocking findings, and an unavailable assessment does not satisfy a risk-dependent condition unless the criteria allow it.
- **Code owners (GitHub)**: criteria may require a `CODEOWNERS` owner approval on the current head, read from the target branch and matched to the current commit; team ownership needs the GitHub App's **Members: read** permission. Unreadable evidence withholds approval, as do other hosts, which do not support these criteria.
- A review history too large to evaluate completely withholds criteria-based approval and auto-merge for that run.

**Default behavior**: with the toggle on and no criteria in organization settings, configuration repositories, or `.gitar/config/approve.md`, Gitar approves PRs with no blocking findings; minor suggestions may remain unless the blocking threshold includes them. Approval can also apply the **`gitar-approved` label** and chain **Auto-merge PRs**.

Repo criteria live in `.gitar/config/approve.md`, read from the default branch so a PR cannot change its own policy; if unverifiable, approval is withheld. Org and repo criteria combine — the PR must satisfy all — and org criteria include shared policy from configuration repositories.

```bash
mkdir -p .gitar/config
echo "Only approve if no database migrations are included." > .gitar/config/approve.md
```

**Revocation**: each review re-checks criteria, and resolving threads on GitHub can re-trigger evaluation (dashboard shows **Re-evaluating**). A push with blocking findings revokes the approval on every host, attempts to cancel auto-merge it armed, and drops the label. Settings changes require a fresh review before a pending approval is sent; a failed evaluation skips approval for that run.

| Setting | What it does | Default | Where configured |
| - | - | - | - |
| Auto-approve PRs based on code review | Approves after a clean review | Off; admin enables the toggle | **Settings -> Configuration -> Behavior** |
| Approval criteria | Natural-language approval conditions | Empty (approve when no blocking findings) | Behavior section |
| Apply `gitar-approved` label | Marks approved PRs | Off | Auto-approve settings |
| Auto-merge PRs | Chains auto-merge after approval | Off; requires auto-approve | Auto-approve settings |
| `.gitar/config/approve.md` | Repo approval criteria | None committed | Config repo, default branch |

### Auto-Merge

*Source: [docs.gitar.ai/features/code-review/auto-merge](https://docs.gitar.ai/features/code-review/auto-merge)*

Auto-merge arms your platform's native auto-merge, not a custom queue, right after Gitar approves, so the PR merges once CI and required approvals are satisfied — immediately if everything already passes. It requires Auto-Approve, only arms PRs Gitar approved, and not every host has native auto-merge.

Enable it under **Settings -> Configuration -> Behavior** after auto-approve, then choose the merge method on GitHub or Azure DevOps: **Merge commit**, **Squash**, or **Rebase**. A settings change after a review needs a fresh review before arming. GitHub also needs **Allow auto-merge** in repository **Settings -> General**, or the PR is approved but not armed; GitLab needs nothing, and a new push cancels armed auto-merge which Gitar re-arms if its next review approves.

**Criteria** are plain language under **Behavior -> Auto-merge criteria**, evaluated against PR metadata, changed files, and diff size independently of auto-approve criteria, so an approved PR can stay unarmed; by default every auto-approved PR is armed. Criteria cannot reference CI status ("tests are green" counts as satisfied), can use the risk assessment ("Merge only low-risk changes"; a clean review does not establish low risk), and on GitHub can use code owner and human approval evidence, with missing evidence preventing arming.

```markdown
Only arm auto-merge for changes under packages/ui.
Never arm auto-merge on a PR that touches a migration.
```

Commit this as `.gitar/config/merge.md`; repo criteria are **added** to the organization's and all must pass, read from the default branch so a PR cannot change its own outcome. **Require `.gitar/config/merge.md`** makes arming opt-in per repository — elsewhere the approval lands and the merge is left to you — and an unreadable file holds auto-merge for that run while the approval stands.

**Per PR**: `gitar auto-merge:on` arms regardless of criteria and `gitar auto-merge:off` disables it; Gitar must still approve and platform requirements still apply. **Failures** are explained in the dashboard comment while the PR stays approved (enable "Allow auto-merge", grant merge permission, or mark the PR ready and resolve open threads). A push with blocking findings revokes approval and Gitar attempts to cancel auto-merge it enabled, leaving another user's or integration's auto-merge unchanged.

| Setting | What it does | Default | Where configured |
| - | - | - | - |
| Auto-merge PRs | Arms native auto-merge after approval | Off; requires auto-approve | **Settings -> Configuration -> Behavior** |
| Merge method | Merge commit, squash, or rebase | (not specified) | Behavior section (GitHub, Azure DevOps) |
| Auto-merge criteria | Narrows which approved PRs are armed | Empty (all auto-approved PRs armed) | Behavior section |
| Require `.gitar/config/merge.md` | Makes arming opt-in per repository | Off | Behavior section |
| Per-PR override | Forces arming on or off for one PR | (not specified) | PR comment `gitar auto-merge:on` / `:off` |

### Block Merge

*Source: [docs.gitar.ai/features/code-review/block-merge](https://docs.gitar.ai/features/code-review/block-merge)*

Block Merge prevents merging when the review verdict meets a severity threshold, using the host's native review mechanism so existing branch protection applies. Gitar submits a blocking review at or above the threshold, re-evaluates as findings resolve, and dismisses its review once the verdict drops below it. Set the threshold in **Settings -> Configuration -> Behavior -> Block merges**; **Customize** on a repository row sets a different level.

| Level | Blocks when the review finds |
| - | - |
| **Never** | Nothing; Block Merge is off |
| **Critical issues only** | Critical findings |
| **Important or higher** | Important or critical findings. This is the default level |
| **Suggestions or higher** | Any finding, including suggestions |

Enforcement differs by host. GitHub records a "request changes" review that blocks where branch protection requires approvals or no outstanding change requests, and an admin who dismisses it manually is respected, with no re-block that review cycle. GitLab adds an MR approval rule named **Gitar**, a reviewer, and a blocked comment — but only where approval rules are enforced; otherwise no rule or comment is added. Azure DevOps treats Gitar's reject vote as a hard block; Bitbucket Cloud and Data Center record the review without gating the merge; AWS CodeCommit (preview) adds a native approval rule that holds until findings clear or an authorized user runs `gitar unblock`.

To override, comment `gitar unblock` to dismiss the blocking review — an admin enables it with **Enable the `gitar unblock` command**, which appears once **Block merges** is not **Never** — or dismiss the review in the host's UI.

| Setting | What it does | Default | Where configured |
| - | - | - | - |
| Block merges | Lowest severity that holds a PR | Important or higher | **Settings -> Configuration -> Behavior** |
| Per-repo level | Overrides the threshold for one repository | Inherits organization level | **Customize** on the repository row |
| Enable the `gitar unblock` command | Lets any member dismiss the block by comment | Off; appears when Block merges is not **Never** | Behavior card |

### Risk Triage

*Source: [docs.gitar.ai/features/code-review/risk-triage](https://docs.gitar.ai/features/code-review/risk-triage)*

Gitar classifies each PR as Low, Medium, or High risk so reviewers know where to focus. Risk describes the whole change's potential impact, separate from individual finding severity and from the review verdict; a PR with no reported defects can still be high risk.

| Level | Default meaning | Example |
| - | - | - |
| Low | Narrow changes with little behavior or interface impact | Documentation correction |
| Medium | Bounded behavior changes, substantial internal changes, or uncertain impact | Localized bug fix outside sensitive behavior |
| High | Sensitive behavior or broad impact | Authorization changes, payment calculations, schema migrations |

The label appears in the expanded **Code Review** section of the dashboard comment, and the Gitar dashboard shows risk on recent activity rows and as an Overview breakdown; the previous label hides while a review processes, and older reviews gain an assessment when another review runs.

Assessment uses the whole PR diff and file-change data, so a small follow-up push does not hide earlier risk: Gitar applies its defaults plus the organization's risk instructions, repository guidance can raise but never lower that level, and risk is refreshed before approval or merge criteria are evaluated, including after a Gitar fix. Uncertain impact yields Medium; a failed assessment yields High, so it cannot satisfy a low-risk condition.

Admins set policy under **Settings -> Configuration -> Custom Instructions**: **Risk classification** turns assessment on or off (on by default) and **Risk instructions** redefine the levels (empty by default).

```text
Changes to payment calculations or authorization decisions are high risk.
Documentation-only changes are low risk.
```

```markdown
Changes to the settlement schedule are high risk.
Changes to exported client interfaces require at least medium risk.
```

`.gitar/config/risk.md` adds repo guidance; Gitar considers both the default-branch policy and additions in the PR, so deleting or emptying the PR's copy does not remove the policy. Policy changes apply when a review runs and do not reclassify historical PRs. Risk can restrict automation but never approves or merges on its own: auto-approve could require "Approve only low- or medium-risk changes" and auto-merge "Merge only low-risk changes", with blocking findings and platform checks still applying.

| Setting | What it does | Default | Where configured |
| - | - | - | - |
| Risk classification | Turns whole-PR risk assessment on or off | On | **Settings -> Configuration -> Custom Instructions** |
| Risk instructions | Redefines what each level means | Empty (Gitar defaults) | Custom Instructions |
| `.gitar/config/risk.md` | Repo guidance that can only raise risk | None committed | Config repo; default branch plus PR additions |

### CI Failure Analysis
*Source: [docs.gitar.ai/features/ci-failure-analysis](https://docs.gitar.ai/features/ci-failure-analysis)*

Monitors CI, analyzes failures on every PR, posts root causes in the Gitar dashboard comment, and can push fixes.

#### Prerequisites: CI connections

| Platform | Setup |
| - | - |
| GitHub Actions, GitLab Pipelines, Bitbucket Pipelines, Azure DevOps Pipelines | None; uses the code host credential |
| AWS CodeCommit (preview) | CodeBuild and CodePipeline analysis when CI access is granted at setup |
| Jenkins, CircleCI, Concourse, Woodpecker, Buildkite, TeamCity, Harness, Bitrise | Gitar's own credential, to follow the PR status check and fetch the log |

- Unconnected platforms still report builds as status checks, but Gitar cannot fetch the log, so no analysis fires.
- Azure DevOps Cloud/Server PAT: **Build (Read)** for analysis; retries need **Build (Read & execute)**.

#### Trigger and scope

- Any CI failure on a PR; analysis fires automatically, with no per-PR opt-in documented.
- Full pipeline output is read, so multiple jobs and steps are diagnosed in one run; identical failures across jobs are deduplicated; events for outdated commits are ignored after a newer push.
- Classes: build (compile, imports, types), test (assertions, setup, expected values), lint (style, formatting, static analysis), flaky (race conditions, timing, non-determinism).

#### Fix flow

1. Read logs, identify the failing step, determine root cause.
2. Post the explanation (files and lines) into the existing dashboard comment, not a new comment or check.
3. Fix per auto-apply: wait for approval, or push a fix commit to the branch.

| Option | How |
| - | - |
| Auto-fix | `gitar auto-apply:on`; pushes a commit for failures confirmed as caused by the PR |
| Fix it yourself | Use the analysis, push your own commit; analysis refreshes on new commits |
| Targeted fix | PR comment `Gitar <specific instruction>` |
| Explicit request | PR comment `Gitar fix CI` |

Auto-apply fixes only PR-caused failures; unrelated or uncertain causes are skipped and must be requested manually.

```text
gitar auto-apply:on
gitar auto-apply:off
Gitar fix CI
Gitar <specific instruction>
```

#### Retry for unrelated failures

- Setting: **Retry unrelated CI failures** under **Settings → Configuration → Behavior**, independent of auto-apply. Related or uncertain findings never retry.
- Supported: GitHub Actions, GitLab, Bitbucket, Azure DevOps Pipelines, CircleCI (reruns the whole workflow). The same failed run is not retried repeatedly.
- Bitbucket: a retry creates a new pipeline, which Gitar does not automatically retry again.
- CodeCommit preview: retries standalone CodeBuild builds; a CodePipeline stage retries only when every failed action is unrelated.
- All other connected CI platforms get analysis but no retry.

#### Recovery after a Gitar fix breaks CI

With auto-apply **off**, follow-up repair needs both: the latest failure is related to the PR, and there are one or two consecutive Gitar commits after a commit whose CI passed. Distinct from flaky-job retry.

#### Iteration and stop conditions

Fix → CI reruns → on failure (same issue or one the fix introduced) Gitar re-analyzes → another fix using the history of prior attempts. Recovery stops after **three consecutive Gitar commits**; further automatic fixes then need auto-apply eligibility or an explicit request:

```text
Gitar fix CI
```

A comment starting with `Gitar` may add constraints (environment, a timeout that must not change). Paste only relevant log excerpts with secrets and credentials removed. Pushing your own correction also works.

### Agentic Security
*Source: [docs.gitar.ai/features/agentic-security](https://docs.gitar.ai/features/agentic-security)*

Reviews changes to agent instructions and the scripts they call for harmful behavior, inside the normal code review. Included with **Enterprise**.

- Scope: `SKILL.md`, `AGENTS.md`, `CLAUDE.md`, and equivalent agent configuration, plus referenced local paths and helper scripts. Gitar checks the link between a changed helper and the instructions that invoke it, since a helper can alter behavior while the instruction file stays the same; comparing versions exposes dropped sign-off steps even when the publishing command is unchanged.
- Content is inspected, never executed, and each issue is validated before a finding posts.

| Changed behavior | What Gitar looks for |
| - | - |
| Uploading credentials or private source | Disclosure to an unauthorized destination |
| Running commands via instruction or helper | Concealed execution outside the legitimate task |
| Changing approval or access checks | Actions bypassing required authorization |
| Directing how an agent reports its review | Instructions hiding issues or manipulating results |

Ordinary authentication and authorized deployment are legitimate; quoted attack examples or destructive commands need evidence of harmful intent outside their authorized purpose.

#### Reporting and limits

- Findings are security findings in the standard review, naming the changed location and the path from instruction to harmful action; the usual feedback and resolution flow applies, and later reviews resolve corrected behavior.
- Only changed instructions and their local references are followed; unchanged instructions are not audited repo-wide. An unavailable reference limits the conclusions supported.
- **Dashboard → Agentic Security** shows critical and important findings across the organization, open across all PR states, critical first, with repository/date filters, a **Fixed** view, **Evidence and suggested fix**, and a Critical/Important filter. Lower-severity findings stay in Review findings.
- Included with Enterprise; whether it can be disabled per repository is (not specified).

### Cross-Repo Analysis
*Source: [docs.gitar.ai/features/cross-repo-analysis](https://docs.gitar.ai/features/cross-repo-analysis)*

Checks a PR against other repositories in the organization and reports what breaks there. **Enterprise**.

- No linking, enrollment, or backfill: every relevant repository is scanned on every review, narrowed to those the change can reach.
- Relations go beyond imports: routes, wire fields, event names, enum values, error codes, tables and columns, shared CI actions/workflows/base images. Cross-code-host pairs work (GitHub service vs GitLab client).
- Connections found in dependency declarations (manifests) surface before any problem is found; they show as **Declared in manifest** and have no finding until an impact is recorded.
- A repository summary is built at its first review and refreshed as it changes, so coverage grows over time — a review opened the day the feature is enabled may not reach everything.

| The change | Impact reported |
| - | - |
| Route, wire field, enum value, or error code | The client still calling it or branching on the removed value, named by repository, file, function |
| Shared CI action, workflow, or base image | Repositories whose builds fail on their next version bump |
| Code compiling against another repo's symbol | That the symbol is not on that repo's default branch, only in an unmerged PR or unpinned branch |
| One side of a feature | The missing counterpart (UI key without handler, event without subscriber) |
| Table, column, or file layout | The downstream job, warehouse model, or migration that must move with it |
| Published contract under a patch bump | Callers auto-upgrading into the break; needs a major tag or deprecation window |

Findings carry a **Cross-Repo** label, post inline, anchor on the line that changed the contract, and name the affected repository, file, and function plus which end to fix (this PR, a follow-up elsewhere, or both).

#### Opt-in, scoping, configuration

- Organization toggle: **Dashboard → Cross-repo**. Members view; only admins change it. Disabling stops future processing and keeps history.
- Visibility: a PR matches only repositories its readers could see. Private repositories match every repository in the organization; a public PR matches only public repositories plus itself and never names a private repository.
- Filters: repository, status, fix location. **Linked Repositories** lists connected repositories, including those without findings, and their neighbors in either direction.
- Override discovery with `.gitar/cross-repo.md` in natural language:

```markdown
`my-org/frontend` and `my-org/mobile` call the API this repository publishes.
`my-org/data-jobs` reads the tables this repository owns.
Ignore `my-org/frontend-archive`.
```

Place it in the configuration repository for organization-wide rules or in one repository to scope it there; when both exist, organization rules load first and the repository file adds to them. Supported languages and ecosystems are (not specified).

### Cross-PR Analysis
*Source: [docs.gitar.ai/features/cross-pr-analysis](https://docs.gitar.ai/features/cross-pr-analysis)*

Compares a PR with related open PRs to catch changes that break behavior another change depends on. **Enterprise**.

| One PR changes | Another PR depends on |
| - | - |
| An API field or response format | A caller reading the previous format |
| An event name or payload | A handler expecting the previous event |
| A shared function's behavior | A new caller relying on its earlier behavior |
| A database column or its meaning | A query or job using the previous schema |

- Two PRs can affect the same logic without touching the same lines, so a clean merge can still mismatch behavior.
- Flow: during a review Gitar finds interacting open PRs (same repository or another connected repository), compares the code to establish the mismatch and when it matters, then reports inline with a **cross-pr** label, a link to the related PR, and suggestions for either side.

#### Opt-in, dashboard, limits

- **Dashboard → Cross-PR** lists recorded findings for members and admins; admins toggle the feature there. Disabling stops future processing and keeps recorded findings readable.
- Metrics: open findings, PRs involved (distinct PRs on either side, in scope), resolved findings; scoped by repository and date range, with status filters and text search. Detail view offers **Code evidence and revisions** and per-side suggestions.
- GitLab labels the dashboard **Cross-MR** and links merge requests.
- Scope is open PRs in connected repositories. Findings reflect the revisions compared at the recorded time, are not a merge verdict, and do not refresh when the related PR changes. No new finding is published if the related PR closed, merged, or changed since the comparison.
- A per-repository config or exclusion file is (not specified).

### Functional Validation
*Source: [docs.gitar.ai/features/functional-validation](https://docs.gitar.ai/features/functional-validation)*

Reads issues a PR claims to close, derives objectives, and judges each against the diff under Verification in the dashboard comment. **Enterprise**.

| Issue source | Referenced as | Needs |
| - | - | - |
| Jira | `PROJ-123` | Jira connected |
| Linear | `ENG-45` | Linear connected |
| Plane | `ENG-45` | Plane connected |
| YouTrack | `SP-7` | YouTrack connected |
| GitHub / GitLab issues | `#123` | nothing |
| Azure DevOps work items | linked to the PR, or `AB#123` | nothing |
| Bitbucket Cloud issues | `#123` | repo issue tracker enabled |

- Bitbucket Data Center has no tracker; link a Jira issue instead.
- Tracker keys share one shape, so connect one tracker per organization; with several connected, resolution order is Jira, Linear, Plane, then YouTrack.
- Opt-in: organization admins toggle **Validate PRs against linked issues** under **Settings → Configuration → Behavior**. No per-repository or per-PR switch is documented (not specified).

#### Trigger and linking

- Runs with each review and re-runs on every push; editing the issue reconciles the objective list.
- Keys are read from the PR title, description, and branch name; a passing mention is ignored, the PR must claim the issue. `#123` means the PR's own repository; `other/repo#123` is not linked.
- Azure DevOps work items attached to the PR are picked up directly. Jira parent issues clarify requirements but do not add objectives. Public repositories use only same-repository issues; external tracker content is excluded.
- Output: one block per linked issue, least complete first, e.g. **3 covered / 5 objectives**. Uncovered objectives appear under **Other objectives on this issue, possibly covered elsewhere**. Verification opens while any objective is uncovered and collapses once outcomes settle; up to five objective names show and `gitar display:verbose` adds the rest. Non-collapsible platforms render headings and lists.
- Does not block merging, is not Code Review approval or executed runtime testing; Risk Triage assesses whole-change impact separately.

#### Limits

- Maximum **5 linked issues** per PR; extra keys are ignored.
- Issues are read but never written; objectives and counts live only in the PR comment.
- Objectives are per PR: two PRs on one issue track separate sets, with no combined per-issue view.
- Adding a requirement shows as not covered; removing one drops the total instead of raising completion, so cutting scope never reads as done.

### Insights
*Source: [docs.gitar.ai/features/insights](https://docs.gitar.ai/features/insights)*

Organization reporting on review activity, CI failure patterns, rule compliance, and finding resolution at [app.gitar.ai](https://app.gitar.ai). Basic Insights covers the activity overview; the Reviews dashboard and its breakdowns depend on enabled features and plan.

- **Activity**: PRs reviewed, findings surfaced, CI failures caught, user requests handled over a chosen period, plus a trend chart and PRs by Type (features, fixes, chores, refactors, other). **Code review volume** counts recorded reviews, so repeat reviews count separately from PRs reviewed.
- **User Requests Handled** breaks down by category, then by request with PR links; it includes finding feedback and commands, so it is not a fix count.
- **Risk split**: Low/Medium/High from each PR's latest assessment; PRs without one are excluded.
- **Top CI Failures**: frequencies by category (Build, Test, Flaky Test, Configuration, others) within the date range and repositories; open a category for its failures and affected PRs.
- **Top Rules Applied**: compliance rate per rule, evaluations met out of total evaluations.
- **Reviews tab**: resolution rates overall and by severity (Critical, Important, Minor) with trends on merged PRs; **Avg. findings per PR** = findings divided by reviewed PRs; a finding stays on its first-reported date.
- **Acknowledged** findings are a subset of open ones recording accepted concerns or planned follow-ups, with no fix credit; **All open** includes them. **Resolution by Author** shows five authors at a time, sortable; further views cover category (Security, Bug, Performance, Edge Case, Quality), repository, and **Tech Debt Over Time** (ignored vs resolved).
- Retention windows and data-freshness limits are (not specified).

### Repository Rules

*Source: [docs.gitar.ai/features/rules](https://docs.gitar.ai/features/rules)*

Repository rules define automated review workflows as plain Markdown files. Gitar evaluates them on every pull request and, when a condition matches, runs the declared actions. No code is required.

| Property | Description |
| - | - |
| Language | Plain English/Markdown, not code |
| Location | Committed in the repository under `.gitar/rules/*.md` |
| Integrations | Any integration the organization has enabled (Jira, Linear, Slack, and others) |
| Unit of authoring | One file per rule, YAML frontmatter plus a Markdown body |

#### Where rule files live

| Path | Scope | Purpose |
| - | - | - |
| `.gitar/rules/*.md` | Repository | Rules evaluated for that repository only |
| Configuration repository | Organization | Committed there instead of the repo; every repository evaluates the rule (config-repo path not specified on this page) |
| `.gitar/review/` | Repository | Review instructions, surfaced to the reviewer and to Knowledge (not a rule file) |
| `.gitar/skills/<name>/SKILL.md` | Repository | A skill a rule can invoke by name |

To call the same skill from rules in every repository, commit it once to the configuration repository.

#### Quick start

Create the directory, add a rule file, commit, and open a PR:

```bash
mkdir -p .gitar/rules
```

```markdown
---
title: "Security Review"
description: "Require security team review for sensitive changes"
when: "PRs modifying authentication or encryption code"
actions: "Assign security team and add label"
---

# Security Review

When sensitive code is modified:
- Assign @security-team as reviewer
- Add "security-review" label
- Post comment with security checklist
```

```bash
git add .gitar/rules/
git commit -m "Add security review rule"
git push
```

Gitar evaluates the rules on every PR. Verification in the dashboard comment shows check results and recorded actions; when no rule applies, the comment reports how many were skipped, and `gitar display:verbose` explains why each was skipped.

#### Rule file syntax

A rule is Markdown with YAML frontmatter. The body carries the detailed instructions: specific examples, edge cases, and extra context.

```markdown
---
title: "Rule Name"
description: "Brief summary of what this rule does"
type: check
when: "Condition that triggers the rule"
actions: "What Gitar does when condition is met"
---

# Detailed Instructions

Natural language description of the rule behavior.
Include specific examples, edge cases, or additional context.
```

##### Frontmatter fields

| Field | Purpose | Notes |
| - | - | - |
| `title` | Names the rule in the dashboard. | Without one, Gitar uses the heading or filename. |
| `description` | Summarizes the rule. | Optional. |
| `slug` | Optional custom rule identifier. | Does not preserve evaluation history when the file is renamed. |
| `when` | States the condition that triggers the rule. | The matching surface, written in natural language. |
| `actions` | Describes what Gitar does when the condition matches. | Natural language; may name integrations, skills, labels, reviewers. |
| `type` | `check` validates a requirement; `automation` takes an action. | Without a type, Gitar infers it from the rule. |

Validation: the source documents no error catalog or required-field enforcement. A rule with no `title` falls back to its heading or filename, and a rule with no `type` has one inferred. Glob syntax for `when` and the exact matching algorithm are (not specified) — conditions are written as natural-language descriptions of paths, change types, and metadata, and Gitar evaluates whether the PR satisfies them.

#### Triggers

| Event | What Gitar evaluates |
| - | - |
| A PR is opened | Full rule evaluation on all applicable rules |
| New commits are pushed to a PR | Re-evaluates checks, may fire automations |
| CI fails on a PR | CI-related automations, such as retrying unrelated failures |
| PR metadata updates | Title, description, reviewers, or labels change |
| A PR is closed or merged | Post-merge workflows: follow-up issue creation, compliance reporting, merge-close notifications |

#### Supported actions

| Action | What it does | Example `actions` value |
| - | - | - |
| Post comments | Posts a PR comment or an inline code review. | `"Post a comment summarizing the database schema changes"` |
| Apply labels | Adds or removes labels on detected conditions. | `"Add 'needs-docs' label if README is modified"` |
| Assign reviewers | Assigns specific reviewers when changes are detected. | `"Assign @backend-team for API changes"` |
| Suggest code changes | Suggests or makes code modifications — this is how a rule requests a fix. | `"Suggest adding error handling for new API endpoints"` |

The action snippets as written in the source:

```markdown
actions: "Post a comment summarizing the database schema changes"
```

```markdown
actions: "Add 'needs-docs' label if README is modified"
```

```markdown
actions: "Assign @backend-team for API changes"
```

```markdown
actions: "Suggest adding error handling for new API endpoints"
```

A rule requests a fix through the natural-language `actions` field (for example "suggest" or "make" a change) or by invoking a skill that posts its findings. A dedicated fix field, fix syntax, or severity/action enum beyond `type: check | automation` is (not specified).

#### Integrations

Every integration the organization has enabled is available to every rule. Name one in the rule and the agent uses it, so `post to #releases` finds Slack and `move the ticket to In Review` finds Linear.

| Integration | Example action | Setup |
| - | - | - |
| Jira | Link the PR to a ticket and update its status. | [Jira](https://docs.gitar.ai/integrations/jira) |
| Linear | Move a linked issue to In Review. | [Linear](https://docs.gitar.ai/integrations/linear) |
| Plane | Open a follow-up work item. | [Plane](https://docs.gitar.ai/integrations/plane) |
| YouTrack | Comment on the linked issue. | [YouTrack](https://docs.gitar.ai/integrations/youtrack) |
| Slack | Post a merge notification to a channel. | [Slack](https://docs.gitar.ai/integrations/slack) |

##### Custom integrations (MCP)

On the Enterprise plan you can connect your own MCP servers as custom integrations and name one in a rule the same way you name a built-in.

```markdown
---
title: "Internal Docs Enrichment"
when: "PRs that modify a documented internal service"
actions: "Comment with links to the relevant internal docs"
---

When a PR touches a documented service, use the Acme Search integration to
find the relevant internal docs and link them in a review comment.
```

##### Skills

A rule can call a skill: a procedure committed under `.gitar/skills/<name>/SKILL.md`. Name it in the rule body and the agent loads and follows it.

```markdown
---
title: "Migration Safety"
when: "PRs that add or modify files under db/migrations/"
actions: "Comment with any reversibility or ordering problems"
---

When a PR touches `db/migrations/`, use the `migration-check` skill and post
its findings as a review comment.
```

Naming the skill is what invokes it. Gitar has no slash-command syntax.

#### Organization-level and repository-level precedence

A rule in `.gitar/rules/` applies to the repository that holds it. To apply one across the organization, commit it to the configuration repository instead, and every repository evaluates it.

A repository overrides an inherited rule with a file of the same name, ignoring case and treating `-` and `_` alike. If a repository commits `.gitar/rules/no-raw-sql.md`, the configuration repository's `no-raw-sql.md` (or `no_raw_sql.md`) is skipped for that repository.

#### Rule cookbook

Each example below is one complete `.gitar/rules/*.md` file. The Quick start Security Review rule, the Internal Docs Enrichment (MCP) rule, and the Migration Safety (skill) rule above are also complete files.

##### Documentation Requirements — require docs updates alongside API changes

```markdown
---
title: "Documentation Required"
description: "Require documentation updates alongside API changes"
when: "PRs adding or modifying API endpoints"
actions: "Request documentation update if not included"
---

# Documentation Requirements

When API endpoints are added or modified:
1. Check if corresponding docs are updated
2. If not, add "needs-docs" label
3. Post comment requesting documentation
```

##### Breaking Change Detection — flag breaking public API changes for extra review

```markdown
---
title: "Breaking Change Review"
description: "Flag PRs with breaking changes for extra review"
when: "PRs with breaking changes to public APIs"
actions: "Add breaking-change label and request senior review"
---

# Breaking Change Detection

Detect breaking changes:
- Removed public methods or fields
- Changed method signatures
- Modified API response schemas

When detected:
- Add "breaking-change" label
- Assign @api-owners as reviewers
- Post checklist for migration guide
```

For dependency updates that should merge automatically, configure [Auto-Approve](https://docs.gitar.ai/features/code-review/auto-approve) and [Auto-Merge](https://docs.gitar.ai/features/code-review/auto-merge) criteria instead of a rule.

#### Debugging evaluation

Rules are also steered by PR commands that control display mode:

| Command | Description |
| - | - |
| `gitar display:verbose` | Show full rule evidence and skipped-rule reasons in Verification |
| `gitar display:compact` | Show bounded successful names and all unmet checks (default) |

#### Best practices

Keep each rule focused on one outcome. Name specific paths and conditions, and include the exceptions that matter to the team. Use `gitar display:verbose` to check why a rule matched or was skipped.

### Knowledge

*Source: [docs.gitar.ai/features/knowledge](https://docs.gitar.ai/features/knowledge)*

Knowledge is Gitar's cross-review memory: it combines team-authored guidance with facts learned from repository work, and cites the source behind review findings. A correction explained in one PR can guide a later review, so a repository convention does not need re-explaining in every thread.

> Knowledge is available on the **Enterprise** plan.

| Capability | Behavior |
| - | - |
| Learn from conversations | Turns explanations in PR comments into reusable knowledge, with the context needed to understand where it applies. |
| Apply relevant guidance | Each review receives knowledge selected for its changes, so a convention for generated files does not become a rule for every file. |
| Follow the source | Citations connect review guidance to its source. |
| Use engineering context | Connected documentation and tools bring the decisions behind the code into the review. |

#### What it indexes

| Source | What Gitar learns | Example |
| - | - | - |
| PR comments | Reusable facts and constraints explained in review conversations, including corrections to findings. | Generated files must be changed through their schema. |
| Repository instructions | Review guidance in `.gitar/review/` and review-relevant content in `.gitar/rules/`. | Database migrations must preserve compatibility with the previous application version. |
| Organization instructions | Guidance set in Custom Instructions. | Services use the shared authentication library. |
| Configuration repository | Shared guidance from the organization's configuration repository. | API repositories follow the same error response convention. |
| Repository scans | Conventions and architectural constraints discovered in repository documentation or source files. | An older API has a replacement that callers should use. |

Knowledge captures guidance from rule files; rules still define the workflows and actions Gitar runs. Each entry retains its source, keeping an explicit instruction distinct from an observation.

#### Connected knowledge sources

| Source | Context it can provide |
| - | - |
| Confluence | Design documents, service conventions, and architecture decisions. |
| Jira and Linear | Issue requirements and implementation context. |
| Slack | Team conversations available through the connected integration. |
| Custom MCP integrations | Internal documentation and enterprise systems exposed by connected tools. |

Source access follows the connections and credentials configured for the organization. Supported file formats for indexing, index size limits, and per-entry size caps are (not specified).

#### Web knowledge

Gitar can search the web and read documentation during a review when a question needs context beyond the repository, which helps check assumptions about a dependency against its documented behavior.

| Review question | Useful web context |
| - | - |
| Does this library call support the argument being added? | The library's API reference for the relevant version. |
| Did an upgrade change a default the code relies on? | Release notes and migration guidance. |
| Is this framework behavior intentional? | The framework's documentation for the feature in use. |

Web lookups supply reference material; team knowledge carries repository conventions and earlier explanations, so Gitar considers both the documented behavior and the team's usage.

#### How Gitar learns from comments

Gitar looks for explanations that remain useful beyond the current PR. A comment can teach a fact even when the finding is fixed rather than dismissed, and learning requires no special command. Gitar reads the comment with its available thread and file context, then writes a short, self-contained note that keeps the limits of the explanation, including which files or subsystem it concerns.

| Comment | What it teaches |
| - | - |
| "This `.g.dart` file is generated by build\_runner. Change the source model and regenerate it." | A convention for generated `.g.dart` files across the repository. |
| "These handlers run behind the authentication middleware in `src/auth/`. Token validation happens there." | An authentication constraint scoped to the handlers described in the thread. |
| "Fix this by changing the schema. The getter is generated from it." | Where to fix this kind of mismatch, even though the comment also requests a fix. |
| "Done," "fix this," or a dismissal without an explanation. | No reusable knowledge; these comments do not establish a convention. |

An explanation of why a finding is wrong teaches more than "this is intentional"; naming the applicable files or an exception keeps the learning scoped. Learning is separate from handling feedback on the current PR: dismissing a finding does not, by itself, teach Gitar to ignore similar findings in future PRs.

#### How knowledge reaches a review

Gitar selects knowledge per review from the changed code and PR context, and the reviewer receives a focused set of entries.

1. **Find matching knowledge.** Gitar matches entries against the files and symbols involved in the change, and also searches using the PR title and description.
2. **Check whether it applies.** Candidate entries are checked against the actual change; a matching path alone does not establish that a convention matters to this PR.
3. **Select guidance for the reviewer.** Gitar ranks relevant entries and combines repeated matches; source authority and relevance decide which guidance reaches the review.
4. **Review with that context.** The reviewer uses the selected knowledge while examining the code, and findings can cite the guidance they rely on.

A comment explaining that generated getters must be fixed in their schema, for example, lets Gitar identify the source that needs changing on a later PR touching the same kind of generated file. The comment does not create a blanket exception for all getters.

#### Source citations

Citations link a finding to the source of the guidance it uses — a repository instruction or the earlier PR comment that explained a convention — so the next reviewer can inspect the explanation without searching old PR threads. Gitar links a citation to its original source when a source URL is available; scan-derived guidance without a source URL can link to its Knowledge detail, which requires access to the organization's Knowledge dashboard.

#### Repository and organization scope

Repository instructions and comment learnings belong to their source repository. Organization instructions and configuration repository guidance can apply across the organization's repositories, with relevance checked for each review. Cross-Repo Analysis separately checks whether a change breaks another repository; Knowledge supplies the conventions and constraints that help Gitar interpret the change.

#### How knowledge stays relevant

Knowledge from instruction sources refreshes as Gitar processes those sources. Changed instructions replace their earlier content, and deleted instructions retire the associated knowledge after a successful refresh. An instruction edit in an unmerged PR does not replace the shared knowledge used by other reviews. Gitar can also narrow where an entry applies when a review shows its scope was too broad: a convention that matched an unrelated change becomes more specific, preserving the guidance for the files where it belongs.

Refresh is automatic as instruction sources are processed; a manual refresh command, API, or schedule is (not specified).

#### Inspect and manage knowledge

Enterprise organization members open **Dashboard -> Knowledge** to browse the library, searching or filtering by repository or source. Only admins can mark entries stale or change the feature setting.

| Control | Behavior |
| - | - |
| Sort by | **Most used**, **Recently updated**, **Recently added**, **Recently used**, or the number of reviews that used an entry |
| **Reviews** view | Lists recent reviews and their recorded knowledge outcomes |
| Knowledge toggle | Admin switch that turns the feature on or off; turning it off stops future processing and retains history |
| **Used** section (per entry) | Lists reviews that cited the entry in a finding or recorded that its expectation was met; supplying guidance to a review alone does not count as used |
| **Mark as stale** | Removes an entry from future knowledge retrieval while retaining its history |
| Source links | Lead back to the original material when a URL is available |

Each entry shows its content and source, the applicable code, and its recorded review usage.


## Part 3 — Configuration

### Organization Settings
*Source: [docs.gitar.ai/configuration/settings](https://docs.gitar.ai/configuration/settings)*

Open **Settings → Configuration**; behavior controls live in the **Behavior** card. **Organization** scope sets defaults for every connected repository; **Repository** scope overrides them through the overrides dialog on the repository list, which flags values differing from the org default and resets any override in one click. Only explicitly toggled settings change — everything else inherits.

#### Behavior settings

| Setting (exact UI label) | What it does | Default | Scope / allowed values |
| - | - | - | - |
| **Skip drafts** | Ignores draft PRs until they are marked ready for review | (not specified) | On/off; org default, per-repo override |
| **Disable automatic processing** | Gitar does nothing on its own: opening, updating, or labeling a PR starts no review, CI analysis, or summary. Start with `Gitar review` or **Start Review**, after which later pushes and CI failures are handled as usual. `Gitar fix` works on any PR; a CI failure predating the first request waits for `Gitar fix CI` | (not specified) | On/off; org default, per-repo override. `gitar-skip` does the same for one PR, but must land before Gitar starts |
| **Enhance summaries** | Auto-fills PR descriptions with a summary of the changes | (not specified) | On/off |
| **Retry unrelated CI failures** | Retries jobs whose failures are unrelated to the PR (flaky tests, transient infrastructure) | (not specified) | On/off; supported platforms and retry limits are platform-defined |
| **Block merges** | Severity threshold for the review verdict; findings at or above it produce a blocking review | **Important or higher** | **Never**, **Critical issues only**, **Important or higher**, **Suggestions or higher**; some hosts enforce the block, others only record and display it |
| **Enable the `gitar unblock` command** | Any member can dismiss Gitar's blocking review by commenting `gitar unblock` | (not specified) | On/off; shown only when **Block merges** is above **Never** |
| **Auto-approve PRs based on code review** | Submits an approving review when a PR passes code review | (not specified) | On/off, plus optional natural-language criteria; with none, any PR without blocking findings is approved |
| **Apply gitar-approved label** | Marks approved PRs with `gitar-approved` | (not specified) | On/off; inside auto-approve settings |
| **Auto-merge PRs** | Arms native auto-merge right after Gitar approves | (not specified) | On/off; appears once auto-approve is on. Method: squash / merge commit / rebase on GitHub and Azure DevOps; GitLab uses the project default. Availability varies by host |
| **Auto-merge criteria** | Merge conditions in plain language, evaluated in the same pass as auto-approve | (not specified) | Free text; under the auto-merge toggle |
| **Require `.gitar/config/merge.md`** | Holds every repo back until it commits its own criteria file, so only opted-in repos are armed | (not specified) | On/off; under the auto-merge toggle |
| **Auto-apply review criteria** (card) | Limits which review findings Gitar may fix automatically; saving criteria does not enable fixes on a PR | (not specified) | Free-text criteria |
| **Validate PRs against linked issues** | Reads linked issues, splits each into objectives, and judges the diff against them | On where available | On/off; organization-wide only |
| **Review depth** | **Thorough** includes smaller verified issues; **Focused** prioritizes higher-impact findings | (not specified) | Enterprise org admins only; org default plus **Customize** per repo, reset to inherit |

#### Custom instructions

Org-wide instructions apply to every repository (coding standards, preferred libraries, architectural patterns) in addition to each repository's own instruction files.

| Setting | What it does | Default |
| - | - | - |
| **Review summary instructions** | How the summary under the **Code Review** header reads: length, structure, register, tone, language | Empty field gives one or two sentences |
| **Risk classification** | Whole-PR risk assessment, labeled in reviews and the dashboard; admins can turn it off or refine levels with **Risk instructions** | (not specified) |

Example review-summary instruction:

```text
Write three or four sentences, no bullets. Open with the service the change
touches, then the most severe finding. Use plain past tense and never address
the author as "you".
```

Repositories add risk policy in `.gitar/config/risk.md`.

#### Scope

Comma-separated lists, no spaces, organization-wide only (no per-repo scope).

| Field | What it does | Default |
| - | - | - |
| **Allowed authors** | Process PRs only from these users | Empty = all users |
| **Excluded authors** | Skip PRs from these users, even if allowed | (not specified) |
| **Allowed bots** | Bot accounts to process, e.g. Dependabot, Renovate | Empty = all bot-authored changes skipped |
| **Allowed target branches** | Process PRs merging *into* a matching branch | Empty = every target branch |
| **Excluded target branches** | Never process PRs merging into a matching branch; wins over the allowed list | (not specified) |

##### Target branch patterns

Names or shell globs (`main`, `release/*`, `*-staging`). Matching is case-insensitive and `*` spans `/`, so `feature/*` matches `feature/a/b`; full refs like `refs/heads/main` are normalized. The filter runs at first pickup and on automatic push-triggered reviews; retargeting into an excluded branch stops the next automatic review, though manual reviews still run.

### Repository Customization
*Source: [docs.gitar.ai/configuration/repository-config](https://docs.gitar.ai/configuration/repository-config)*

Per-repository configuration lives in the codebase and is version-controlled with it. Criteria files (`apply.md`, `approve.md`, `merge.md`) are read from the default branch, so edits to them take effect after they merge.

#### AI Instruction Files

| File | Description |
| - | - |
| `AGENTS.md` | General AI agent instructions; `agent.md` and `agents.md` are read too |
| `CLAUDE.md` | Claude-specific instructions and conventions |
| `.cursorrules` | Cursor-compatible instruction file |
| `.cursor/rules/*` | Directory of Cursor rule files |
| `.claude/rules/*` | Rule files kept alongside `.claude/skills` |

Both rule directories are read one level deep: `.claude/rules/backend/api.md` is not picked up, so keep rule files directly in the directory.

No configuration is needed: Gitar loads these from the repository root on every PR and uses them for both review and CI failure fixing. When the agent works inside a subdirectory, it also picks up instruction files and rule directories between that subdirectory and the root.

##### Including other files

Reference another file with `@` plus its path; Gitar substitutes that file's content.

```markdown
Follow the commit and naming conventions below.

@guidelines.md
@docs/architecture.md
```

- Resolve from the containing file's folder, then the repository root; paths must stay inside the repository.
- Put each reference on its own line or follow it with a space — trailing punctuation becomes part of the path.
- References inside code blocks or inline code are ignored; included files may include others.
- Files in `.gitar/instructions/` also load, as Markdown, for every Gitar agent.

#### The .gitar Directory

```text
your-repo/
  .gitar/
    rules/        # Repository rules (automation workflows)
      *.md
    review/       # Custom code review instructions
      *.md
    skills/       # Reusable procedures the agent can run on request
      <name>/SKILL.md
    instructions/ # Instructions every Gitar agent reads, not just review
      *.md
    cross-repo.md # Guidance for Cross-Repo Analysis
    config/       # Per-repository criteria files
      apply.md
      approve.md
      merge.md
      risk.md
```

Criteria files under `.gitar/config/`:

- `apply.md` — auto-apply criteria (never inherited)
- `approve.md` — auto-approve criteria
- `merge.md` — auto-merge criteria
- `risk.md` — risk guidance that can raise the organization's assessment

`.claude/skills/`, `.agents/skills/`, and `.github/skills/` are also read, so skills kept for Claude Code, Codex, or Copilot need no second copy. Every path in the tree may instead live in a configuration repository; shared `approve.md`, `merge.md`, and `risk.md` extend the org baseline with the repo's own files on top. Risk guidance also considers additions in the PR.

#### Custom Review Instructions

`.gitar/review/` holds Markdown files with instructions, checks, or gotchas, splittable by topic (security, performance, project gotchas).

```markdown
# Logging Gotchas

- Use `info!` for logging that requires operational visibility
- Leave `debug!` for local debugging only
- Our telemetry only renders logs with severity `info` or higher
```

##### Including Specific Files

`@` includes work here too: paths resolve relative to the source file, then fall back to the repository root.

```text
your-repo/
  .gitar/
    rust_best_practices.md
    review/
      gotchas.md
  shared/
    common_rules.md
```

From `.gitar/review/gotchas.md`:

```markdown
# Gotchas for Rust Code

@../rust_best_practices.md

@shared/common_rules.md

# Other project-specific gotchas
...
```

`@../rust_best_practices.md` resolves one level up from `review/`; `@shared/common_rules.md` is not found there, so repo-root resolution applies. This works recursively.

#### Repository Rules

Automated workflows in natural language live in `.gitar/rules/*.md`; when a rule's conditions are met on a PR, Gitar executes its actions. Org settings are the defaults every connected repository starts from.

### Configuration Repository
*Source: [docs.gitar.ai/configuration/configuration-repository](https://docs.gitar.ai/configuration/configuration-repository)*

Select up to three configuration repositories whose shared configuration every repository inherits. Gitar reads shared configuration and AI instruction files from each one's default branch alongside the reviewed repository's own configuration.

- Available on **Pro** and **Enterprise**, rolled out per organization — contact support if the picker is absent.
- Requires the organization admin role.
- Each repository must already be connected; AWS CodeCommit is not selectable.
- Selected repositories apply organization-wide; GitLab group assignments are not supported.

#### What it holds

| Path | What it does | Override |
| - | - | - |
| `.gitar/skills/` | Skills every repository's agents can call | Repo's own skill of the same `name` wins |
| `.gitar/rules/` | Rules every repository evaluates | Repo's own rule file of the same name wins (case and `-`/`_` insensitive) |
| `.gitar/review/` | Review instructions applied to every review | Both load, organization's first |
| `.gitar/instructions/` | Instructions for every Gitar agent | Both load |
| AI instruction files (`CLAUDE.md`, `AGENTS.md`, `.cursorrules`, `.cursor/rules/`, `.claude/rules/`) | Shared conventions for review and CI fixing | Both load, shared first |
| `.gitar/cross-repo.md` | Cross-repo guidance naming dependencies to include or exclude | Both load |
| `.gitar/config/approve.md`, `merge.md`, `risk.md` | Shared auto-approve, auto-merge, risk criteria extending the org baseline | Both apply, repo's own on top |

`.gitar/config/apply.md` is never inherited.

Precedence: local rules and skills win, and among shared repositories the first selected wins a duplicate rule or skill (the settings list shows that order). Instruction files combine every selected repository's guidance, then local instructions, within the existing instruction budget — adding repositories does not multiply it, and a local file does not replace shared instructions.

#### Enable it

1. Create or pick a connected repository (one named `.gitar` is a clear choice).
2. Commit shared configuration using the same paths a repository uses for itself:

```text
.gitar/
  skills/
    migration-check/
      SKILL.md
  rules/
    no-raw-sql.md
  review/
    gotchas.md
  config/
    approve.md
    merge.md
    risk.md
  instructions/
    conventions.md
  cross-repo.md
```

3. Go to **Settings → Configuration**, and at the foot of the **Repositories** card under **Configuration repositories** select **Add repository**; repeat for up to three.
4. Saving reads the selected repositories and lists discovered skills under each, with connection and read failures reported per selection. The list shows skills only — inherited rules and review instructions are not listed, so confirm them on the next run in an inheriting repository.

**Remove** beside a repository stops inheriting from it; **Clear all** stops inheriting shared configuration.

#### Where Gitar looks

`.gitar/rules/` and `.gitar/review/` are read recursively, so subdirectories work, and AI instruction files load automatically from the root (Cursor and Claude rule directories stay one level deep, as in any repository). Keep shared Claude rules directly in `.claude/rules/` — no symlink to `.gitar/review/` is needed, since those files provide instructions while `.gitar/rules/` defines workflows.

Skills come from six directories, in order:

```text
your-config-repo/
  .gitar/skills/<name>/SKILL.md
  .claude/skills/<name>/SKILL.md
  .agents/skills/<name>/SKILL.md
  .github/skills/<name>/SKILL.md
  skills/<name>/SKILL.md                     # marketplace layout
  plugins/<plugin>/skills/<name>/SKILL.md    # marketplace layout
```

The first four are the directories read in any repository. The last two are the Claude Code and Copilot marketplace layouts, read only in the configuration repository, so a marketplace repository works as-is. A repository's own copy of a same-`name` skill wins.

#### When changes take effect

A push to the default branch can take up to 15 minutes to reach the next run. To test instruction, rule, or skill edits before they land, open a PR in the configuration repository itself: Gitar reviews it using that branch's version, while approval and merge criteria still come from the default branch, so the PR cannot change its own approval or merge policy.

Anyone who can push to the configuration repository can change what every Gitar agent does — skills, rules, and review instructions are all instructions the agent follows, and a skill directory can carry scripts it runs. Protect the default branch as you protect CI configuration: require review and restrict who can merge.

#### Troubleshooting

| The card says | Cause | Fix |
| - | - | - |
| "disconnected" | Repository was disconnected after being named | Reconnect it, or name another |
| A read failure reason | Gitar could not fetch the repository | Remove and re-add to force a fresh read; contact support if it persists |
| "No skills found" | Nothing under any of the six skill directories; rules and review instructions are not counted and may still load | Add `.gitar/skills/<name>/SKILL.md` and push, or ignore if you only share rules and review instructions |

A failed fetch does not fail the review or block other selected repositories; the card shows connection state and the last save-time read. An inherited rule never running usually means the reviewed repository has a same-named file under `.gitar/rules/` (it wins) or does not run its own rules at all — inherited rules need the same plan as committed ones. An inherited skill never running means a same-`name` local skill wins, or the name collides with an integration slug Gitar holds (`jira`, `linear`, `slack`), which is dropped whether or not the integration is on — rename it.

### Signed Commits
*Source: [docs.gitar.ai/configuration/signed-commits](https://docs.gitar.ai/configuration/signed-commits)*

Gitar GPG-signs every commit it pushes — fix requests, CI failure fixes, other automated changes — on every platform, so you can confirm a commit came from Gitar and was not tampered with.

#### Public GPG key

The key's identity is `Gitar Bot <noreply@gitar.ai>`. The full ASCII-armored block (`-----BEGIN PGP PUBLIC KEY BLOCK-----` … `-----END PGP PUBLIC KEY BLOCK-----`) is published on the Signed Commits docs page and at [github.com/gitarcode.gpg](https://github.com/gitarcode.gpg) for automated retrieval.

#### Verify a commit

Save the public key to a file, for example `gitar.gpg`, and import it:

```bash
gpg --import gitar.gpg
```

Then verify:

```bash
git log --show-signature -1 <commit-sha>
```

A valid signature shows `Good signature from "Gitar <...>"`.

#### Verified badge, by platform

| Platform | Badge | Setup |
| - | - | - |
| GitHub | Yes | None; key registered |
| GitLab | Yes | None; key registered |
| Bitbucket Data Center | Yes | None; Gitar registers its key on its own account when you connect |
| Azure DevOps | No | Signature is on the commit and verifies locally |
| Bitbucket Cloud | No | Signature is on the commit and verifies locally |
| AWS CodeCommit (preview) | No | Signature is on the commit and verifies locally |

If a GitHub or GitLab commit has no badge, confirm that its author email matches the email on Gitar's GPG key.


## Part 4 — Setup: code hosts and CI

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

#### CI integration at a glance

No CI connection is needed for review. Each one only adds **enhanced failure analysis** — plus, on CircleCI alone, an automatic rerun. All eight follow one pattern: the CI reports a build to the pull request as a status check, the status links to the build, and Gitar fetches the log through that link. The CI must therefore already publish statuses to your Git provider. No page documents the underlying REST paths (not specified); Gitar reads whatever the build link resolves to, and the log endpoints named below are the only ones called out.

| CI system | Auth method | What Gitar reads | Self-hosted | Notable requirement |
| - | - | - | - | - |
| Buildkite | User API access token, 9 read scopes | Log of the failing build | No | All nine scopes required, or calls fail one by one |
| CircleCI | Personal API token | Log of the failing job | No | Personal, not Project, API token |
| Bitrise | Workspace API token | Log of the failing build | No | **Developer** role or higher on **All apps** |
| Harness | Service account token (`sat.`) | Logs of failed execution steps | Yes, Cloud and Self-Managed | Account Viewer with **All Resources Including Child Scopes** |
| Concourse | Local username + password, viewer role | Archived failed-step logs | Yes | No SSO or `fly` session token; HTTPS with valid certificate |
| Jenkins | Username + API token over HTTP Basic | Console log, or failing stage log | Yes | Jenkins URL required; link host must match |
| TeamCity | Access token + server URL | Log of the failing build | Yes, Cloud and On-Premises | **Project Viewer** role; link host must match |
| Woodpecker | User API token + server URL | Archived failed-step logs | Yes | v3.19.0 with GitHub forge; GitHub repos only |

Credentials are encrypted in AWS Secrets Manager and validated before saving. Only CircleCI ever receives a write. Prefer a dedicated identity over a personal one, so access survives departures.

### Buildkite

*Source: [docs.gitar.ai/connecting-ci/buildkite](https://docs.gitar.ai/connecting-ci/buildkite)*

Create a token at [buildkite.com/user/api-access-tokens](https://buildkite.com/user/api-access-tokens): **New API Access Token**, named `Gitar`, with the target organization and all nine scopes — `read_teams`, `read_artifacts`, `read_builds`, `read_job_env`, `read_build_logs`, `read_organizations`, `read_pipelines`, `read_user`, `read_suites` (teams, artifacts, builds and status, job environment variables, logs, organization, pipeline configuration, token-user verification, test suites). Shown once; the token carries its user's access, so it sees exactly that user's pipelines. A missing scope does not fail the connection, only the first call needing it.

Connect at organization settings → **Integrations** → **Buildkite** → **Connect**, paste into **Buildkite API Token**, **Connect**; the button becomes **Configure** after a test call validates it. Only failing builds are analyzed, and nothing is written back. Log fetching fails if the token lacks `read_build_logs` or its user cannot open the pipeline. Revoke by deleting the token.

### CircleCI

*Source: [docs.gitar.ai/connecting-ci/circleci](https://docs.gitar.ai/connecting-ci/circleci)*

Create a **Personal** API token at [app.circleci.com/settings/user/tokens](https://app.circleci.com/settings/user/tokens) — **Create New Token**, named `Gitar`, shown once. A Project API Token is rejected. Scopes are (not specified); the token inherits the user's project access.

Connect under **Integrations** → **CircleCI** → **Connect**, paste into **CircleCI Token**, **Connect**. This is the only integration with a write: Gitar reruns a job when analysis classifies its failure as unrelated to the change. Otherwise it reads failing-job logs and comments on the PR. Fetching fails when the token resolves but its user cannot see the project.

### Bitrise

*Source: [docs.gitar.ai/connecting-ci/bitrise](https://docs.gitar.ai/connecting-ci/bitrise)*

Requires workspace admin. **Workspace Settings** → **Security** → **Create token**, named `Gitar`; set **Expiration** per policy or leave unset; under **Role access** choose **All apps** with **Developer** or higher. The token belongs to the workspace, not a user, so it survives departures — but expiry silently stops log fetching, first seen as a red build Gitar ignores.

Connect under **Integrations** → **Bitrise** → **Connect**, paste into **Bitrise Token**, **Connect**. Only failing builds; nothing written back. If the token resolves but does not reach an app, grant **All apps** with Developer or higher, or add the app to its role access.

### Harness

*Source: [docs.gitar.ai/connecting-ci/harness](https://docs.gitar.ai/connecting-ci/harness)*

Create an account-level service account in **Account Settings > Access Control > Service Accounts**; one covers every project granted to it. **Manage Role Bindings** → **Account Viewer** with the **All Resources Including Child Scopes** resource group. Under **API Keys**, add an **API Key**, add a **Token** beneath it, **Generate Token**: it starts with `sat.`, shows once, and should stay at No Expiration.

`core_pipeline_view` is the entire permission set — log reading rides on pipeline view. To grant less, bind a custom role holding only pipeline view, or a custom resource group limited to the orgs/projects Gitar reads; the group must reach into projects, since an account-level-only group leaves the token unpermitted.

Connect under **Integrations** → **Harness** → **Connect**: paste into **Harness API Token**; leave **Harness Host** blank for Cloud or set the server host (for example `harness.mycompany.com`) for Self-Managed. Two checks must pass — **Harness connectivity** (the token resolves to a principal and Gitar reached the instance) and **Pipeline view permission** (the principal can read executions and download step logs). **Connect** stays disabled while a check runs or while Harness reports no pipeline access; an unreachable instance leaves it enabled. Leave the token blank on a connected org to re-check the stored token, which is the flow after fixing a binding; bindings are evaluated per request, so a fix works immediately.

Log fetching reads the server from the execution URL, so the host field matters only for validating a token before the first build; if set, Gitar processes executions from that host alone and drops events on a mismatch. A Self-Managed instance reachable only over PrivateLink or an internal domain cannot be validated from the dialog — connectivity reports failure and Connect stays enabled; contact Gitar.

### Concourse

*Source: [docs.gitar.ai/connecting-ci/concourse](https://docs.gitar.ai/connecting-ci/concourse)*

A Concourse administrator creates a dedicated [local user](https://concourse-ci.org/docs/auth-and-teams/configuring/local-user/) and grants the [viewer role](https://concourse-ci.org/docs/auth-and-teams/user-roles/) on each permitted team. Gitar uses that local username and password; an SSO login or copied `fly` session token cannot substitute. Viewer access reads private logs without starting builds or changing pipelines. Keep a completed private build with archived logs for validation (success or failure both work).

Connect at **Settings > Integrations** → **Concourse** → **Connect**:

| Field | Value |
| - | - |
| Connection name | A label that distinguishes this server, such as `Build server`. |
| Server URL | The HTTPS address Gitar can reach, such as `https://ci.example.com`. Include a base path if the server uses one. |
| Local username | The dedicated Concourse user's login name. |
| Permitted teams | Exact team names, separated by commas, such as `main, build-team`. The user must have viewer access to each team. |
| Password | The local user's password. |
| Completed private build URL | A build on this server in a permitted team, such as `https://ci.example.com/builds/42`. |

**Validate and save** checks log access for that build before saving. Each connection holds its own address and password; repeat for another server, or use **Edit connection**. Gitar clears the analysis when CI recovers, writes nothing back, and cannot start or retry builds. Validation fails on a running build (timeout) or pruned logs, and the build URL must match the saved server on hostname, port and base path — an alias or redirect does not count. On edit, leave **Password** blank to reuse the stored password when URL and username are unchanged.

### Jenkins

*Source: [docs.gitar.ai/connecting-ci/jenkins](https://docs.gitar.ai/connecting-ci/jenkins)*

Sign in as the user Gitar reads as, open the user menu → **Configure**, then under **API Token** click **Add new Token**, name it `Gitar`, **Generate**, and copy it. Jenkins has no bearer-token mode: the token is the password half of HTTP Basic authentication and works only with its username, so Gitar asks for both. Grant **Overall/Read** plus **Job/Read** on the jobs to read — Job/Read at the root covers every job; grant it per job or folder to narrow. Job read access includes the console log.

Connect under **Integrations** → **Jenkins** → **Connect** with **Jenkins Username**, **Jenkins API Token**, and **Jenkins URL** from **Manage Jenkins > System**, including any context path such as `https://example.com/jenkins`. The URL is required — Jenkins has no hosted form, and a blank field means no logs. Gitar checks each build link's host against it and drops statuses pointing elsewhere.

No plugin is required; the console log is a core endpoint. Two optional plugins change what is read: [Pipeline: Stage View](https://plugins.jenkins.io/pipeline-stage-view/) makes Gitar read only the failing stage's log, isolating the failure on large builds, and [JUnit](https://plugins.jenkins.io/junit/) adds failing test names and assertion messages. Without either, Gitar reads the whole console log.

Only failing builds; nothing written back. Statuses are usually `continuous-integration/jenkins/pr-head` or `pr-merge`, published by [GitHub Branch Source](https://plugins.jenkins.io/github-branch-source/) on multibranch pipelines or the **Set GitHub commit status** publisher elsewhere. A wrong username fails identically to a wrong token, since HTTP Basic reports both as one error — use the login, not the display name. A changed Jenkins URL applies to new builds only; branch names containing slashes need no action.

### TeamCity

*Source: [docs.gitar.ai/connecting-ci/teamcity](https://docs.gitar.ai/connecting-ci/teamcity)*

Via the profile menu → **My Settings & Tools > Access Tokens > Create access token**. It starts with `eyJ0eXAi` and shows once; a token carries its creator's permissions, so create it as the user Gitar reads as. Leave **Expiration** at Never, or record the date — expiry silently stops log fetching. Assign **Project Viewer** on the projects to read, or on **All Projects**; viewing a project carries viewing its build logs.

In **Administration > Global Settings**, confirm **Server URL** is the address Gitar can reach — every status link is built from it, so `localhost` or an internal-only name publishes links nothing outside your network can open.

Connect under **Integrations** → **TeamCity** → **Connect** with **TeamCity Access Token** and **TeamCity Server URL** (`https://<tenant>.teamcity.com` on Cloud, your own host on-premises); the button becomes **Configure** once validated. Gitar checks each build link's host against that URL and ignores statuses pointing elsewhere, keeping the token from being sent to an unnamed host.

Only failing builds; nothing written back. Missing statuses usually mean the [Commit Status Publisher](https://www.jetbrains.com/help/teamcity/commit-status-publisher.html) feature is absent or its credential cannot write statuses on the repository. Permissions are evaluated per request, so granting Project Viewer fixes log fetching without a new token.

### Woodpecker

*Source: [docs.gitar.ai/connecting-ci/woodpecker](https://docs.gitar.ai/connecting-ci/woodpecker)*

Requires Woodpecker **v3.19.0** with its [GitHub forge integration](https://woodpecker-ci.org/docs/administration/configuration/forges/github), a GitHub repository only, organization admin in Gitar, and a dedicated user that can read pipeline details and archived step logs — the user API token inherits that account's repository permissions. Copy it from **User settings > CLI and API**; scopes are (not specified).

Connect at **Settings > Integrations** → **Woodpecker** → **Connect** with **Connection name** (a label such as `Build server`), **Server URL** (the HTTPS address Gitar reaches, including any port or path prefix), and **API token**, then **Validate and save**. **Add another server** connects another instance, each with its own URL and token. **Edit connection** replaces the token, or clears **Analyze failures from this server** to pause analysis; leave **API token** blank to keep the saved one when editing the same server, though changing **Server URL** requires a token for the new server.

On failure Gitar checks the repository and commit before reading failed-step logs, then posts the analysis in the GitHub PR's dashboard comment and removes it once CI passes. Pipelines are run or retried in Woodpecker, not Gitar. A build link differing from the saved **Server URL** in hostname, port or path prefix is ignored.


## Part 5 — Integrations

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


## Part 6 — Administration, security, billing, API

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


## Part 7 — FAQ and release notes

### FAQ

*Source: [docs.gitar.ai/resources/faq](https://docs.gitar.ai/resources/faq)*

Answers to the questions Gitar's documentation addresses directly, grouped by theme. Topics the FAQ does not answer are listed at the end rather than inferred.

#### General

##### Q: What is Gitar?

An AI code review and CI fixing agent that works inside the PR interface. It reviews changes for security, bugs, and performance issues, analyzes CI failures, and pushes fixes without leaving the pull request.

##### Q: How does Gitar work?

When a PR is created or updated, Gitar reads the diff, the full files the change touches, CI logs when CI fails, and any configured repository rules. It posts findings as inline review comments on the relevant lines, and a dashboard comment on the PR carries a consolidated summary of review, CI analysis, and rule results.

##### Q: What languages does Gitar support?

Language-agnostic — it works with any language or framework. Code review, CI failure analysis, and fix generation all operate on the code as-is.

##### Q: Can I use my own LLM account?

Yes, on Enterprise. Gitar can serve every LLM call from your own Anthropic, AWS Bedrock, or gateway account, and your provider bills you directly.

#### Reviews & Findings

##### Q: How do I enable code review?

Open organization settings in the Gitar dashboard, find **Code Review** under Features, and enable the toggle. Gitar then reviews all new PRs automatically.

##### Q: Can I customize what Gitar reviews?

Yes. Add markdown files to `.gitar/review/` in the repository with custom instructions, checks, or gotchas; Gitar reads them during review to tailor feedback.

##### Q: What context does Gitar use during code review?

The full repository, not the PR diff alone. Gitar follows imports, checks call sites, and traces how a change connects to the rest of the codebase, which is how it catches broken callers, inconsistent patterns, and missing updates in related files.

##### Q: How do I dismiss a finding?

Reply to the inline review comment explaining why a fix is unnecessary, or resolve the thread on GitHub. Findings closed without a fix are tracked separately from findings resolved by a code change. Pushing code that addresses the issue resolves the finding on its own — the thread closes and the finding moves to the collapsible "Resolved" section of the dashboard comment. Dismissals persist across review iterations, so Gitar does not re-raise closed issues.

##### Q: How do I apply a suggested fix from a review comment?

On GitHub, check the box next to the suggested fix. On GitLab, react with the checkmark emoji. On Azure DevOps and Bitbucket, reply `gitar fix` on the finding. Gitar commits the fix directly to the branch, and when a finding has multiple suggested fixes each one is numbered so you can pick the right one.

##### Q: How is Gitar different from linters and SAST tools?

Linters and SAST tools match predefined patterns — style violations, known vulnerability signatures, static rule violations. Gitar reasons about the intent behind a change in context, so it can flag incorrect logic, unhandled edge cases, and drift from the rest of the codebase. The two are complementary.

##### Q: How is Gitar different from GitHub Copilot code review?

Copilot code review works on the PR diff with limited repository context. Gitar explores the full codebase, pushes fixes directly to the branch, analyzes and fixes CI failures, takes custom review instructions and rules, and re-reviews after every push.

##### Q: Why didn't Gitar review my revert PR?

Gitar skips code review for a PR containing only a single revert commit, even if the original change was never reviewed. Push another commit and code review resumes; CI analysis and rule evaluation still run.

#### CI Failure Analysis

##### Q: What CI failures can Gitar fix?

Build errors (compilation failures, missing imports, type errors), test failures (broken assertions, missing setup), linting errors (style violations, formatting), and flaky tests (race conditions, timing issues).

##### Q: What if Gitar can't fix the failure?

After multiple iterations it posts a summary of what was attempted so you have full context to debug manually. You can also comment with additional context to steer the next attempt.

##### Q: How many iterations will Gitar try?

Recovery is bounded; the conditions and stopping points are documented in CI Failure Analysis under "Recovery after a Gitar fix." A fresh comment can provide more context when another attempt is needed.

#### Setup & Access

##### Q: How does Gitar access my code repositories?

Through OAuth integrations with GitHub and GitLab. Gitar accesses only the repositories you configure and performs only the maintenance tasks you approve. Repository access is logged and auditable.

##### Q: How do I skip Gitar on a specific PR?

Apply the [`gitar-skip`](https://docs.gitar.ai/labels#gitar-skip) label to skip automatic processing for that PR. Explicit comment commands still work.

##### Q: Why does Gitar say I don't have a seat?

The organization is on a paid plan (Core or Pro) and no admin has allocated you a seat. Ask a team admin to assign one from Settings → Billing at app.gitar.ai. During a trial, seats are not enforced and all members have full access.

##### Q: Why does Gitar show paused automatic processing?

The organization has used its automatic-processing headroom for the billing period. On paid plans, reviews on new PRs and comment-triggered work continue, while automatic re-reviews after pushes pause. Comment **"Gitar review"** to request another review, subject to plan and seat requirements. Headroom resets with the next billing period and scales with assigned seats.

#### Security & Data

##### Q: Is my code stored on Gitar's servers?

No. Code is processed in ephemeral environments that are destroyed when the task completes. Gitar holds zero data retention agreements with every AI provider it uses, so code is never stored or used for training.

##### Q: Does Gitar train AI models on my code?

No. Customer code is not used for training; it stays private and serves only the maintenance tasks you request.

##### Q: How does Gitar handle secrets in my code?

Secrets encountered during processing are not logged, stored, or transmitted outside the processing environment. They exist only in encrypted memory for the life of the environment and are erased when it is destroyed.

##### Q: What certifications does Gitar have?

Security controls aligned with SOC 2 Type II and ISO 27001, with third-party assessments run regularly. Contact security@gitar.ai for current attestation status.

##### Q: What are your zero data retention agreements?

Gitar holds contractual zero data retention agreements with every AI provider it uses; current providers appear on the Sonar sub-processor list. Under those agreements no customer code is retained, stored, or used for model training, and processing runs against zero-retention API endpoints.

##### Q: How does Gitar isolate different organizations?

Organizations are isolated at the database, application, and infrastructure levels. No organization can access another's data, configurations, or processing environments.

#### Billing & Plans

##### Q: How do I upgrade from the free trial?

Visit billing settings at app.gitar.ai and select a plan. Trial features continue uninterrupted once you subscribe.

##### Q: What happens when my trial ends?

Without an active subscription the organization returns to the Free plan. Code reviews and PR commands require a plan that includes them. The trial runs 14 days.

##### Q: Can I change my plan later?

Yes — upgrade between Core and Pro at any time from billing settings. To move to Enterprise, contact support@gitar.ai; Enterprise plans include unlimited seats, custom integrations, and dedicated support.

##### Q: How do I cancel my subscription?

For Core and Pro, open **Settings → Billing → Manage Billing** and complete the cancellation in Stripe's Billing Portal. Disconnecting a repository does not cancel a subscription or stop billing; the subscription page covers the steps and the Enterprise support path.

##### Q: Is Gitar free for open source?

Yes. Vetted open-source projects get Gitar free on the Open Source plan, which includes everything in Pro plus unlimited seats. It covers public repositories on github.com or gitlab.com, each repo is approved individually, and applications go through the Gitar for OSS form.

#### Integrations

##### Q: Can I use more than one ticket tracker?

Connect as many as you use. A bare key like `PROJ-123` looks identical across trackers, so Gitar attributes it by precedence: Jira first, then Linear, then Plane, then YouTrack — an org running two trackers never resolves a bare key to the second one.

#### Gaps in this FAQ

The FAQ does not state these, so treat them as **(not specified)** here: support response-time SLAs and formal support tiers beyond the Enterprise contact addresses (support@gitar.ai, security@gitar.ai); per-organization or per-repository limits (the FAQ says nothing about a maximum number of repositories); behavior on draft PRs (documented elsewhere as a "skip draft PRs" setting, not in the FAQ); and what happens to in-flight work when a PR is closed or merged.

### Release Notes

*Source: [docs.gitar.ai/release-notes](https://docs.gitar.ai/release-notes)*

Gitar's dated changelog, running from the September 12, 2025 launch of the GitHub check run and CI integrations through October 27, 2026. Entries are grouped by announcement date rather than by product version — no Gitar version numbers appear anywhere in the log — and each date carries several subsections of shipped features, usability improvements, and bug fixes. The live, canonical copy is the [release notes page](https://docs.gitar.ai/release-notes); this section compresses 35 dated releases and highlights what changed for customers.

#### Recent releases

| Date | What shipped |
| - | - |
| October 27, 2026 | Outbound traffic is now IPv4 only; customers who allowlisted the IPv6 range `2600:1f28:74:4000::/60` must remove it. |
| October 16, 2026 | Cross-PR Analysis (on by default for Enterprise), Agentic Security for agent skills and the scripts they call (Enterprise), auto-apply criteria with `.gitar/config/apply.md`, a Verification section in the dashboard comment, AWS CodeCommit preview, Concourse and Woodpecker CI analysis, CI recovery after a Gitar push for every organization, and up to three configuration repositories. |
| September 17, 2026 | Knowledge that learns from review conversations and cites sources, Cross-Repo Analysis out of preview (Enterprise), Azure DevOps Server and Bitbucket Data Center GA, PR-level Risk Triage, the `gitar-managed` label for automatic fixes, Jenkins and YouTrack integrations, multiple Azure DevOps instances, and Focused vs. Thorough review depth (Enterprise). |
| August 28, 2026 | Bring Your Own Model (Anthropic key, AWS Bedrock role, or LiteLLM/Portkey/OpenRouter gateway; Enterprise), Harness and TeamCity CI, an organization configuration repository that shares `.gitar/` skills and rules, Skills, functional validation for every issue source, custom integrations reduced to https MCP server URLs, Plane, and target-branch scope filters. |
| August 7, 2026 | Free Open Source plan for public repos with an OSI-approved license, a Connections panel that allows multiple GitLab instances, custom integrations (MCP), per-repository auto-merge, and self-closing inline threads. |
| June 26, 2026 | Azure DevOps and Bitbucket support in beta, immediate reaction to PR opens/closes, comments, pushes, and accepted fixes instead of batch delays, and double the per-seat review budget on Pro. |
| May 11, 2026 | One-click apply of a suggested fix from an inline comment on GitHub and GitLab, `gitar unblock` on GitHub, the `gitar-approved` label, Resolution by Author insights, and auto-approve that no longer requires explicit criteria. |
| April 24, 2026 | Native auto-merge armed alongside auto-approve, per-repo `.gitar/config/approve.md` criteria, a configuration page rebuilt around org and repo scopes, Tech Debt Over Time and PRs by Type insights, and the GitLab `GET /v1/external/gitlab/mr_status` endpoint. |
| April 7, 2026 | Per-repo on-demand processing (act only when addressed in a comment), a skip draft PRs toggle, issue-tracker onboarding for Jira and Linear, and the GitLab `gitar unblock` command. |
| March 31, 2026 | Integration health monitoring cards for Jira, Slack, and BYOK keys; in-place GitLab token updates; replies to dashboard comments treated as first-class interactions; billing improvements including annual-to-monthly switching. |
| March 24, 2026 | All Gitar commits GPG-signed, a follow-up question instead of a guess on ambiguous finding replies, a separate CI retry toggle, automatic GitLab approval rule setup, and multiple GitHub installations. |
| March 2, 2026 | Reviews tab replacing the Insights sub-page, real-time thread sync, stale finding auto-resolution, better large-PR handling, "Prompt for agents" copy block, per-seat licensing for Team tier, and multiple commands in one comment. |
| February 16, 2026 | Faster review pipeline, auto-apply extended to code review findings in addition to CI issues, and no re-blocking after a dismissed blocking review. |
| February 10, 2026 | "Responding to your feedback" progress status, mobile-responsive settings, insights averaged by business day, and full GitLab project paths accepted during onboarding. |
| January 29, 2026 | Label-based PR filtering, configurable merge blocking by verdict threshold, inline-comment filtering by user, `@gitar` prefix support, and structured rule recommendations. |

#### Capability timeline by theme

- **Code review**
  - December 12, 2025 — automatic code review on every PR: org-level toggle, findings by severity, custom instructions in `.gitar/review/`, and a redesigned dashboard comment.
  - January 6, 2026 — inline findings on the changed lines, PR title and description used as context, findings preserved across reviews; the PR-level `gitar code-review:on/off` commands are removed in favor of organization settings.
  - January 8, 2026 — only critical and important findings post inline; suggestions and minor issues stay in the dashboard comment.
  - January 29, 2026 — merge blocking by verdict threshold (Approved, Approved with Suggestions, Changes Requested, Blocked) and inline-comment rollout limited to selected users.
  - March 2, 2026 — Reviews tab, GitHub/GitLab thread sync, stale findings auto-resolved, high-value file prioritization on large PRs, and a "Prompt for agents" block.
  - April 24, 2026 — auto-merge after auto-approve, per-repo `approve.md` criteria, and rebuild of configuration around org and repo scopes.
  - May 11, 2026 — one-click fix application, auto-approve without criteria, and commit-SHA badges on Gitar-fixed findings.
  - August 28, 2026 — functional validation on every issue source, target-branch patterns, and review summary instructions.
  - September 17, 2026 — Risk Triage assessing the whole PR Low/Medium/High, Focused vs. Thorough review depth (Enterprise), and awareness of stacked changes on GitHub and GitLab.
  - October 16, 2026 — Cross-PR Analysis with a **cross-pr** label, auto-apply criteria, Verification badges (`Objectives 18/18`, `Rules 4/4 met`) with Cross-repo and Cross-PR grouped under **Broader impact**, and source citations beside findings that rely on external API behavior.

- **CI fixes**
  - October 2, 2025 — automatic CI failure analysis posted in the dashboard comment, updating as new commits arrive.
  - November 10, 2025 — CircleCI and Buildkite upgraded from MCP integrations to native tooling (log fetching, status checks, job retries).
  - November 18, 2025 — native Bitrise integration.
  - December 23, 2025 — enabling auto-apply on a PR with failing checks triggers immediate analysis instead of waiting for new activity.
  - March 24, 2026 — a dedicated CI retry toggle; retry now requires only that some failure be unrelated to the PR rather than all of them.
  - June 26, 2026 — PR events, comments, pushes, and accepted fixes handled immediately; only bursty machine signals such as CI-failure floods stay batched.
  - August 28, 2026 — Harness and TeamCity join Buildkite, CircleCI, and Bitrise.
  - September 17, 2026 — Jenkins build logs, stage logs, and JUnit results analyzed with no plugin required in Jenkins.
  - October 16, 2026 — Concourse and Woodpecker analysis (Woodpecker requires v3.19.0 with the GitHub forge, several servers per organization), CI recovery for every organization after a Gitar commit breaks passing CI (stops after three consecutive Gitar commits or when someone else pushes), and CodeCommit/CodeBuild/CodePipeline analysis in preview.

- **Security**
  - October 16, 2026 — Agentic Security reviews agent-skill instructions and the scripts they call together, catching dropped approval steps and leaked credentials, inspecting suspicious content without running it, and ignoring repository instructions that try to suppress the checks. Included with Enterprise; critical findings listed first in **Dashboard → Agentic Security**. Built on Sonar's OpenAI Daybreak collaboration.

- **Integrations**
  - November 26, 2025 — Linear integration.
  - December 4, 2025 — Slack integration and five built-in Linear rules.
  - December 12, 2025 — Jira over OAuth 2.0 or a personal access token, plus five built-in Jira rules.
  - August 7, 2026 — custom integrations (MCP) on Enterprise, with environment variables, org-scoped secrets, and private registries.
  - August 28, 2026 — custom integrations narrowed to an https MCP server URL with named auth headers and an allowed-tool list; Plane added; a `SKILL.md` convention introduces Skills; `.claude/rules` and `.agents/skills` join `.cursor/rules`.
  - September 17, 2026 — YouTrack Cloud and self-managed instances.
  - October 16, 2026 — saved MCP connections can be tested from settings, and the Cross-repo dashboard lists **Linked Repositories**.

- **Config and rules**
  - October 2, 2025 — natural-language repository rules as markdown files in `.gitar/rules`, able to execute actions.
  - October 22, 2025 — rule results shown in the dashboard comment, and evaluation on metadata updates to title, description, and labels.
  - November 10, 2025 — built-in rules catalog and context-aware evaluation that remembers prior results.
  - November 26, 2025 — rules evaluate on PR close or merge, and Gitar can block merges by requesting changes.
  - December 9, 2025 — commands (`gitar auto-apply:on/off`, `gitar display:verbose/compact`) that must match exactly, plus reduced comment noise.
  - January 29, 2026 — label-based PR filtering and the `@gitar` prefix.
  - March 2, 2026 — multiple commands in one comment with last-wins semantics, a PR summary toggle, and per-PR auto-apply.
  - April 7, 2026 — per-repo on-demand processing and a skip draft PRs toggle (comments on drafts still processed).
  - August 28, 2026 — `Allowed target branches` and `Excluded target branches` with names or globs such as `main` or `release/*` (the exclude list wins), and plain-language auto-merge criteria in `.gitar/config/merge.md`.
  - September 17, 2026 — `gitar-managed` label to turn automatic fixes on for one PR, restoring the configured default when removed.
  - October 16, 2026 — up to three configuration repositories, with local rules and skills taking precedence and the first selected shared repository winning on overlap.

- **Platform and code hosts**
  - September 12, 2025 — status updates via the GitHub check run.
  - September 23, 2025 — Gitar stops force pushing and rebases its own changes, so a PR is no longer frozen; one-click app install needs no account.
  - October 6, 2025 — GitLab inline comments.
  - January 29, 2026 — Sign in with GitLab.
  - March 24, 2026 — GPG-signed commits satisfy verified-commit branch protection; multiple GitHub App installations per organization.
  - April 24, 2026 — GitLab project rename handling, fork-PR pushes where the author allows edits, and bulk repo enable/disable.
  - June 26, 2026 — Azure DevOps and Bitbucket in beta, connectable from onboarding.
  - August 7, 2026 — multiple GitLab instances behind a Connections panel, with per-connection health, account, and repository count.
  - August 28, 2026 — Azure DevOps and Bitbucket out of beta; Azure DevOps Server and Bitbucket Data Center guides; GitLab self-hosted Free edition supported.
  - September 17, 2026 — Azure DevOps Server and Bitbucket Data Center generally available, and multiple Azure DevOps instances in one organization.
  - October 27, 2026 — all outbound traffic (clones, pushes, webhook registration, code host API calls) leaves from the IPv4 addresses listed under Network Access.

- **Admin and billing**
  - December 12, 2025 — audit logs for configuration changes with user attribution and timestamps.
  - January 19, 2026 — dedicated organization settings page for name and logo.
  - March 2, 2026 — per-seat licensing for Team tier, seat selection first in the upgrade flow, outside collaborators in seat management, and seats grouped into seated / active without a seat / inactive.
  - March 31, 2026 — inline price breakdowns on plan changes, annual-to-monthly switching at the next cycle, and a copyable Enterprise sales contact dialog.
  - August 7, 2026 — free Open Source plan for public repositories on github.com or gitlab.com with the full Pro feature set and no seat limits.

- **API**
  - April 24, 2026 — `GET /v1/external/gitlab/mr_status` returns `blocked: yes | no | pending` so merges can be gated by a CI job where GitLab approval-rule APIs are restricted, plus an external endpoint to onboard GitLab projects programmatically.

#### Upgrade and migration notes

Actions a customer may need to take, in date order. No Gitar release carries a version number, so these are identified by the date of the release note that announced them.

- **IPv6 allowlist removal (October 27, 2026).** Gitar now reaches code hosts over IPv4 only. Allowlists holding the IPv4 addresses from Network Access need no change; an allowlisted IPv6 range `2600:1f28:74:4000::/60` must be removed. The range stays reserved for now but will be released later.
- **Jira Cloud consent re-approval (August 28, 2026).** Jira Cloud runs through the Gitar Forge app instead of 3LO OAuth, so Gitar holds no Atlassian credential of its own. Existing installs need an admin to re-approve consent.
- **Custom integrations superseded (August 7, 2026; superseded August 28, 2026).** Instructions-only integrations, environment variables, and private package registries have been removed. A custom integration is now an https MCP server URL; for instructions with no server, use Skills instead.
- **Configuration repository rollout (August 28, 2026).** Sharing `.gitar/` skills, rules, review instructions, and agent instructions from a named repository is available on Pro and Enterprise, rolled out per organization rather than switched on globally.
- **Auto-approve behavior change (May 11, 2026).** Auto-approve no longer requires criteria. Organizations that had it enabled without criteria were previously not auto-approving; they now approve PRs automatically once code review passes. The release note explicitly asks these customers to review their settings.
- **GitLab token requirement relaxed (March 24, 2026).** That release required a service account token for GitLab installations; the restriction has since been removed and the current setup guide accepts a PAT from a dedicated user or a service account.
- **PR-level review toggle removed (January 6, 2026).** The `gitar code-review:on/off` commands are gone from the dashboard comment; code review is controlled exclusively through organization settings.
- **Navigation change (March 2, 2026).** The Insights sub-page was replaced by the Reviews tab in the dashboard.
- **No package upgrade guide exists.** The range labeled "Package Upgrade Documentation" is not a Gitar upgrade page: it is a fenced markdown example of a repository rule file, `.gitar/rules/package_upgrades.md`, embedded in the October 2, 2025 release note on Repository Rules. It documents a sample rule that comments with an upgrade-documentation link, assigns a technical lead as reviewer, and applies a "needs-documentation" label. No customer migration steps are specified for Gitar itself (not specified).


---

## Source map

Every page of <https://docs.gitar.ai> consolidated here, in document order.

| Page | Canonical URL |
| --- | --- |
| Introduction | https://docs.gitar.ai/introduction |
| Quickstart | https://docs.gitar.ai/quickstart |
| How Gitar Works | https://docs.gitar.ai/how-gitar-works |
| The Gitar Dashboard | https://docs.gitar.ai/gitar-dashboard |
| Commands & Interactions | https://docs.gitar.ai/commands |
| Labels | https://docs.gitar.ai/labels |
| Code Review | https://docs.gitar.ai/features/code-review |
| Auto-Apply | https://docs.gitar.ai/features/code-review/auto-apply |
| Auto-Approve | https://docs.gitar.ai/features/code-review/auto-approve |
| Auto-Merge | https://docs.gitar.ai/features/code-review/auto-merge |
| Block Merge | https://docs.gitar.ai/features/code-review/block-merge |
| Risk Triage | https://docs.gitar.ai/features/code-review/risk-triage |
| CI Failure Analysis | https://docs.gitar.ai/features/ci-failure-analysis |
| Agentic Security | https://docs.gitar.ai/features/agentic-security |
| Cross-Repo Analysis | https://docs.gitar.ai/features/cross-repo-analysis |
| Cross-PR Analysis | https://docs.gitar.ai/features/cross-pr-analysis |
| Functional Validation | https://docs.gitar.ai/features/functional-validation |
| Insights | https://docs.gitar.ai/features/insights |
| Repository Rules | https://docs.gitar.ai/features/rules |
| Knowledge | https://docs.gitar.ai/features/knowledge |
| Organization Settings | https://docs.gitar.ai/configuration/settings |
| Repository Customization | https://docs.gitar.ai/configuration/repository-config |
| Configuration Repository | https://docs.gitar.ai/configuration/configuration-repository |
| Signed Commits | https://docs.gitar.ai/configuration/signed-commits |
| Platform Support | https://docs.gitar.ai/connecting-code/platform-support |
| GitHub | https://docs.gitar.ai/connecting-code/github |
| GitLab | https://docs.gitar.ai/connecting-code/gitlab |
| Bitbucket | https://docs.gitar.ai/connecting-code/bitbucket |
| Bitbucket Data Center | https://docs.gitar.ai/connecting-code/bitbucket-data-center |
| Azure DevOps | https://docs.gitar.ai/connecting-code/azure-devops |
| Azure DevOps Server | https://docs.gitar.ai/connecting-code/azure-devops-server |
| AWS CodeCommit | https://docs.gitar.ai/connecting-code/aws-codecommit |
| Network Access | https://docs.gitar.ai/connecting-code/network-access |
| Buildkite | https://docs.gitar.ai/connecting-ci/buildkite |
| CircleCI | https://docs.gitar.ai/connecting-ci/circleci |
| Bitrise | https://docs.gitar.ai/connecting-ci/bitrise |
| Harness | https://docs.gitar.ai/connecting-ci/harness |
| Concourse | https://docs.gitar.ai/connecting-ci/concourse |
| Jenkins | https://docs.gitar.ai/connecting-ci/jenkins |
| TeamCity | https://docs.gitar.ai/connecting-ci/teamcity |
| Woodpecker | https://docs.gitar.ai/connecting-ci/woodpecker |
| Custom Integrations (MCP) | https://docs.gitar.ai/integrations/custom-integrations |
| Skills | https://docs.gitar.ai/integrations/skills |
| Jira | https://docs.gitar.ai/integrations/jira |
| Linear | https://docs.gitar.ai/integrations/linear |
| Plane | https://docs.gitar.ai/integrations/plane |
| YouTrack | https://docs.gitar.ai/integrations/youtrack |
| Slack | https://docs.gitar.ai/integrations/slack |
| SSO | https://docs.gitar.ai/administration/sso |
| Security | https://docs.gitar.ai/administration/security |
| Members & Seats | https://docs.gitar.ai/administration/members |
| Bring Your Own Model | https://docs.gitar.ai/administration/bring-your-own-model |
| Audit Logs | https://docs.gitar.ai/administration/audit-logs |
| Plans | https://docs.gitar.ai/account-billing/plans |
| Managing Your Subscription | https://docs.gitar.ai/account-billing/managing-subscription |
| API Reference Overview | https://docs.gitar.ai/api-reference/overview |
| FAQ | https://docs.gitar.ai/resources/faq |
| Release Notes | https://docs.gitar.ai/release-notes |

## About this compilation

**What was read.** The full Gitar documentation corpus — 62 pages — retrieved from the site's
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
