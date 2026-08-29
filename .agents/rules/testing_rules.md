# 🛡️ MediaPro Verification & Testing Rules (Strict Command-Line Only)

### ⚠️ CRITICAL MANDATE: STRICTLY COMMAND-LINE VERIFICATION ONLY
- **NEVER use browser subagents or GUI browser tools (`open_browser_url`, Playwright).**
- **ALL verification, smoke testing, endpoint testing, UI asset testing, and end-to-end processing verification MUST be performed EXCLUSIVELY using command line tools (`run_command`) with Python scripts, cURL, or Docker commands.**

---

### Command-Line Verification Protocol

1. **Routing & Static Asset Checks**:
   - Verify HTTP 200 responses on `/`, `/mediapro/`, `/mediapro/index.html`, `/mediapro/assets/*.js`, and `/mediapro/assets/*.css` using `python` / `urllib.request`.
   - Verify that all redirects preserve `$http_host` (port 8090).

2. **Backend API & Processing Checks**:
   - Execute end-to-end lifecycle scripts:
     1. Upload image/video via `multipart/form-data`.
     2. Dispatch transformation / crop / filter / perspective crop / AI tasks.
     3. Poll `/mediapro/api/image/batch/status` or task status endpoint.
     4. Verify output file existence, HTTP downloadability, and dimensions.

3. **Frontend Compilation & Syntax Integrity**:
   - Verify bracket/syntax balance on all modified `.jsx` / `.js` files.
   - Verify clean build output with `docker compose build proxy` or `npm run build`.