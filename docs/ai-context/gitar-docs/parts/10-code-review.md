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
