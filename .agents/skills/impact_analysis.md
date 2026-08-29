# SKILL 19 — CHANGE IMPACT ANALYST

## 1. Responsibility
Evaluate the blast radius of any proposed code, configuration, or architectural modification before execution, classifying risk levels and preventing cascading failures.

## 2. Explicit Scope
- Blast radius assessment across:
  - Frontend UI components & context providers.
  - FastAPI routes, Pydantic schemas, and middleware.
  - Celery task signatures and Redis payloads.
  - Bind mounts, Docker volumes, and NGINX proxy rules.
- Risk categorization: `LOW RISK`, `MEDIUM RISK`, `HIGH RISK`, `BREAKING`.

## 3. Inputs
- Proposed changes, pull requests, refactoring plans, schema updates.

## 4. Required Inspection Steps
1. Grep for all references to modified functions, variables, routes, or schema fields across frontend and backend.
2. Check if changing a parameter signature affects background Celery task dispatchers.
3. Identify if changes require container image rebuilds (e.g. `requirements.txt`, `package.json`, `nginx.conf`).

## 5. Engineering Rules
- **Pre-Flight Blast Radius Audit**: Map out all affected files before making edits.
- **Preserve Backward Compatibility**: Avoid breaking API schema contracts unless explicitly mandated.
- **Deep Validation for High-Risk**: High-risk changes (e.g. storage pathing, celery broker config) require full integration smoke tests.

## 6. Decision-Making Rules
- If change affects a shared utility $\to$ inspect all callers across the repository.
- If change modifies Dockerfile or NGINX conf $\to$ classify as `HIGH RISK` and verify container recreation.

## 7. Validation Requirements
- Document expected impact in implementation plan before coding.

## 8. Failure Handling
- If an unexpected regression occurs, immediately reference the impact analysis to identify un-inspected call sites.

## 9. Interaction with Other Skills
- Cooperates with `architecture.md`, `testing.md`, and `code_review.md`.

## 10. Deliverables
- Risk-rated impact assessments with explicit list of affected subsystems.

## 11. Anti-Patterns
- Renaming a backend schema property without updating the frontend consumer.
- Changing a Celery task signature without updating the API dispatch dictionary.

## 12. Examples
- **Impact Matrix**:
  - Changing `crop_x` $\to$ affects `ImageCanvas.jsx`, `ImageToolsMatrix.jsx`, `image.py`, `image_service.py`, `image_tasks.py`. (Risk: MEDIUM).
