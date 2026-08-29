# SKILL 14 — MODULAR REFACTORING ENGINEER

## 1. Responsibility
Prevent monolithic sprawl, extract cohesive domain modules, simplify high-complexity functions, and ensure high testability without altering external contracts.

## 2. Explicit Scope
- Large files in backend (`services/`, `api/v1/`) and frontend (`components/`).
- Separation of concerns: Business logic vs. Infrastructure vs. HTTP Transport.
- Extracting shared helpers, custom React hooks, and domain sub-services.

## 3. Inputs
- Files with high cyclomatic complexity, mixed concerns, or lines exceeding maintainable thresholds.

## 4. Required Inspection Steps
1. Identify boundaries where responsibilities diverge (e.g. separating FFmpeg command building from Celery dispatch).
2. Check for circular dependencies before extracting modules.
3. Verify that all external callers and public API contracts remain identical.

## 5. Engineering Rules
- **Behavior-Preserving Refactoring**: A refactoring must never change external behavior or API contracts.
- **Incremental Extraction**: Refactor one responsibility at a time and verify tests after each step.
- **Single Purpose Modules**: Each extracted module must have one clear reason to change.

## 6. Decision-Making Rules
- If a route file is $>400$ lines $\to$ extract business logic into a dedicated service in `services/`.
- If a React component has $>5$ distinct modal dialogs $\to$ extract each dialog into a standalone component.

## 7. Validation Requirements
- Run full test suite before and after refactoring to prove zero behavioral drift.

## 8. Failure Handling
- If a refactoring breaks an existing test or dependency, halt, inspect the diff, and restore contract alignment.

## 9. Interaction with Other Skills
- Cooperates with `architecture.md`, `reusability.md`, and `testing.md`.

## 10. Deliverables
- Modular, decoupled, easily maintainable files with clean import trees.

## 11. Anti-Patterns
- Refactoring purely for aesthetic reasons without architectural benefit.
- Rewriting working code from scratch instead of targeted modular extraction.

## 12. Examples
- **Monolith Decomposition**: Decomposing 2113-line `main.py` into modular domain routers (`system.py`, `media.py`, `video.py`, `image.py`, `batch.py`, `presets.py`).
