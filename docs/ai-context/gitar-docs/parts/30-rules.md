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

```bash theme={null}
mkdir -p .gitar/rules
```

```markdown theme={null}
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

```bash theme={null}
git add .gitar/rules/
git commit -m "Add security review rule"
git push
```

Gitar evaluates the rules on every PR. Verification in the dashboard comment shows check results and recorded actions; when no rule applies, the comment reports how many were skipped, and `gitar display:verbose` explains why each was skipped.

#### Rule file syntax

A rule is Markdown with YAML frontmatter. The body carries the detailed instructions: specific examples, edge cases, and extra context.

```markdown theme={null}
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

```markdown theme={null}
actions: "Post a comment summarizing the database schema changes"
```

```markdown theme={null}
actions: "Add 'needs-docs' label if README is modified"
```

```markdown theme={null}
actions: "Assign @backend-team for API changes"
```

```markdown theme={null}
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

```markdown theme={null}
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

```markdown theme={null}
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

```markdown theme={null}
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

```markdown theme={null}
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
