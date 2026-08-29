# SKILL 09 — NGINX PROXY ENGINEER

## 1. Responsibility
Maintain the reverse proxy configuration, HTTP routing, client request size thresholds, timeout configurations, static asset caching, and SPA fallback routing.

## 2. Explicit Scope
- `frontend/nginx.conf` reverse proxy routing.
- Upstream proxying: `/mediapro/api/` $\to$ `http://mediapro-api:8000/mediapro/api/`.
- Frontend SPA routing: `try_files $uri $uri/ /mediapro/index.html`.
- Large file streaming, SSE buffering (`proxy_buffering off`), and client max body size (`client_max_body_size 4096M`).

## 3. Inputs
- `frontend/nginx.conf`, route changes, upload file size limits, SSE requirements.

## 4. Required Inspection Steps
1. Verify `proxy_pass` points to container hostname on `mediapro-net` (`http://api:8000` or `http://mediapro-api:8000`).
2. Check `client_max_body_size` allows multi-gigabyte video uploads (e.g. 4GB).
3. Verify proxy timeouts for long-running stream connections.

## 5. Engineering Rules
- **No Masking App Bugs in Nginx**: Never use NGINX rewrite rules to hide backend route bugs.
- **Support Range Requests**: Ensure `proxy_force_ranges on` or standard header forwarding (`Range`, `If-Range`) for smooth HTML5 video scrubbing.
- **SSE Real-Time Streaming**: Set `proxy_buffering off; proxy_cache off;` for SSE endpoints (`/batch/events`).

## 6. Decision-Making Rules
- If client upload fails with `413 Request Entity Too Large` $\to$ increase `client_max_body_size` in `nginx.conf`.
- If video seek fails in Safari/Chrome $\to$ verify byte-range headers in upstream proxy responses.

## 7. Validation Requirements
- Rebuild and reload proxy: `docker compose build --no-cache proxy; docker compose up -d proxy`.
- Verify `GET http://localhost:8090/mediapro/` loads SPA index and `/mediapro/api/health` forwards cleanly.

## 8. Failure Handling
- On NGINX config error, test syntax inside container: `docker exec mediapro-proxy nginx -t`.

## 9. Interaction with Other Skills
- Cooperates with `docker.md`, `fastapi.md`, and `security.md`.

## 10. Deliverables
- Clean, performant `nginx.conf` supporting multi-gigabyte video uploads, byte-range video streaming, and SPA routing.

## 11. Anti-Patterns
- Default 1MB `client_max_body_size` blocking media uploads.
- Hardcoding `localhost:8000` inside Docker Nginx instead of Docker DNS service name `api:8000`.

## 12. Examples
- **Correct Upstream Proxy Block**:
  ```nginx
  location /mediapro/api/ {
      proxy_pass http://api:8000;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_buffering off;
      proxy_read_timeout 300s;
      client_max_body_size 4096M;
  }
  ```
