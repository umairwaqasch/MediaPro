# ⚡ AGENT BOOT SEQUENCE & SKILL ROUTER

> **Mandatory Startup Sequence**: Run before performing any engineering task in this repository.

---

## 1. Load Mandatory Project Context

Read the following core memory registries before inspecting or modifying code:
- [`PROJECT_MEMORY.md`](../PROJECT_MEMORY.md) — System Topology, Router Layout, Endpoints, Benchmarks & Flow.
- [`LESSONS_LEARNED.md`](../LESSONS_LEARNED.md) — Historical Root Causes, Failed Anti-Patterns & Engineering Lessons.

---

## 2. Dynamic Skill Selector & Routing Matrix

Do not load all skills simultaneously. Select the required **Engineering Skills** based on the task domain:

| Task Type | Tier-1 Primary Skills | Tier-2 Supporting Skills |
| :--- | :--- | :--- |
| **Bug Fix / Crash / Error** | `debugging.md`, `impact_analysis.md` | `testing.md`, `self_learning.md` |
| **New API Endpoint / Route** | `fastapi.md`, `architecture.md` | `security.md`, `testing.md`, `documentation.md` |
| **FFmpeg Filter / Codec / Transcode** | `ffmpeg.md`, `storage.md` | `performance.md`, `testing.md`, `recovery.md` |
| **Redis / Queue / Worker Job** | `redis.md`, `jobs.md`, `concurrency.md` | `recovery.md`, `testing.md` |
| **Refactoring / File Cleanup** | `architecture.md`, `refactoring.md` | `reusability.md`, `impact_analysis.md` |
| **Docker / NGINX / Proxy Configuration** | `docker.md`, `nginx.md` | `security.md`, `testing.md` |
| **Performance Optimization** | `performance.md`, `concurrency.md` | `ffmpeg.md`, `redis.md` |

---

## 3. Pre-Flight Five Questions

Do not write code until you can explicitly answer:
1. **Ownership**: What component / module owns this functionality?
2. **Root Problem**: What is the root cause or exact requirement?
3. **Reusability**: What existing code / service can be reused?
4. **Blast Radius**: What could this change break across API, Celery, or Frontend?
5. **Verification**: How will this solution be headlessly and deterministically tested?

---

## 4. Engineering Priority Order

When constraints conflict, enforce this absolute hierarchy:
$$\text{Security} > \text{Data Integrity} > \text{Correctness} > \text{Reliability} > \text{Architecture} > \text{Maintainability} > \text{Performance} > \text{Convenience}$$

---

## 5. Post-Task Wrap-Up

1. **Verify**: Run headless CLI / REST smoke tests and inspect container logs.
2. **Update Memory**: If architecture or conventions changed, update `PROJECT_MEMORY.md`.
3. **Record Lesson**: If a bug, mistake, or architectural insight was discovered, record it in `LESSONS_LEARNED.md`.
4. **Log Audit**: Record milestone audit in `MASTER_TRACKER.md`.
