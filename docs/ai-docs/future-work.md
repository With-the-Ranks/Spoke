# Future Work — Issues Outside Current Scope

Captured during src/lib/ cleanup. Unorganized, just tracking threads.

## src/lib/ adjacent

- **`index.ts` barrel export removal**: Only ~10 imports use it vs ~158 direct imports. Phase out by changing those 10 to direct imports, move `gzip`/`gunzip` to their own file, delete `index.ts`.
- **`charset-utils.ts` GSM "easy wins"**: Hand-rolled GSM character mapping. Evaluate library replacement (e.g., `@tediousjs/gsm-charset` or similar).
- **`replaceAll` function deletion**: After inlining native `str.replaceAll()` at the 2 call sites (`root-mutations.ts`, `with-operations.jsx`), delete the function entirely.
- **`camelCase` wrapper deletion**: After inlining `humps.camelize` at the 1 call site (`SectionWrapper.tsx`), delete the function and its tests.
- **Lodash removal for files outside src/lib/**: Lodash used in ~8 files across the broader codebase. es-toolkit or native JS could replace it.
- **`difference` function in utils.ts**: Complex lodash-based deep diff. Only used in 2 campaign edit forms. Could be replaced with a simpler implementation or library.
- **`downloadFromUrl` race condition**: Sets `fileDownloaded = true` before pipe completes. The `finish` event on the write stream is the correct place.
- **Phone number validation flow**: Invalid numbers get inserted as empty strings into a NOT NULL column, then filtered out downstream. Fragile — should reject at insert time.
- **`titleCase` duplication**: `attributes.ts` has single-word titleCase, `scripts.ts` has multi-word titleCase. Same name, different semantics. Should unify or rename.
- **`dataTest` function removal**: 33 files use it for E2E test selectors, but E2E tests aren't running in CI. Remove when E2E tests are overhauled.

## Broader codebase

- **E2E test overhaul**: Tests exist in `__test__/e2e/` but aren't running. `dataTest` helper generates test selectors for them.
- **`__test__/` directory migration**: Many tests in `__test__/` don't run in CI (`yarn jest src/**/*`). Should be migrated to co-located specs or CI config updated.
- **humps library**: Works but unmaintained (last release 2018). Used in 3 files. Could eventually be replaced with es-toolkit or native code.
- **`timezonecomplete` library**: Only used by dst-helper (now deleted). Check if it can be removed from dependencies entirely.
- **Config extensibility vs YAGNI**: `PHONE_NUMBER_COUNTRY` config exists for international support but is hardcoded to "US" everywhere. Current codebase is US-only (zip codes, NANP phone validation). International support would require much more than just config.
