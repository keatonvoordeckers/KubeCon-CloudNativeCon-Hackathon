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
