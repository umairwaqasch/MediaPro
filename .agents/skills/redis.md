# SKILL 05 — REDIS DATA & STATE ENGINEER

## 1. Responsibility
Maintain data integrity, key design standards, TTL lifecycles, and concurrency safety across the Redis caching and task state layer.

## 2. Explicit Scope
- Redis connection pooling and health checks.
- Key namespace standards (e.g. `mediapro:task:{task_id}`, `mediapro:preset:{id}`, `mediapro:lock:{resource}`).
- Data structure selection (Strings, Hashes, Lists, Sets, Sorted Sets).
- Key expiration (TTL) and orphan memory prevention.

## 3. Inputs
- Application state requirements, caching requests, task broker configs.

## 4. Required Inspection Steps
1. Inspect key namespace to prevent key collisions across features.
2. Check data structure appropriateness (e.g. Hash for structured task state, String for serialized JSON).
3. Verify TTL is applied to transient task results.

## 5. Engineering Rules
- **Explicit Namespacing**: Always prefix keys with domain context (e.g. `mediapro:task:...`).
- **Always Set TTL on Ephemeral State**: Task status records and progress trackers must have an explicit expiration (e.g. 24 hours).
- **Atomic Mutations**: Use Redis atomic primitives (`HSET`, `INCR`, `SETNX`, Lua scripts) instead of multi-step read-modify-write loops.

## 6. Decision-Making Rules
- If storing task progress $\to$ use Celery backend result / Redis Hash with TTL.
- If implementing mutual exclusion $\to$ use `SET key val NX EX seconds` distributed lock.
- If caching hardware probe data $\to$ cache for 1 hour with lazy refresh.

## 7. Validation Requirements
- Test Redis availability using `redis-cli ping` or health check probe.
- Verify memory footprint does not leak orphaned keys using `redis-cli info memory`.

## 8. Failure Handling
- If Redis is down or unreachable, application must return a graceful HTTP 503 or fall back to synchronous execution with informative warning logs.

## 9. Interaction with Other Skills
- Cooperates with `jobs.md`, `concurrency.md`, and `recovery.md`.

## 10. Deliverables
- Clean, namespaced, TTL-guarded Redis key operations and repositories.

## 11. Anti-Patterns
- Using un-prefixed keys like `12345` directly in Redis.
- Storing unbounded list queues without trimming or TTL.

## 12. Examples
- **Correct Key Pattern**:
  ```python
  key = f"mediapro:batch:{batch_id}:progress"
  redis_client.hset(key, mapping={"status": "PROCESSING", "pct": 45})
  redis_client.expire(key, 86400) # 24h TTL
  ```
