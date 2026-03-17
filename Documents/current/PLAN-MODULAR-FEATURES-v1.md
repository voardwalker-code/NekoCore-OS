# PLAN: Modular Platform Features

**Status:** `Planned`
**Version target:** `post-0.6.0`
**Date created:** `2026-03-15`
**Last updated:** `2026-03-15`

---

## 1. Background / Why This Plan Exists

Phase 3 modularization is the next approved architecture track in WORKLOG.md. During the NekoCore OS stabilization pass, a set of platform-level modular features was requested for future consideration: a plug-in registration hub, a feature-flag system, lazy-load loading, a shared state store, a theming engine, an automated testing scaffold, and a documentation generator. These are not approved as immediate feature implementation work; this document exists to capture them as candidate modular infrastructure so the Phase 3 split can reserve clean extension points instead of hardcoding them later.

Requested by: `NekoCore OS`

## 2. Objective

Define a structured candidate-feature plan for modular platform services that may be introduced during or after Phase 3. Done means the requested items are captured with scope, ownership boundaries, dependencies, rollout order, and risks, while explicitly preserving the current mandate: no feature implementation starts from this document alone. This plan is a design and sequencing artifact for later slices, not an authorization to build all items immediately.

## 3. Audit Findings / Pre-Work Analysis

| Item | Current Location | Lines | Problem / Note | Target |
|------|-----------------|-------|----------------|--------|
| Desktop shell boot and app wiring | `project/client/js/app.js` | ~large monolith | App/module registration is still shell-owned and tightly coupled | `client/js/desktop/**` Phase 3 split |
| NekoCore app registration | `project/client/js/app.js`, `project/client/js/nekocore-app.js` | mixed | App manifests are not yet driven by a shared registry contract | plug-in registration hub |
| Theme handling | `project/client/js/app.js`, `project/client/themes/**`, `project/client/css/ui-v2.css` | mixed | Themes exist, but the system is not yet a formal theming engine with manifest/contract boundaries | theming engine |
| Test coverage structure | `project/tests/unit/**`, `project/tests/integration/**` | broad | Coverage exists but lacks a modular feature scaffold/template for new app modules | automated testing scaffold |
| Docs and architecture notes | `Documents/current/**` | broad | Planning and architecture docs are manual and distributed across multiple files | documentation generator |

**Estimated total impact:** planning only in this slice; future implementation likely spans shell registry contracts, client module extraction, route contracts, tests, and documentation tooling.

## 4. Architecture Boundary Check

- [x] No frontend (`client/**`) receives backend orchestration, filesystem logic, or policy logic
- [x] No backend (`server/**`) receives DOM/UI rendering concerns
- [x] New routes added to `server/routes/**`, not inlined into `server/server.js`
- [x] New data schemas and validators go into `server/contracts/**`
- [x] No new business logic added to `server/server.js` (composition only)
- [x] All new modules target <= 300 lines where practical
- [x] Any file above 1200 lines that needs changes: extraction is required in the same slice

Planning markers for future work items below: `[BOUNDARY_OK]`, `[JS_OFFLOAD]`, `[CONTRACT_ENFORCED]`

## 5. Phases

### Phase M1: Registry and Runtime Boundaries

**Goal:** define the shell-facing contracts required to load apps and platform services as optional modules.
**Status:** `Planned`
**Depends on:** `Phase 3 modularization kickoff`
**Requested by:** `NekoCore OS`

#### Slice Checklist

- [ ] M1-0: registry contract audit — map current hardcoded app registration and shell boot coupling
- [ ] M1-1: plug-in registration hub contract — define app/service manifest shape and lifecycle hooks
- [ ] M1-2: feature-flag system contract — define runtime/config flag sources and guard boundaries
- [ ] M1-3: lazy-load loading contract — define module discovery, fallback behavior, and failure isolation

### Phase M2: Shared Platform Services

**Goal:** define reusable client-platform services that multiple modular apps can consume safely.
**Status:** `Planned`
**Depends on:** `M1 complete`
**Requested by:** `NekoCore OS`

#### Slice Checklist

