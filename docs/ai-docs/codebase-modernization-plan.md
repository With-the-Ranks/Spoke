# Spoke Codebase Modernization Plan

## Non-Goals

This plan does **not** cover:
- Feature development or product changes
- Database schema changes or migrations
- Infrastructure, CI/CD pipeline redesign, or deployment changes
- GraphQL schema refactoring
- React component library migration (Material-UI v4 → v5+)
- Full E2E test framework migration (Selenium → Playwright/Cypress) — though we prepare for it
- Performance optimization
- Multi-country support (Spoke is US-only for now; YAGNI applies)

---

## Principles

1. **Tests first** — add/verify tests before changing anything; every refactor must be provably a no-op
2. **Small, reviewable PRs** — each PR has one theme; stacked PRs where ordering matters
3. **Static analysis for safety** — use `ts-prune`, `knip`, or `eslint-plugin-unused-imports` to find dead code; cross-reference with grep for dynamic imports and GraphQL resolver references
4. **Prefer native/ES2020+ over libraries** — remove dependencies when the language has caught up
5. **Co-located tests** — `.spec.ts` next to source files, not in a separate `__test__/` tree
6. **Incremental coverage requirements** — enforce coverage thresholds on new/changed code

---

## Phase 1: Dead Code Removal

**Why first:** Smaller codebase = less to convert, test, and maintain. Every file deleted is a file you never have to convert to TypeScript or write tests for.

**1A. Automated dead code audit**
- Run `knip` or `ts-prune` to identify unused exports, files, and dependencies
- Cross-reference with grep for dynamic imports (`require()`, string-based references)
- Manually verify GraphQL resolvers and Express route handlers (schema-driven, won't show as static imports)
- Each removal gets: `yarn test`, `yarn build`, `yarn lint`

**1B. Remove dead exports, files, and barrel re-exports**
- Barrel exports (`index.ts` files) that re-export unused functions — change to direct imports, delete barrels
- Unused utility functions, types, and constants
- Orphaned mock files
- `timezonecomplete` dependency (only consumer `dst-helper.ts` already deleted)
- Move `gzip`/`gunzip` (defined inline in `src/lib/index.ts`) to their own file before deleting the barrel

---

## Phase 2: Test Infrastructure

**Why second:** Everything after this depends on having tests that actually run and catch regressions.

**2A. Standardize test location**
- Move all `__test__/` tests to co-located `.spec.ts` files next to their source
- ~25 test files in `__test__/` need migration (containers, server, workers)
- Delete `__test__/lib/` (already done for `src/lib/`)
- Remove `__mocks__/` directories; inline mocks in test files using `jest.mock()`

**2B. Modernize test conventions**
- `it()` + `describe()` consistently (not `test()`)
- Remove `var`, use `const`/`let`
- Jest fake timers instead of `mockdate` where applicable
- Proper test isolation (no shared mutable state between tests)

**2C. Add coverage requirements**
- Add `--coverage` with thresholds to CI for new/changed files
- Start with a low global threshold (e.g., 30%) and ratchet up
- Require 80%+ coverage for any newly added file
- Configure Jest `coverageThreshold` in `jest.config.js`

---

## Phase 3: TypeScript Conversion

**Why after dead code removal:** Fewer files to convert.

**3A. Convert remaining `.js`/`.jsx` files to `.ts`/`.tsx`**
- `src/lib/` already done
- Priority order: `src/server/` → `src/containers/` → `src/components/`
- Each directory gets stricter ESLint rules via `overrides` (same pattern as `src/lib/`)

**3B. Enable stricter TypeScript rules per-directory**
- `@typescript-eslint/no-explicit-any`: error
- `@typescript-eslint/explicit-module-boundary-types`: error
- Start with `src/lib/` (already done), expand to `src/server/`, then `src/containers/`

**3C. Replace workaround types**
- Inline misleading types at their usage sites (already done for `js-types.ts` in `src/lib/`)
- Audit for similar patterns in other directories

---

## Phase 4: Library Modernization

**Why after TS conversion:** TypeScript catches type errors when swapping implementations.

**4A. Lodash removal**
- **Why:** Lodash was essential pre-ES2015. Most of its functions now have native equivalents. It adds ~70KB to the bundle and creates a false sense that native alternatives don't exist.
- **176 imports across the codebase** — do this directory by directory
- Common replacements:
  - `isEmpty(x)` → `!x` or `x.length === 0` or `Object.keys(x).length === 0`
  - `isNil(x)` → `x == null`
  - `get(obj, 'a.b.c')` → optional chaining `obj?.a?.b?.c`
  - `map`, `filter`, `find`, `reduce`, `sortBy`, `reverse` → native array methods
  - `flow` → function composition or just sequential calls
  - `fromPairs` → `Object.fromEntries`
  - `escapeRegExp` — no native equivalent; inline the 1-liner regex
  - `isEqual` — no native deep equal; keep lodash or use a smaller library
  - `transform` — usually replaceable with `Object.entries().reduce()`
- `lodash/fp` imports (used in `interaction-step-helpers.ts`) already removed for `src/lib/`
- Keep lodash where the native alternative is significantly more complex (deep equal, deep clone)

**4B. Other library evaluations**
- `humps` → inline `camelize` one-liner or native (only used in `recordToCamelCase`)
- `charset-utils.ts` → evaluate GSM encoding libraries vs hand-rolled implementation
- `zipcode-to-timezone` → replace hand-rolled `commonZipRanges` array (stretch)
- `superagent` → native `fetch` (Node 20+ has global fetch)

---

## Phase 5: Ongoing Code Quality

Applied incrementally alongside other phases, not as a separate big-bang effort.

- Replace deprecated timezone names with IANA equivalents
- Prefer explicit function parameters over passing objects (more testable, more readable)
- Consolidate duplicate functions (e.g., two `titleCase` implementations)
- Fix known bugs discovered during testing (document before, fix after)
- `dataTest`: keep for now (Playwright/Cypress also use `data-test` selectors), modernize comment to say "modernize E2E framework" not "remove"

---

## Ordering Rationale

```
Phase 1 (Dead Code)  →  Phase 2 (Tests)  →  Phase 3 (TypeScript)  →  Phase 4 (Libraries)
                                                                          ↑
                                          Phase 5 (Quality) — continuous alongside all phases
```

- Dead code first because deleted files don't need tests, conversion, or library cleanup
- Tests second because everything after needs them as a safety net
- TS before library swaps because the type checker catches errors in replacements
- Quality is continuous — applied within each PR as we touch files

---