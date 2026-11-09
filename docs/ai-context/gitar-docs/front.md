# Gitar (by Sonar) — Complete Documentation Reference

> Consolidated, agent-readable reference for **Gitar**, Sonar's AI code-review agent that reviews pull requests *and pushes the fixes*. Compiled from every page of <https://docs.gitar.ai> (62 pages, full corpus pulled 2025-11-09 via the site's `llms-full.txt`).
>
> **Why this file exists:** the original docs are scattered across 62 pages with heavy cross-linking and repetition. This file keeps every operational fact — commands, labels, settings, file paths, config keys, API endpoints, CI snippets, limits — in one place, ordered so an agent can jump straight to the section it needs.

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

