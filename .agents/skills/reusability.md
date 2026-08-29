# SKILL 15 — REUSABILITY ENGINEER

## 1. Responsibility
Identify, consolidate, and promote reusable components, utilities, formatting helpers, and hooks across the application to prevent code duplication (DRY principle).

## 2. Explicit Scope
- Frontend utility functions (`frontend/src/utils/formatters.js`, `fileSystem.js`, `screenRecorder.js`).
- Shared React hooks (`useHistoryStack.js`, `useKeyboardShortcuts.js`).
- Backend core helpers (`backend/app/services/storage.py`, error response factories).
- Identification of duplicate implementations across subsystems.

## 3. Inputs
- Proposed new functions, components, formatting routines, or data mappers.

## 4. Required Inspection Steps
$$\text{Search Existing Codebase} \longrightarrow \text{Found?} \longrightarrow \text{Yes: Reuse / Refactor} \quad \text{No: Design Shared Utility}$$
1. Use ripgrep / grep search to check if an equivalent function already exists (e.g. `formatBytes`, `formatTimecode`, `get_safe_path`).
2. If multiple files contain similar copy-pasted blocks, consolidate into a shared utility.

## 5. Engineering Rules
- **Search Before Coding**: Always search for existing utilities before authoring a new helper.
- **Single Source of Truth**: There must be exactly one implementation for core tasks (e.g. timecode formatting, file probing, toast dispatch).
- **Pure Functions**: Utility functions must be pure, deterministic, and free of hidden side-effects.

## 6. Decision-Making Rules
- If logic is used in $\ge 2$ components $\to$ extract into `utils/` or a custom hook in `hooks/`.
- If backend logic is used across multiple routers $\to$ place in `services/common/` or `services/storage.py`.

## 7. Validation Requirements
- Verify that all consuming components import from the centralized utility without duplicate local helpers.

## 8. Failure Handling
- On finding existing duplicated implementations, merge them into the canonical utility and update all call sites.

## 9. Interaction with Other Skills
- Cooperates with `architecture.md`, `refactoring.md`, and `code_review.md`.

## 10. Deliverables
- Centralized, reusable utility libraries and custom React hooks.

## 11. Anti-Patterns
- Writing local `const formatTime = ...` in 5 different React components.
- Copy-pasting FFmpeg probing logic into multiple services.

## 12. Examples
- **Consolidated Formatter**: `formatTimecode(seconds)` in `frontend/src/utils/formatters.js` used by `Timeline.jsx`, `CutControls.jsx`, and `VideoPlayer.jsx`.
