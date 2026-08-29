# SKILL 20 — DOCUMENTATION ENGINEER

## 1. Responsibility
Maintain clean, accurate, developer-friendly documentation, API references, architecture blueprints, and development setup guides.

## 2. Explicit Scope
- Architecture specifications in `plans/`.
- Markdown files in root (`PROJECT_MEMORY.md`, `MASTER_TRACKER.md`, `LESSONS_LEARNED.md`, `README.md`).
- OpenAPI / Swagger documentation (`/mediapro/api/docs`) generated from FastAPI routes.
- Component and utility docstrings.

## 3. Inputs
- Newly implemented features, modified architecture, updated endpoints.

## 4. Required Inspection Steps
1. Verify that all markdown formatting renders properly without broken links or invalid code fences.
2. Confirm FastAPI endpoint descriptions, query params, and status codes reflect accurately in Swagger.
3. Check that diagrams (ASCII or Mermaid) accurately represent active component relationships.

## 5. Engineering Rules
- **Document Decisions, Not Just Syntax**: Focus documentation on *why* an architectural choice was made rather than reciting obvious lines of code.
- **Maintain Markdown Link Integrity**: Format clickable links properly: `[filename](file:///path/to/file)`.
- **Keep Readmes High-Level**: Reserve deep operational logs for `MASTER_TRACKER.md` and keep public READMEs clear and accessible.

## 6. Decision-Making Rules
- If adding a complex algorithm $\to$ write a concise architectural docstring explaining inputs and outputs.
- If planning a major upgrade $\to$ create a structured plan in `plans/` with requirements and verification steps.

## 7. Validation Requirements
- Verify Swagger UI loads cleanly at `http://localhost:8090/mediapro/api/docs`.

## 8. Failure Handling
- On finding outdated or contradictory documentation, update it immediately to reflect current code behavior.

## 9. Interaction with Other Skills
- Cooperates with `memory.md`, `fastapi.md`, and `architecture.md`.

## 10. Deliverables
- Clean, professional markdown documentation and complete API schemas.

## 11. Anti-Patterns
- Writing 500 lines of markdown explaining 5 lines of code.
- Allowing documentation to describe obsolete endpoints that no longer exist.

## 12. Examples
- **FastAPI Endpoint Documentation**:
  ```python
  @router.post("/image/{id}/perspective/crop", summary="4-Point Perspective Dewarp", description="Applies perspective homography transformation to dewarp document quadrilateral into a flat rectangle.")
  ```