- [ ] M2-0: shared state store contract — define store API, ownership, and app subscription rules
- [ ] M2-1: theming engine contract — define theme manifests, token layers, and runtime theme switching
- [ ] M2-2: cross-module compatibility review — ensure registry, flags, state, and themes compose cleanly

### Phase M3: Contributor Tooling and Quality Rails

**Goal:** make modular features contributor-safe with repeatable testing and docs generation.
**Status:** `Planned`
**Depends on:** `M2 complete`
**Requested by:** `NekoCore OS`

#### Slice Checklist

- [ ] M3-0: automated testing scaffold — define test templates for new apps/modules and guard contracts
- [ ] M3-1: documentation generator — define source-of-truth inputs and generated outputs for module docs
- [ ] M3-2: contributor onboarding pass — tie generated docs and scaffolds into contributor workflow

## 6. Slice Definitions

### M1-1 — Plug-in Registration Hub

**Requested by:** `NekoCore OS`

**Start criteria:** Phase 3 desktop shell split has started and current app registration points are inventoried.

**Work:**
1. Define a manifest contract for modular apps and platform plug-ins.
2. Define registration hooks for boot, window metadata, menu presence, commands, and optional health checks.
3. Define failure behavior so missing or broken modules degrade gracefully without blocking shell boot.

**Boundary markers:** `[BOUNDARY_OK] [CONTRACT_ENFORCED]`

**End criteria:** a shell registry contract exists and at least one existing app can be represented without bespoke shell logic.
- Tests affected: registry guard tests, boot failure-isolation tests
- Files changed: expected future targets include `project/client/js/app.js` extraction outputs and `project/tests/unit/**`

### M1-2 — Feature-Flag System

**Requested by:** `NekoCore OS`

**Start criteria:** registry boundaries are defined.

**Work:**
1. Define flag sources: static defaults, config-backed overrides, and optional dev/test overrides.
2. Define read-only client consumption rules so features are gated without mixing server policy into UI modules.
3. Define audit/debug visibility for active flags.

**Boundary markers:** `[BOUNDARY_OK] [CONTRACT_ENFORCED]`

**End criteria:** every future module can express gated availability without hardcoded `if` chains scattered through the shell.
- Tests affected: flag-resolution tests, shell availability tests
- Files changed: expected future targets include `project/server/contracts/**`, `project/client/js/**`

### M1-3 — Lazy-Load Loading

**Requested by:** `NekoCore OS`

**Start criteria:** registry and feature-flag contracts exist.

**Work:**
1. Define when modules load: boot-time, on first open, or background prefetch.
2. Define loading/error states for missing bundles or failed initialization.
3. Ensure module failure is isolated and logged without destabilizing unrelated apps.

**Boundary markers:** `[BOUNDARY_OK] [JS_OFFLOAD]`

**End criteria:** app modules can be deferred until needed, and shell boot does not require all modules to be present.
- Tests affected: lazy-load boot tests, module failure fallback tests
- Files changed: expected future targets include `project/client/js/desktop/**`, `project/tests/unit/**`

### M2-0 — Shared State Store

**Requested by:** `NekoCore OS`

**Start criteria:** module registry and lazy-load boundaries are stable enough to prevent store API churn.

**Work:**
1. Define a shared client-state store for shell-wide concerns only.
2. Separate shell-global state from app-local state to avoid reintroducing monolith coupling.
3. Define subscription/update rules that remain safe for optional modules.

**Boundary markers:** `[BOUNDARY_OK] [JS_OFFLOAD]`

**End criteria:** modular apps can consume shell state through a stable interface instead of reading or mutating shell globals directly.
- Tests affected: store contract tests, stale-subscription tests
- Files changed: expected future targets include `project/client/js/desktop/**`, `project/tests/unit/**`

### M2-1 — Theming Engine

**Requested by:** `NekoCore OS`

**Start criteria:** shared state rules are defined.

**Work:**
1. Define theme manifests and token inheritance rules.
2. Separate theme registration from direct shell CSS assumptions where practical.
3. Define how module-specific theme extensions compose with global shell tokens.

**Boundary markers:** `[BOUNDARY_OK] [CONTRACT_ENFORCED]`

