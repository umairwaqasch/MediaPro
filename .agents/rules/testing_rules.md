# Testing Rules: Headless & Command-Line Only

## Core Rules

### 1. Zero Mouse Takeover
- NEVER spawn interactive browser sessions that move the user cursor or grab window focus.
- NEVER use browser_subagent for any testing or health verification.

### 2. CLI & Headless Testing Only
- Use curl.exe, PowerShell (Invoke-RestMethod), docker logs, docker exec, and headless API calls for all testing.
- Use docker exec to run Python or bash checks inside containers.

### 3. Reproducible Test Scripts
- Write automated diagnostic curl/PowerShell scripts to verify:
  - Frontend SPA bundle (Nginx serving the React app at /mediapro)
  - API endpoints (health, hardware, telemetry, library, video/image ops)
  - Celery worker job dispatch and task status
  - Nginx proxy routing and redirect rules

### 4. Smoke Test Suite (Run After Every Rebuild)
Run the following minimum checks after any Docker image rebuild:

  curl.exe -s http://localhost:8090/mediapro/api/health
  curl.exe -s http://localhost:8090/mediapro/api/system/hardware
  curl.exe -s http://localhost:8090/mediapro/api/system/telemetry
  curl.exe -s http://localhost:8090/mediapro/api/library/all
  curl.exe -o /dev/null -w "%{http_code}" http://localhost:8090/mediapro

All must return HTTP 200. API endpoints must return valid JSON.

### 5. Error Verification
- Always check docker logs (docker logs mediapro-api --tail 30) after a restart.
- Confirm no ImportError, ModuleNotFoundError, or startup exceptions before calling an endpoint green.
