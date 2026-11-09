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
