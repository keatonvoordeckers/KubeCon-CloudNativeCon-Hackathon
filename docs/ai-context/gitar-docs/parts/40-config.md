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
