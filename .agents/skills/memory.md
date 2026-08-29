# SKILL 18 — PROJECT MEMORY MANAGER

## 1. Responsibility
Maintain, synchronize, and update the repository's long-term memory registries, preventing context loss, architectural drift, and repetition of known mistakes.

## 2. Explicit Scope
- [`PROJECT_MEMORY.md`](../../PROJECT_MEMORY.md) — System Topology, Endpoints, Component Inventories, Benchmarks.
- [`MASTER_TRACKER.md`](../../MASTER_TRACKER.md) — Milestone Audits, Feature Verification Tables, Open Issues.
- [`LESSONS_LEARNED.md`](../../LESSONS_LEARNED.md) — Problem / Root Cause / Solution Registry.

## 3. Inputs
- Completed feature implementations, architectural modifications, newly discovered bugs, resolved audits.

## 4. Required Inspection Steps
1. Before starting a task: Read `PROJECT_MEMORY.md` and `LESSONS_LEARNED.md`.
2. After finishing a task: Check if API contracts, schemas, ports, or conventions changed.
3. Verify that all documentation references point to valid, existing file paths.

## 5. Engineering Rules
- **Keep Memory Fresh**: Never allow `PROJECT_MEMORY.md` or `MASTER_TRACKER.md` to fall out of sync with actual code.
- **Log Every Major Audit**: Document deliverables and verification results with audit numbering (#1, #2... #79).
- **Concise & Actionable**: Write clear, dense, technical summaries rather than verbose conversational text.

## 6. Decision-Making Rules
- If a new endpoint is added $\to$ add to API Reference table in `PROJECT_MEMORY.md`.
- If an architectural bug was resolved $\to$ record entry in `LESSONS_LEARNED.md`.
- If a major milestone is reached $\to$ append Audit entry to `MASTER_TRACKER.md`.

## 7. Validation Requirements
- Confirm all markdown links and paths in memory files resolve to real workspace files.

## 8. Failure Handling
- If memory files contain conflicting information, inspect the active codebase to establish ground truth and harmonize the documentation.

## 9. Interaction with Other Skills
- Cooperates with `self_learning.md`, `documentation.md`, and `architecture.md`.

## 10. Deliverables
- Up-to-date, authoritative project memory and audit records.

## 11. Anti-Patterns
- Modifying core application architecture without recording the change in `PROJECT_MEMORY.md`.
- Omitting root-cause explanations from `LESSONS_LEARNED.md`.

## 12. Examples
- **Audit Logging**: Appending `### Audit #79: Repository Deep Clean & Workspace Hardening` with date and deliverables.
