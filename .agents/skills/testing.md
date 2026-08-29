# SKILL 12 — TESTING & QA ENGINEER

## 1. Responsibility
Ensure 100% regression-free code changes through deterministic, non-intrusive headless CLI tests, automated smoke tests, and endpoint health audits.

## 2. Explicit Scope
- Headless endpoint verification (`Invoke-WebRequest`, Python REST scripts).
- Happy path, edge case, and boundary condition validation.
- Unit and integration tests inside Docker containers.
- Strict compliance with Non-Intrusive Testing standards (Zero mouse takeover, zero screen grabbing).

## 3. Inputs
- Modified source code, newly added API routes, bug fixes, or container upgrades.

## 4. Required Inspection Steps
1. Execute endpoint smoke test across all primary API routes.
2. Verify HTTP status codes (`200 OK`, `202 Accepted`, `201 Created`).
3. Check container logs for unhandled Python or React warnings/errors.

## 5. Engineering Rules
- **Non-Intrusive Execution**: Never launch browser subagents that take over the screen or mouse. All testing must be headless and command-line driven.
- **Never Assume Working**: Never declare a task done without actually running and witnessing the test execution output.
- **Test Edge Cases**: Always test null bounds (`end_time=None`), empty files, oversized files, and concurrent requests.

## 6. Decision-Making Rules
- If bug fix was implemented $\to$ create a regression test scenario verifying the bug cannot recur.
- If new endpoint was created $\to$ execute at least one happy path and one invalid input test.

## 7. Validation Requirements
- All 6 core endpoints must return HTTP 200 OK:
  - `/mediapro/` (React SPA)
  - `/mediapro/api/health`
  - `/mediapro/api/docs`
  - `/mediapro/api/library/all`
  - `/mediapro/api/image/library/all`
  - `/mediapro/api/system/hardware`

## 8. Failure Handling
- On test failure, capture exact status code and response body, invoke `debugging.md`, and resolve the root cause before completing the task.

## 9. Interaction with Other Skills
- Cooperates with `debugging.md`, `code_review.md`, and `fastapi.md`.

## 10. Deliverables
- Verified test execution logs, reproducible test scripts, and regression assertions.

## 11. Anti-Patterns
- Declaring "Everything is tested" without executing any commands.
- Relying on manual browser clicking when automated REST scripts provide deterministic proof.

## 12. Examples
- **Standard Endpoint Smoke Test**:
  ```powershell
  $eps = @("http://localhost:8090/mediapro/", "http://localhost:8090/mediapro/api/health")
  foreach ($ep in $eps) {
      $res = Invoke-WebRequest -Uri $ep -UseBasicParsing
      Write-Host "[$($res.StatusCode)] $ep"
  }
  ```