**End criteria:** themes become a first-class module concern instead of a shell-only hardcoded list.
- Tests affected: theme manifest validation tests, theme-switch smoke tests
- Files changed: expected future targets include `project/client/themes/**`, `project/client/css/**`, `project/client/js/**`

### M3-0 — Automated Testing Scaffold

**Requested by:** `NekoCore OS`

**Start criteria:** registry and shared service contracts are stable enough to template.

**Work:**
1. Define a scaffold for unit/integration tests for new apps, registries, and feature flags.
2. Define minimum regression tests required before extracting a module.
3. Define contributor-facing examples so new modules land with coverage by default.

**Boundary markers:** `[BOUNDARY_OK] [CONTRACT_ENFORCED]`

**End criteria:** modular app work has a repeatable test template instead of ad-hoc coverage decisions.
- Tests affected: scaffold fixture tests, module contract tests
- Files changed: expected future targets include `project/tests/unit/**`, `project/tests/integration/**`, `project/tests/fixtures/**`

### M3-1 — Documentation Generator

**Requested by:** `NekoCore OS`

**Start criteria:** registry and module contract shapes are stable enough to document automatically.

**Work:**
1. Define source inputs for generated docs: manifests, route contracts, capability metadata, and feature flags.
2. Define generated outputs for contributor docs, module inventories, and health/status documentation.
3. Ensure generated docs do not overwrite hand-authored architecture decisions without review.

**Boundary markers:** `[BOUNDARY_OK] [JS_OFFLOAD]`

**End criteria:** contributor-facing modular docs can be regenerated from system metadata instead of maintained only by hand.
- Tests affected: doc generation smoke tests, manifest-to-doc contract tests
- Files changed: expected future targets include `Documents/current/**`, `project/server/tools/**`, `project/client/js/**`

## 7. Test Plan

| Test File | Slice | What It Verifies |
|-----------|-------|------------------|
| `project/tests/unit/plugin-registry-contract.test.js` | `M1-1` | app/module manifests validate and missing modules degrade safely |
| `project/tests/unit/feature-flags.test.js` | `M1-2` | flags resolve deterministically across defaults and overrides |
| `project/tests/unit/lazy-load-shell.test.js` | `M1-3` | deferred modules load on demand and failures do not break boot |
| `project/tests/unit/shared-state-store.test.js` | `M2-0` | shared shell state remains bounded and subscription behavior is stable |
| `project/tests/unit/theme-engine.test.js` | `M2-1` | theme manifests and token merging behave consistently |
| `project/tests/unit/module-test-scaffold.test.js` | `M3-0` | new scaffold outputs required files and baseline assertions |
| `project/tests/integration/doc-generator.test.js` | `M3-1` | generated docs reflect module metadata and remain reproducible |

**Test-first rule:** if any of these items move from planning into implementation, write contract/guard tests before extraction or registry rewiring.

## 8. Risk Notes

1. **Registry overreach** — a plug-in hub can turn into a second monolith if it absorbs too many app-specific concerns. Keep the contract narrow.
2. **State-store sprawl** — a shared store can recreate current global coupling if app-local state is not kept local.
3. **Theme fragmentation** — a theming engine without clear token ownership can produce per-module styling drift.
4. **Lazy-load regressions** — deferred boot can hide load-order bugs unless failure and loading states are tested explicitly.
5. **Doc generator drift** — generated docs can become misleading if source manifests are incomplete or hand-maintained docs remain the real truth.

## 9. Completion Ledger

| Date | Slice | Outcome | Notes |
|------|-------|---------|-------|
| 2026-03-15 | M-Plan | Done | Captured requested modular platform feature candidates and rollout order without authorizing implementation |

## 10. Stop / Resume Snapshot

- **Current phase:** `Planning only — awaiting Phase 3 modularization kickoff`
- **Current slice:** `M-Plan — done`
- **Last completed slice:** `M-Plan`
- **In-progress item:** `none`
- **Blocking issue (if blocked):** `none`
- **Next action on resume:** `Use this document as a candidate-feature reference when Phase 3 modularization slices begin`