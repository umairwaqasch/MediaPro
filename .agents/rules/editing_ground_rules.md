# 🛡️ MediaPro Industrial Engineering & Editing Ground Rules

To ensure 100% platform uptime, zero regressions, and lightning-fast developer iteration, all code modifications, UI enhancements, and system changes in MediaPro must adhere strictly to these rules.

---

### Rule 0: STRICT COMMAND-LINE VERIFICATION ONLY (NO BROWSER TOOLS)
1. **NEVER attempt to launch or use browser subagents or GUI browser tools (`open_browser_url`, Playwright).**
2. **ALL verifications must be executed via CLI scripts (`run_command` with Python, cURL, or Docker).**

---

### Rule 1: Deterministic Routing & Port Preservation (Port 8090)
1. The workstation runs on host port **`8090`** mapped to the Nginx reverse proxy.
2. Nginx configuration MUST use `$scheme://$http_host/mediapro/` for root redirects to ensure the host port (8090) is NEVER dropped during 301/302 redirects.
3. All static assets, API endpoints, and WebSocket/SSE streams MUST remain namespaced under `/mediapro/` and `/mediapro/api/`.

---

### Rule 2: Syntax & Structural Verification Before Container Deployment
1. **AST & Syntax Validation**: Prior to rebuilding containers, every modified `.jsx`, `.js`, and `.py` file must be programmatically verified for:
   - Bracket, parenthesis, and brace balance.
   - Import correctness (no missing named or default exports).
   - Clean UTF-8 encoding without BOM headers (`System.Text.UTF8Encoding $false`).
2. **Build Gate**: Frontend bundles must compile cleanly with `npm run build` without unresolved module errors.

---

### Rule 3: Defensive Frontend State & Error Boundaries
1. **Null-Safety First**: Every image property access must use optional chaining and fallback defaults (e.g. `activeImage?.width || 1920`, `activeImage?.image_id || activeImage?.id`).
2. **Dual-Key Status Handling**: Polling logic for Celery tasks must check both `status` and `state` (`t?.status === 'SUCCESS' || t?.state === 'SUCCESS'`) to guarantee immediate result staging.
3. **Local Blob Protection**: Newly uploaded or processed images must retain their local preview blob URL until backend processing completes, preventing blank screen flashes.

---

### Rule 4: Non-Blocking FastAPI Async Concurrency
1. **Zero Event Loop Starvation**: Endpoints performing disk I/O, Pillow manipulations, or OpenCV computations must NOT block the main asyncio event loop. They must either be standard synchronous `def` or use `loop.run_in_executor(threadpool, ...)`.
2. **Multi-Worker Concurrency**: The backend API container runs with `--workers 4` to handle uploads, status queries, and thumbnail generation in parallel without queuing.

---

### Rule 5: Automated Smoke Testing Before Handoff
1. Every change must be verified with an automated Python smoke script testing:
   - HTTP 200 on `/` and `/mediapro/`.
   - Asset loading for JS and CSS.
   - End-to-end API execution (Upload -> Process -> Retrieve).
2. The tracker log (`MASTER_TRACKER.md`) must record the root cause and audit resolution.