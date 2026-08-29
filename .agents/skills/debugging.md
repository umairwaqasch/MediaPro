# SKILL 02 — ROOT CAUSE DEBUGGER

## 1. Responsibility
Systematically diagnose errors, crashes, and unexpected behaviors to their ultimate origin, eliminating patch-stacking and temporary workarounds.

## 2. Explicit Scope
- Investigation of stack traces, container logs (`docker logs mediapro-api / mediapro-worker`), browser exceptions, and HTTP status codes.
- State verification across Redis, memory variables, and file descriptors.
- Formulation and verification of the root-cause hypothesis.

## 3. Inputs
- Exception stack trace, error log snippet, or unexpected behavioral report.
- Reproducible steps or test scenario.

## 4. Required Inspection Steps
$$\text{Symptom} \to \text{Reproduction} \to \text{Evidence/Logs} \to \text{Execution Trace} \to \text{Incorrect State} \to \text{Origin of State} \to \text{Root Cause}$$
1. Inspect container logs: `docker logs mediapro-api` or `docker logs mediapro-worker`.
2. Trace the exact parameters passed into the failing function.
3. Check variable lifecycle and scoping (e.g. TDZ in frontend, null references in backend).

## 5. Engineering Rules
- **No Symptom-Only Patches**: Never wrap a line in `try...except: pass` or `if (val) { ... }` without knowing why `val` was invalid.
- **Evidence-First**: Prove the root cause with code trace or log assertion before making any file edits.
- **Single Source of Fix**: Fix the bug at the origin of the invalid state, not at downstream consumption points.

## 6. Decision-Making Rules
- If the bug is caused by variable initialization order $\to$ correct declaration order at the top level.
- If the bug is caused by missing dictionary keys $\to$ enforce schema validation at entry.
- If the bug is caused by Celery/Redis payload mismatch $\to$ align Pydantic model with task kwargs.

## 7. Validation Requirements
- Re-run the exact failing test case and verify it passes.
- Run the full smoke test suite to guarantee zero regression.

## 8. Failure Handling
- If initial fix does not resolve the issue, re-trace execution path from the HTTP request ingress.

## 9. Interaction with Other Skills
- Cooperates with `testing.md`, `self_learning.md`, `fastapi.md`, and `ffmpeg.md`.

## 10. Deliverables
- Permanent root-cause bug fix.
- New entry in `LESSONS_LEARNED.md` explaining Problem, Root Cause, Incorrect Approach, Correct Solution, and Prevention.

## 11. Anti-Patterns
- Adding `try: ... except Exception: return None` to mask a deeper exception.
- Adding arbitrary `setTimeout` or `sleep()` delays to avoid race conditions.

## 12. Examples
- **Bug**: `ReferenceError: Cannot access 'se' before initialization`.
- **Root Cause**: `isTransformTab` was referenced in `isCropActive` before `const isTransformTab = activeTab === 'transforms'` was declared.
- **Fix**: Re-ordered derived state declarations above dependent expressions.
