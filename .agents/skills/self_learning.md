# SKILL 21 — AGENT SELF-LEARNING ENGINEER

## 1. Responsibility
Ensure the AI pair programmer continuously learns from every bug, unexpected build failure, model misconception, and user correction, systematically preventing mistake recurrence.

## 2. Explicit Scope
- Post-incident reflection and error taxonomy.
- Recording actionable engineering lessons in [`LESSONS_LEARNED.md`](../../LESSONS_LEARNED.md).
- Updating project rules and ground constraints in `.agents/rules/` and `AGENTS.md`.

## 3. Inputs
- Runtime exceptions, unexpected container crashes, build failures, user corrections, lint errors.

## 4. Required Inspection Steps
1. Upon encountering an unexpected failure, ask:
   - *Did I misunderstand the architecture?*
   - *Did I fail to inspect an existing component?*
   - *Did I introduce a temporal dead zone or variable scoping bug?*
   - *Did I apply a superficial patch instead of a root cause fix?*
2. Identify the fundamental engineering flaw that permitted the error.
3. Formulate a concrete prevention rule.

## 5. Engineering Rules
- **No Repeated Mistakes**: The same failure mode must never be repeated once documented in `LESSONS_LEARNED.md`.
- **Mandatory Self-Learning Log**: Every resolved bug must produce an entry with: Problem, Root Cause, Incorrect Approach, Correct Solution, Prevention, General Lesson.
- **Continuous Rule Refinement**: If a mistake highlights an ambiguity in project rules, proactively update `AGENTS.md` or `.agents/rules/`.

## 6. Decision-Making Rules
- If an error was caused by a frontend build issue $\to$ document minification/bundling lesson.
- If an error was caused by an FFmpeg parameter $\to$ document filtergraph/codec lesson.

## 7. Validation Requirements
- Verify that `LESSONS_LEARNED.md` contains structured, actionable entries.

## 8. Failure Handling
- If a known mistake is repeated, immediately pause, re-read the lesson, and re-implement correctly from first principles.

## 9. Interaction with Other Skills
- Cooperates with `debugging.md`, `memory.md`, and `code_review.md`.

## 10. Deliverables
- Enriched `LESSONS_LEARNED.md` registry and hardened agent operational protocols.

## 11. Anti-Patterns
- Dismissing an error as "just a typo" without analyzing why it was introduced.
- Failing to document lessons learned after complex debugging sessions.

## 12. Examples
- **Lesson Structure in `LESSONS_LEARNED.md`**:
  ```markdown
  ## Lesson 01: JavaScript Temporal Dead Zone (TDZ) in Minified React Builds
  - Problem: ReferenceError: Cannot access 'se' before initialization
  - Root Cause: Variable accessed before declaration in component body.
  - Incorrect Approach: Patching locally at usage site.
  - Correct Solution: Strict top-to-bottom declaration ordering.
  - Prevention: Declare all derived flags immediately after React hooks.
  - General Lesson: Always ensure strict declaration ordering in React.
  ```
