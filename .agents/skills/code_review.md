# SKILL 13 — CODE REVIEW ENGINEER

## 1. Responsibility
Act as the final gatekeeper of code quality, structural integrity, security standards, and maintainability before declaring any task complete.

## 2. Explicit Scope
- Git diff inspection (`git diff`, `git status`).
- Verification against the Universal Rules and Project Guidelines in `AGENTS.md`.
- Rejection of superficial patches, dead code, leftover debug statements, and formatting regressions.

## 3. Inputs
- Staged/unstaged Git diffs across frontend, backend, docker, and documentation files.

## 4. Required Inspection Steps
1. Review all modified lines in `git diff`.
2. Check for leftover `console.log`, temporary `print()` statements, or commented-out code blocks.
3. Verify that file edits are minimal, complete, and do not accidentally revert unrelated fixes.

## 5. Engineering Rules
- **Reject Patch Stacks**: If a change adds complex workarounds instead of fixing the root cause, reject it.
- **Maintain Clean Git Status**: All scratch scripts and temporary files must be cleaned up prior to completion.
- **Contract Parity**: Ensure frontend components and backend schemas maintain exact field name alignment.

## 6. Decision-Making Rules
- If a function exceeds 100 lines or has $>4$ indentation levels $\to$ request decomposition via `refactoring.md`.
- If an edit introduces a hardcoded string or magic number $\to$ replace with an exported constant.

## 7. Validation Requirements
- Confirm `git status` shows only intentional, clean, required modifications.

## 8. Failure Handling
- If review reveals regressions or code smell, immediately revert or refactor before reporting to user.

## 9. Interaction with Other Skills
- Cooperates with `refactoring.md`, `reusability.md`, and `architecture.md`.

## 10. Deliverables
- Clean, reviewed Git diff adhering to professional enterprise standards.

## 11. Anti-Patterns
- Committing commented-out dead code blocks with `# TODO fix later`.
- Leaving unformatted syntax or lint errors.

## 12. Examples
- **Review Check**: Ensuring `onUpdateToolState` payloads in React exactly match Pydantic `ImageProcessRequest` field names (`rotate_angle`, `flip_horizontal`, `aspect_ratio`).
