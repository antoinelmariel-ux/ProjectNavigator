# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Project Navigator ("Compliance Navigator") is a ~58k-line React app that helps project & compliance teams qualify regulatory risk (adaptive questionnaire → real-time risk scoring → shareable synthesis → admin back-office → project showcase). UI copy is in French; identifiers are in English.

## The one thing that will bite you: nothing runs `src/` without a bundle

The app ships as a **SharePoint Framework web part** (full-page app). `src/` is plain ES modules +
JSX, bundled by webpack — never executed directly. After editing anything under `src/`:

```bash
npm run build          # mocks + CSS + dev harness bundle (harness/dist/) — what e2e runs
npm run spfx:build     # the real deliverable: spfx/sharepoint/solution/project-navigator.sppkg
```

There is no hot reload by default; `npm --prefix spfx run watch:harness` rebuilds the harness on change.

## Architecture: one source, two webpack outputs

- **`spfx/`** is a separate npm project (SPFx 1.23.2, **React 17**, Heft toolchain, webpack 5) because
  the root is `"type": "module"` and the SPFx toolchain is CommonJS. Its web part
  (`spfx/src/webparts/projectNavigator/ProjectNavigatorWebPart.ts`) imports
  `mountApp`/`unmountApp` from the alias `project-navigator-app` → `../src/main.jsx`. TypeScript never
  sees the `.jsx` files: the alias is declared in `spfx/src/app.d.ts` and resolved by webpack only.
- **`spfx/config/app-webpack-rules.js`** is the single definition of how `src/` is transformed
  (babel-loader with `@babel/preset-react` + `@babel/plugin-transform-block-scoping`, `?raw` → `asset/source`, `.png` → `asset/resource`,
  `react`/`react-dom` aliased to `spfx/node_modules` so there is one React). It is applied to the
  SPFx config by `spfx/config/spfx-customize-webpack.js` (hook of the SPFx Heft rig) **and** to the dev
  harness by `spfx/scripts/build-harness.js`. Keep it shared: the e2e suite is only meaningful because
  it exercises the exact transform the `.sppkg` ships.
- **Dev harness** (`index.html` + `harness/entry.js` → `harness/dist/`, git-ignored): mounts the same
  bundle outside SharePoint, on the mock providers. It is a test fixture, not a deliverable — the old
  `file://`, zero-install `index.html` product (module-loader, `module-manifest*.js/.txt`, vendored
  React/Babel) is gone and must not come back.
- `src/react.js` re-exports the npm `react`/`react-dom`; every module imports React through it.
- **`const`/`let` are still turned into `var`** (`@babel/plugin-transform-block-scoping`, the one
  piece of the old `preset-env` build kept). `App.jsx` relies on it: several `useCallback`/`useMemo`
  list in their dependencies a `const` declared further down (e.g. `registerAnnotationSource`), which
  under real ES2015 semantics is a TDZ `ReferenceError` on first render. Don't drop the plugin
  without fixing those first; nothing else is transpiled down (modern browsers only).
- **Styles travel as text.** `src/styles/*.css` are imported with `?raw` and injected as
  `<style data-cn-style="…">` by `src/styles/injectStyles.js` (base sheets in `mountApp`, showcase
  and tour-guide sheets on demand). There is no relative URL to a `.css` on a SharePoint page. The
  former inline `<style>` of `index.html` lives in `src/styles/app-shell.css`.
- **Code splitting**: `src/lazyComponents.jsx` uses real `import()`; `BackOffice`, `ProjectShowcase`
  and `SynthesisReport` get their own chunks (`webpackChunkName`), the other lazy screens stay in the
  main bundle (`webpackMode: "eager"`). Modules only imported by a chunked screen follow it
  automatically. `tourguide.js`/`.css` and the showcase stylesheets are loaded by `import()` too.

## SPFx migration (in progress)

Phases 1–4 done: the web part mounts the whole app and hands it its `pageContext` through
`mountApp(domElement, { webAbsoluteUrl, user, cultureName })`. `configureSharePointContext`
(`src/config/sharepointConfig.js`) makes the injected site URL win over any `window.location`
derivation and turns `isSharePointMode()` on; the location/hostname derivation is now only a
fallback (dev harness, unit tests). `initSharePointContext` still asks `/_api/web/currentUser`
(only source of `Id`/`IsSiteAdmin`) but falls back to the SPFx user, not to an anonymous one. The
SharePoint culture is only a fallback language: a language chosen in the app (stored) wins.
`unmountApp` resets the identity, the injected context and any « Voir en tant que » simulation,
because SharePoint navigates as an SPA and modules outlive a web part.

Phase 4 (living inside a SharePoint page) — four rules that keep holding:

- **The base CSS reset is scoped to the app container.** `mountApp` puts `.cn-app-root` on the
  web part's element, and `scripts/generate-tailwind-lite.js` emits the preflight (`*`, `a`, `button`,
  fonts) under `:where(.cn-app-root, .tgjs-container)` instead of `html`/`body`/`*` — a global reset
  restyles SharePoint's suite bar and navigation. `:where()` keeps specificity at zero so utilities
  still win. Never add a bare `html`/`body`/`*`/element selector to `src/styles/*.css`.
- **Don't scroll `window`.** On a SharePoint page an inner container scrolls, not the window, so
  `window.scrollTo`/`window.scrollY` silently do nothing there. Use `src/utils/scrollContainer.js`
  (`scrollAppTo`, `getAppScrollTop`, `getAppScrollTopForElement`: first scrollable ancestor of the app
  root, window only when there is none, i.e. the dev harness). `scrollIntoView` is fine as is.
  `window` scroll listeners need `capture: true` to hear an inner container. The vendored
  `tourguide.js` does the same with the target's own scroll parent.
- **No sibling `.html` page.** The FAQ and legal notice live in `src/pages/*.html` (bundled `?raw`)
  and open inside the app, in `StaticPageDialog.jsx` (a sandboxed `iframe`, so their own `body`/
  `header` styles stay isolated), via `openStaticPage(id)` / `staticPageLinkProps(id)`
  (`src/utils/staticPages.js`). The tour's « Aide » link uses `helpLink.onClick`.
- **External links open in a new tab, even under SharePoint's link interception.** A modern page
  intercepts link clicks for its SPA navigation and could open a `target="_blank"` link in the app's
  own tab. Every sanitized/linkified link carries `data-interception="off"` (`NEW_TAB_LINK_ATTRIBUTES`,
  `src/utils/newTabLinks.js`), and `mountApp` installs a click relay on the app root that opens any
  `target="_blank"` http(s) link itself (`e2e/external-links.spec.js`).
- **Unmount flushes.** The `pagehide` flush effect in `App.jsx` also flushes in its cleanup, because
  SharePoint's SPA navigation disposes the web part without any `pagehide`.

Commands: `npm run spfx:install`, `npm run spfx:build`, `npm run spfx:start` (hosted
workbench on the DEV site, see `spfx/config/serve.json`).

## Commands

```bash
npm install            # dev tooling only (eslint, prettier, @babel/*)
npm test               # unit tests, Node's built-in runner, zero runtime deps
node --test test/rules.test.mjs   # run a single test file
npm run lint           # eslint (flat config, eslint.config.mjs)
npm run format         # prettier --write (do NOT bulk-format existing files casually — huge diffs)
npm run build          # generate:mocks + generate:css + build:harness (needs npm run spfx:install once)
```

Tests live in `test/*.test.mjs` and import pure logic from `src/utils/*` directly (no DOM). Root `package.json` is `"type": "module"`; `scripts/package.json` pins `"type": "commonjs"` because the generator scripts are CommonJS — keep new generator scripts CommonJS or they break.

## End-to-end tests (Playwright)

`npm run test:e2e` runs a separate Playwright suite under `e2e/*.spec.js` — it does **not** run as part of `npm test` (which stays the fast, dependency-free `node --test` logic suite) and CI/local habits built around `npm test` won't pick it up. Build first (`npm run build`): `playwright.config.js` only serves the repo root via `scripts/serve-e2e.js` (a throwaway static server) and drives the dev harness at `/index.html`.

- `e2e/fixtures.js` holds shared helpers: `gotoHome`/`gotoFresh` (clears `localStorage` and deletes the `complianceNavigator` IndexedDB database once, from a same-origin page that does not mount the app, then navigates to `/index.html` — **never** `page.addInitScript(() => localStorage.clear())` for this, since that hook re-fires on every navigation in the page, including a later `page.reload()` a test does on purpose to check persistence, silently wiping the very state being tested), `readStoredState(page)` (what is really stored — IndexedDB or its `localStorage` safety copy — once pending writes are done; **don't read `localStorage.getItem('complianceNavigatorState')` to check persistence**, that key is empty most of the time now), `patchStateOnBoot(page, (state, arg) => state, arg)` (see below), `walkQuestionnaireToShowcase`/`walkToSynthesis`/`answerCurrentQuestion` (generic questionnaire autopilot — the first stops on the showcase the form now opens, the second carries on to « Enjeux du projet » via `openProjectStakes`), `createAndSubmitProject`, `grantAdminAccess`/`grantSelfComplianceExpertAndCommitteeAccess` (back-office setup for the compliance-dashboard specs), `collectConsoleErrors`.
- The nav's lock button renders for someone already designated in the back-office (in `adminEmails`, a team contact, or a committee member — see `isCurrentUserAdmin`/`hasScopedBackOfficeAccess` in `App.jsx`), where clicking it goes straight to the back-office view, **and — outside SharePoint mode only — for everyone else**, where it opens the shared-password prompt instead (`isSharedPasswordEntryAvailable = !isSharePointMode()` in `App.jsx`). Under `file://` and this local server there is no SPO session to designate anyone, so the shared password is the only gate that can exist; in SharePoint mode the button stays reserved to designated people as before. `grantAdminAccess` therefore designates the mock user (`bertrand.darieux@lfb.fr`) by seeding `adminEmails` into the stored state via `patchStateOnBoot(...)` before reloading, rather than typing the real password (never committed) into the modal — no `E2E_ADMIN_PASSWORD` environment variable is needed for these specs anymore.
- Specs targeting the back-office as a compliance expert/committee member (`compliance-comments-and-committee.spec.js`) grant the mock user admin (`grantAdminAccess`, persisted from boot) **before** adding them as a team contact or committee member — see the `allowedTabIds` gotcha below; doing it in the other order locks the test (and a real session) out of most back-office tabs mid-setup.
- Prefer `page.emulateMedia({ reducedMotion: 'reduce' })` over `test.use({ reducedMotion: 'reduce' })` for reduced-motion specs — in this environment the context-option form isn't reliably reflected by `matchMedia()` before the first navigation, while the explicit call is.
- To force compliance/committee statuses a spec can't reach through the UI (the comment editor needs back-office access), inject them with `patchStateOnBoot(...)` and then navigate — **not** with an `evaluate()` before the navigation. `App.jsx` re-persists its own state on `pagehide`, so a patch written before the `goto` is overwritten by that flush on the way out. An `addInitScript` can no longer patch the state itself (IndexedDB is asynchronous): `patchStateOnBoot` registers a function in `window.__cnE2EStatePatches`, which `harness/entry.js` applies and writes back before mounting the app, on every navigation, in registration order. `e2e/home-validation-badge.spec.js` does it this way.
- Mock SharePoint data (`isSharePointMode()` is false under both `file://` and this local server) means real cross-session sharing can't be exercised — a "shared with someone else" scenario is simulated within the *same* browser context/localStorage (e.g. clearing just the mock profile key before opening a share link), not a genuinely separate session.

## State & data flow

- `src/App.jsx` is a god-component (~5k lines, ~57 `useState`) that owns essentially all global state and drills it into children as props (no React Context yet).
- All state is serialized as a **single** payload by `src/utils/storage.js`, debounced 400ms (see `buildPersistPayload`/`persistNow` in `App.jsx`), and stored in **IndexedDB** (database `complianceNavigator`, store `state`, key `complianceNavigatorState`; thin wrapper in `src/utils/indexedDbStore.js`). It used to live in `localStorage`, whose few MB are shared, on SharePoint, with the whole tenant origin (SharePoint itself and every other web part): a user ran out of space in Edge and saves silently stopped. Large default referentials (questions/rules/…) are persisted **delta-only** (skipped when unchanged from defaults); hydration falls back to defaults for any absent slice.
  - **Reads stay synchronous**: `mountApp` awaits `hydratePersistedState()` before the first render, which loads the stored payload in memory; `loadPersistedState()` (called from `App.jsx` initialisers and `main.jsx`) reads that copy. Without hydration (Node tests) or without IndexedDB (unavailable, refused, or not answering within 3 s), everything falls back to `localStorage`, exactly as before.
  - **The `localStorage` key `complianceNavigatorState` is now only a safety copy.** IndexedDB writes are asynchronous and may die with the tab, so the `pagehide`/`beforeunload`/unmount flush (`persistNowRef` → `flushPersistedState`) writes the payload synchronously to `localStorage` **only while an IndexedDB write is unconfirmed**, and the next confirmed IndexedDB write removes it. When present at boot, it is therefore always the newest state and wins over IndexedDB (that is also how the state of the previous, `localStorage`-only version is migrated, then freed). A failed IndexedDB write falls back to `localStorage` too. Don't remove that flush while touching the debounce, an edit made in the last 400ms before the tab closes depends on it.
  - `persistState` returns a **Promise** (`{ok:false, reason:'quota'}` drives the user-facing banner, which therefore now only shows when IndexedDB *and* `localStorage` both fail); `flushPersistedState` is synchronous. Showcase drafts (`complianceNavigatorShowcaseDrafts`), the `Mock*` keys and the language still live in `localStorage`: they were left out of this change.
- Data access goes through `src/utils/dataProvider.js`, which exports a single `dataProvider` picked by `isSharePointMode()`: `MockSharePointProvider` (in-memory, default/dev) or `SharePointRestProvider` (real backend, built on `src/utils/listRepository.js` + `spRestClient.js`). There is no more `GraphDataProvider` stub. Writes use optimistic concurrency (`RowVersion` / `ConflictError`).
- The other `Mock*Provider` classes (`userProfileProvider.js`, `projectMembersProvider.js`, `complianceCommentsProvider.js`, `showcaseStickyNotesProvider.js` — used whenever `isSharePointMode()` is false, i.e. every local/`file://` session) back their data with `src/utils/mockProviderPersistence.js` (`loadPersistedMockMap`/`savePersistedMockMap`, one dedicated `localStorage` key per entity), not a plain in-memory `Map`. A plain `Map` loses everything on reload — the whole module re-evaluates from scratch — which used to make the onboarding screen (and project members/compliance comments/sticky notes) reappear/disappear on every F5 in local mode even though `complianceNavigatorState` itself persisted fine. If you add another local-mode provider that needs to survive reload, use this helper rather than a bare `Map`.

## Planned SharePoint migration

The app is being migrated off mocks onto real SharePoint lists, using the **SharePoint REST API** (`/_api/…`) with the browser's SPO session cookies — **not** Microsoft Graph, and **not** MSAL (no Azure AD app registration is available). Anything the REST API can't do (sending mail, Teams messages, scheduling) is delegated to Power Automate flows triggered by list items; the app itself must never send mail.

- Authoritative plan: [`docs/migration-v2/GUIDE-CLAUDE-MIGRATION-SHAREPOINT-REST.md`](docs/migration-v2/GUIDE-CLAUDE-MIGRATION-SHAREPOINT-REST.md)
- User-side setup (lists, columns, flows): [`docs/migration-v2/PREPARATION-SHAREPOINT-POWERAUTOMATE.md`](docs/migration-v2/PREPARATION-SHAREPOINT-POWERAUTOMATE.md)
- **Ignore** every other migration doc: everything in `docs/*.md` and `docs/migration-v2/_obsolete/` describes abandoned strategies.
- **Current status:** `projects`, `inspirations`, `filesIndex`, `notificationsQueue`, `projectMembers`, `complianceComments`, `showcaseStickyNotes`, `userProfiles`, `rules` and `teams` are fully wired through `getRepository(...)` (see `src/utils/projectMembersProvider.js`, `complianceCommentsProvider.js`, `showcaseStickyNotesProvider.js`, `userProfileProvider.js`, `rulesProvider.js`, `teamsProvider.js`, all consumed from `App.jsx`).
- **`rules`/`teams` moved from CN-Config JSON files to per-item lists (`CN_Rules`/`CN_Teams`)**, so two admins editing different rules no longer conflict on one shared file ETag. Each rule is one row (`RuleId` key, the whole rule object serialized into `PayloadJson` — the nesting is too deep for a column mapping); each team is one row with flat columns (`TeamId`, `Title`, `ContactsJson`, `NameJson`, `Expertise`). Both carry a `SortOrder` column since there's no drag-and-drop UI for rules/teams — display order is purely array-insertion order, and `SortOrder` is what lets `rulesProvider.listAllRules()`/`teamsProvider.listAllTeams()` reconstitute it from independent rows. `App.jsx` keeps the returned `{spItemId, rowVersion, sortOrder}` metadata in side `useRef` maps (`ruleServerMetaRef`/`teamServerMetaRef`) — never merged into the rule/team objects the rules engine consumes. A team's `name` and `expertise` are translatable in the app's 4 languages, stored as `{en, fr, de, es}` objects (same convention as `questions.js`/`rules.js`, resolved via `src/utils/localizedContent.js`); `NameJson`/`Expertise` carry that object, while `Title` stays a plain derived string (default-language name) so the SharePoint list itself stays readable natively. In mock/local mode `rules`/`teams` are untouched: still plain `useState` seeded from `src/data/rules.js`/`teams.js` and persisted in the `complianceNavigatorState` delta. `referentialStore.js`'s `REFERENTIAL_FILES` no longer includes `rules`/`teams` (6 files now, `showcase-templates.json` included).
- **`sampleProjects` (`CN_SampleProjects`) backs the rule test bench** in the back-office's `Revue Compliance` tab: one row per named set of answers (`SampleId` key, `AnswersJson` holding the answers in the same shape as `CN_Projects.AnswersJson`, plus `SortOrder` like rules/teams since there's no drag-and-drop). Loaded via `sampleProjectsProvider.listAllSampleProjects()` in `hydrateFromSharePoint`, written through `sampleProjectsQueueRef` (a `retryQueue`). Unlike `rules`/`teams`, **an empty list is a legitimate empty corpus, not "never published"** — it is reflected as-is with no fallback. In mock/local mode the provider is never consulted (hydration is gated on `isSharePointMode()`) and sample projects live in the `complianceSampleProjects` slice of `complianceNavigatorState`, exactly the split used for `rules`/`teams`. A sample project is never a real project: nothing here is submitted, notified or scored.
- **`faq` (`CN_Faq`) backs the FAQ of the help window, editable by admins only** (back-office tab `faq`, `BackOfficeFaq.jsx`; absent from `allowedTabIds`, so scoped compliance leads never see it). One row per question (`FaqId` key), `QuestionJson`/`AnswerJson` as `{en, fr, de, es}` (answer = limited rich text), optional `CategoryJson` (questions sharing the same label in the reader's language are grouped under one heading, in order of first appearance — no separate categories list), `IsPublished`, `SortOrder`. `StaticPageDialog` builds the FAQ page from `faqEntries` (`src/utils/faqEntries.js#buildFaqPageHtml`, answers through `sanitizeRichText`, injected as a parameter because `richText.js` is JSX and Node tests can't import it) and **falls back to the bundled `src/pages/faq.html` while no entry is published** — an empty list is a legitimate empty FAQ, not an error. A missing language falls back to French, then to any filled language. In mock/local mode the entries live in the `faqEntries` slice of `complianceNavigatorState`. Writes go through `faqQueueRef` (a `retryQueue`), debounced per entry in the editor. The legal notice (`mentions-legales.html`) deliberately stays a bundled file.
- **`userProfiles` backs the first-login onboarding screen and the "Mon profil" section**, one row per person (keyed by `UserEmail`), holding their activity scope (`ActivityScopeJson`, an array of fixed codes) and preferred language. `App.jsx` shows `OnboardingScreen.jsx` whenever the current user's profile is missing or has `HasCompletedOnboarding !== true`; finishing it (or skipping the tour offer) marks it complete. The activity scope is also exposed as a pseudo-question (`ACTIVITY_SCOPE_QUESTION_ID = '__activity_scope__'` in `src/utils/questions.js`, injected into any `answers` object via `withActivityScope(...)` — never persisted into a project's own answers) so it's selectable as a condition in the back-office question/rule editors exactly like a real question, via the same `getConditionQuestionEntries(...)` both editors already call. `App.jsx` and `BackOffice.jsx` each shadow `shouldShowQuestion`/`analyzeAnswers`/`shouldShowOption` locally to inject the current user's own scope — don't call the raw versions from `src/utils/questions.js`/`rules.js` directly inside those two files, or activity-scope conditions silently stop working there.
- **Compliance comments are a real read+write cutover, not just a mirror.** `complianceCommentsProvider.listAllComments()` bulk-loads the whole `CN_ComplianceComments` list once at hydration (`App.jsx`'s `hydrateFromSharePoint`) and `src/utils/mergeComplianceComments.js` merges it into each project's `answers['__compliance_team_comments__']`: SharePoint wins per team/committee key when it has a row, the project's own local JSON fills any gap (comments made before this cutover, never yet republished). Writes still go to both places (local state for instant UI feedback, SharePoint via the retry queue below) — don't remove the local write thinking it's now redundant, `SynthesisReport.jsx`/`HomeScreen.jsx`/`BackOfficeDashboard.jsx` all read that same local key directly.
- **Network-flaky writes go through `src/utils/retryQueue.js`**, not raw `.catch(() => console.warn(...))`. `App.jsx` keeps one `createRetryQueue(...)` instance per entity (`projectMembersQueueRef`, `stickyNotesQueueRef`, `complianceCommentsQueueRef`, `userProfileQueueRef`, `rulesQueueRef`, `teamsQueueRef` — projects keep their own older, project-specific `src/utils/autosaveQueue.js`, untouched). A single `window.addEventListener('online', ...)` in `App.jsx` calls `.flush()` on all of them and drives the `isOnline` banner; queues only ever replay their own pending items on reconnect, never a full resync of local state — that's deliberate, to avoid clobbering someone else's concurrent changes. Route any new SharePoint write path through this pattern rather than inventing another fire-and-forget one.
- **Two legacy local-JSON mechanisms were removed and must not be reintroduced**: a `submitted-projects/`/`submitted-inspirations/` folder that auto-imported dropped `.json` files as "submitted" projects (was already dead code — nothing called its loaders — fully deleted including `src/utils/externalProjectsLoader.js`/`externalInspirationsLoader.js`), and a manual "Sauvegarder/Charger" JSON export/import button pair for showcase sticky notes plus its automatic download-on-leaving-showcase safety net (both obsolete once sticky notes started syncing to SharePoint; removed from `AnnotationLayer.jsx`/`App.jsx`). If sticky notes ever need an offline safety net again, it belongs in `isSharePointMode() === false` mode only — SharePoint mode already has one via the retry queue.
- Never seed `createDemoProject()` when `isSharePointMode()` is true (see the `isSharePointMode()` guards around it in `App.jsx`, and the demo-project filter in `syncMerge.js`). The demo project only makes sense as first-run local filler; in SharePoint mode it raced the autosave effect and got written to the real `CN_Projects` list as a fake row before the server hydration had a chance to reconcile it away.
- **The top-level `AppErrorBoundary` (`src/main.jsx`) reports every crash to `CN_NotificationsQueue` automatically**, in `componentDidCatch` — the maintenance team must hear about a crash even if the user closes the tab without clicking anything. The "send a report" button on screen is a second, optional step: with an empty comment it does nothing beyond confirming to the user that their incident is already known (no second network call); with a comment, it queues a follow-up notification (`buildErrorReportEmail({..., isFollowUp: true})`, subject prefixed "Error report - details added") carrying that context, so the technical team doesn't mistake it for a second, unrelated crash. `src/utils/notificationTemplates.js#buildErrorReportEmail` formats message/stack/component-stack/screen/user/comment into the same HTML-email shape `buildNotification()` uses elsewhere, and `queueNotification(...)` puts it on the existing notifications queue/Power Automate flow — no new list, no new flow. Recipients are read directly from `loadPersistedState().adminEmails` (falling back to `initialAdminEmails`) rather than from `App.jsx` state, since the boundary wraps `App` and can't assume it mounted.

## Manuals in the help window (SME / Chef de projet)

The help window (`StaticPageDialog`, FAQ page) offers two **fixed** manuals as read-only viewers:
`projectManager` (everyone) and `sme` (only `hasScopedBackOfficeAccess`: team contact or committee
member). Links are admin-edited in the back-office `faq` tab (`BackOfficeHelpManuals.jsx`), one per
language, stored as the `helpManuals` slice of `settings.json` (`SETTINGS_KEYS`; `complianceNavigatorState`
in local mode). `src/utils/helpManuals.js` holds the pure logic: language fallback (language → fr → any),
https-only link normalisation (a pasted Office « Incorporer » `<iframe src>` is accepted), and the
viewer URL (`embedview` for Office files/sharing links, `#toolbar=0` for PDF). The iframe has **no
`allow-downloads`**. Hiding the download is cosmetic: SharePoint permissions still apply, and outside
SharePoint mode an Office file cannot be embedded, so the dialog offers an « open in a new tab » link.
The button names are editable per language too (`helpManuals.names[manualId][lang]`, same fallback;
empty = the dictionary label `app.staticPages.manuals.*`).
Tests: `test/helpManuals.test.mjs`, `e2e/help-manuals.spec.js`.

## The onboarding tour

`src/data/onboardingTour.js` holds the default tour: an entry menu (`welcome`) offering six
self-contained sequences — quick tour, review and approve a project (experts only), create, get
approved, present, find inspiration — wired together by `goTo` actions. Steps of one sequence must stay **contiguous** in the `steps` array
(the "Next" button walks the array), and each sequence ends with a menu step carrying
`showDefaultButtons: false` so it never spills into the next sequence.

Two things are load-bearing:

- **The screen a step lands on is hard-coded by step id** in the `switch (stepId)` of
  `handleOnboardingStepEnter` (`App.jsx`). Adding a step to the config without adding its `case`
  leaves it on whatever screen the previous step used. The tour runs on the demo project
  (`getDemoData()`), never on real data.
- **`version` gates the rollout.** The config is persisted in full to `localStorage` *and* to the
  published `settings.json`, so a config already stored would otherwise outlive any rework:
  `normalizeOnboardingConfig` replaces a stored config whose `version` is lower than the built-in
  one. Bumping it therefore discards back-office customisations of the tour — only do it for a
  deliberate rework. To fix one step's `target`/`placement` without a bump, list its old value
  in `SUPERSEDED_ONBOARDING_STEP_DEFAULTS` (same file): a stored step still carrying that exact
  value gets the new default, a customised one is left alone (`test/onboardingConfig.test.mjs`).

**The expert sequence (« Revoir et valider un projet », `expert-*` steps) is for compliance actors
only.** Its menu buttons carry `audience: 'compliance'`, and `handleStartOnboarding` drops them
through `filterOnboardingStepsForAudience` (`src/utils/onboarding.js`) unless the user is a team
contact or committee member (`hasScopedBackOfficeAccess`). Its steps sit at the very end of the
array, because « Précédent » on a sequence's first step walks back one slot and a non-expert must
never land in it. It plays the demo project *as an expert sees it*: while an `expert-*` step is
active, `App.jsx` hands the home and the synthesis `screenTeams` — the referential with the user
added as a contact of one team the demo triggers (`src/utils/expertTourDemo.js`) — and the
synthesis gets demo answers per stage (open / claimed / opinion to re-examine), non-editable props
and no-op write handlers. None of it reaches `teams` state or storage
(`e2e/onboarding-expert-tour.spec.js`, `test/expertTour.test.mjs`).

The tooltip carries a permanent « Aide » link to the FAQ (`helpLink` option of the vendored
`tourguide.js`, passed from `App.jsx`, opening the in-app `StaticPageDialog`): launching the guide is already asking for help, and it
used to make the only help button in the app — the one on the onboarding screen — disappear.

A step whose target selector matches nothing (or only the 1px `#tour-onboarding-anchor` of the
menu steps) dims the whole screen with no halo and centres its tooltip (vendored `tourguide.js`,
`tgjs-highlight--empty`); that is how `synthesis-vigilance` behaves, since the demo project has
no delay alert. The tooltip tries the requested side, then the opposite one, then the other two;
when none fits (a target taller than the screen, a modal) it takes the screen corner hiding the
least of the target and none of its buttons — keep that in mind before targeting a huge block.
While the tour runs on an empty inspiration base, `HomeScreen` is fed display-only examples
(`buildOnboardingDemoInspirations`), so `home-inspiration-filters` has something to show; they
are never written to state. Expert teams are collapsed by default in `SynthesisReport.jsx`, so the steps showing the
exchange thread expand them explicitly (`TEAM_EXCHANGE_TOUR_STEPS`). `e2e/onboarding-tour.spec.js`
walks all five sequences.

## Identity simulation ("Voir en tant que")

An admin can check what another person actually sees by opening the app in a **second tab** with
`?viewAs=<email>` (launcher in the back-office `Administrateurs` tab, `window.open(..., 'noopener')`).
`src/utils/impersonation.js` holds the simulated identity; `spContext.js#getCurrentUser` returns it in
place of the real session, so every role derivation (admin list, team contacts, committee membership,
project ownership, activity scope) follows with no other branch point. `getRealUser()` keeps the real
session for access checks and the banner. A second tab rather than an in-place toggle, because
`App.jsx` reads the identity once and treats it as stable for the life of the app.

`main.jsx` applies the URL param only when the **real** identity is in `adminEmails` — never the
simulated one, or simulating an admin would grant admin. It is not a security boundary and doesn't
need to be: REST calls still carry the real SPO cookies, so simulation changes what the UI computes,
never what the server returns.

While a simulation is active **every write path is neutralized**: `spRestClient.js#request` (which also
covers `CN_NotificationsQueue`, so no real Power Automate mail), `storage.js#persistState`/`flushPersistedState` (return
`ok: true` on purpose, otherwise App shows a false "storage full" banner), `savePersistedMockMap`
(showcase drafts included) and `storeLanguage`. `retryQueue.js`/`autosaveQueue.js` treat
`ReadOnlySimulationError` as non-retryable. Onboarding is skipped in simulation since completing it
would be blocked anyway. If you add a new write path, guard it too: the simulation tab shares
`localStorage` with the admin's real tab and would otherwise clobber their state.

## Project administration console

Full control over every project (other people's drafts included: edit answers, cancel a
submission, trash, restore, permanently delete even after an expert answered) lives in a
**dedicated tab**, `?adminConsole=1`, launched from the back-office `Administrateurs` tab — never in
an admin's ordinary session, so those rights can't be used by accident. `src/utils/adminConsole.js`
holds the flag; `main.jsx` sets it only when the **real** identity is in `adminEmails` and no
« Voir en tant que » simulation is active (the two modes exclude each other). `App.jsx` reads it
once (`isAdminConsole`) and it widens `canManageProject`, `isActiveProjectEditable`, the showcase
edit gates, restore/permanent delete (any trashed project, not only the owner's trash). In that
tab the home is replaced by `AdminProjectsConsole.jsx` (own chunk) under a red
`AdminConsoleBanner`; search is `src/utils/adminProjectSearch.js` (accent/case-insensitive, every
word must match, owner matches first, owner and status filters). The back-office's own
`isAdminMode` gates are unchanged. Tests: `test/adminConsole.test.mjs`, `e2e/admin-console.spec.js`.

## Where the questionnaire lets you out (showcase first)

Finishing the creation form lands on the **project showcase**, not on the compliance report:
the tool is meant to make someone think about their project, not just get it stamped. Both
exits go through `navigateToProjectShowcase` in `App.jsx` — the last question's button
(« Voir la vitrine du projet »), the mid-questionnaire « Terminer et voir la vitrine », and the
mandatory-questions interstitial's button, which is the same journey interrupted. That
interstitial only appears while a **core** question is missing (`unansweredPreliminaryQuestions`,
the same list that gates the preliminary request) — a question only required for technical
advice and validation does not stand between the author and their showcase. **Every project
has a showcase**: the project types that used to be denied one (third-party project, donation /
grant, Advisory Board) now get a showcase template instead (see below) — don't bring back a
type-based block.

The report itself is **« Enjeux du projet »** everywhere in the UI (`synthesisReport.title`,
`app.nav.reportSummaryLabel`, the home cards' « Consulter les enjeux »); the code keeps its
`synthesis` screen id, `navigateToSynthesis`, `SynthesisReport.jsx` and `synthesis-*` tour ids —
don't rename those chasing the copy. It is reached from the showcase's nav button, and
`handleReturnToComplianceReport` deliberately ignores `previousScreenRef` when it holds
`questionnaire`, so that button always opens what it announces.

## Showcase templates (one structure per project type)

`src/utils/showcaseTemplates.js` (defaults in `src/data/showcaseTemplates.js`, back-office tab
`showcaseTemplates`, `BackOfficeShowcaseTemplates.jsx`, admin-only like `faq`) lets an admin give a
project type its own showcase structure: which built-in sections are kept and in what order, what
they show and under which titles, plus blocks whose every slot says where its content comes from
(see below). A template's activation is
`{conditionGroups}` in the rules grammar, edited with the shared `ConditionGroupsEditor` and
evaluated by `evaluateRule` — so it can never drift from the rules. The first template in list order
that matches wins (the tab has up/down arrows for that). A template with no condition, or with a
condition whose question is still empty, never applies (`hasShowcaseTemplateActivation`) — the
rules engine treats an empty condition as satisfied, which would otherwise hit every project. The
activity-scope pseudo-question is deliberately excluded (`excludedQuestionIds`): it is the
*viewer's* scope, and a showcase's structure can't depend on who reads it. The legacy
`{questionId, values}` activation is still read, as one OR group. Published as the CN-Config file `showcase-templates.json`, like
`showcase-themes.json`; delta-persisted in `complianceNavigatorState` in local mode.

- **Nothing is written into the project.** `ProjectShowcase` reads its `answers` prop through
  `applyShowcaseTemplate`, which stands in for `customShowcaseSections`/`showcaseSectionOrder`
  while the project has not stored its own. Because `computeShowcaseUpdates` diffs against that
  same view, entering edit mode shows « Tout est publié » and publishing an untouched template
  writes nothing — so a template edited later reaches every showcase nobody customised, and a
  customised one belongs to its owner. Template block ids are stable
  (`template-<templateId>-<blockId>`) because a stored order may reference them while the blocks
  still come from the template.
- **A built-in section the template drops is never re-injected**: `normalizeSectionOrder` takes
  the template's built-in ids as its third argument (every call in `ProjectShowcase` passes
  `builtInSectionIds`), and the light-mode options follow the same list. `notice` can't be removed.
- **A template can say which question feeds a section.** A built-in entry may carry
  `fieldSources` (`{fieldId: questionId}`, one question per field, only the fields listed in
  `SHOWCASE_TEMPLATE_SOURCE_FIELDS` — text fields take `text`/`long_text`, choice fields
  `choice`/`multi_choice`; dates, budget, milestones, theme and project name stay fixed); a
  `highlight`/`story` block may carry `sourceQuestionId` (text or choice), which travels with the
  block once the owner stores their own sections. `ProjectShowcase` applies this as an **alias at
  its boundary**: `answers[fieldId]` reads the linked question, `questions` exposes a clone of
  it under the field id (marked `required`, so an empty answer reads « information
  manquante »), and `mapShowcaseUpdatesToSources` renames the published keys back — so editing
  in the showcase writes the questionnaire answer itself, and a choice changed there re-runs
  the risk analysis like any other answer (`handleUpdateProjectShowcaseAnswers`). Linked blocks
  use the synthetic key `buildLinkedBlockFieldId(questionId)` so they never collide with a
  built-in field. A linked question that disappears or changes type is ignored (the field
  falls back to its own question). Text fields only get the missing label outside edit chrome
  (`fillMissingSourcedTextFields`), so the draft never captures it. The impact figure also takes a
  `number` question.
- **Block slots.** A template block is `{kind: 'block', id, type, slots}`: one slot per element the
  block's layout renders (`SHOWCASE_BLOCK_SLOTS` — `accent`/`title`/`subtitle`/`description`/
  `figure` take a value, `items`/`columns` a list), each `{state: used|locked|hidden, source:
  text|question, text, questionId}`. A text may quote answers with `{{questionId}}` (a *composed*
  text). What the showcase does with a slot is `resolveSlotMode`: `owner` (plain text the owner
  rewrites — the only content copied into the section, by `buildBlockSection`), `linked` (a
  `text`/`long_text` answer, edited inline and written back to the questionnaire), `derived`
  (number, choice, date or composed text — the owner changes the answers in the inspector, not the
  slot), `locked`, `hidden` (neither rendered nor offered in the inspector). `formatSlotQuestionValue`
  is the one formatter: a number in the reader's locale with its unit (the respondent's chosen unit
  when there are several), a choice by its translated label, a multiple choice as one list item per
  ticked option (sub-options included, via `formatAnswer`). Every question a slot reads goes
  through the same alias mechanism as linked blocks (`resolveLinkedBlockFieldSources`, which skips
  `SHOWCASE_FIELD_IDS` — those are already edited under their own id). Legacy blocks
  (`title`/`description`/`sourceQuestionId`) are read as slots.
- **The template stays authoritative for its blocks' slots.** A section copies its compact slots
  (`compactBlockSlots`, kept by `sanitizeCustomSections`, which would otherwise drop a block whose
  whole content comes from the questionnaire), but `resolveSectionSlots` prefers the template's
  slots when the section id is one of its blocks (`getTemplateBlockSlots`): a slot fixed in the
  back-office reaches showcases already customised. The copy only serves once no template applies.
- **Built-in sections: hidden parts and titles.** A built-in entry may carry `hiddenParts`
  (`SHOWCASE_BUILTIN_OPTIONAL_PARTS`: slogan, badges, hero button, objectives list, impact figure,
  team lead/department/members, budget, launch countdown, compliance delays, milestones) and
  `labels` (`{eyebrow, headline}` localized, `SHOWCASE_BUILTIN_LABEL_KEYS`). A hidden part's
  inspector fields disappear too (`getTemplateHiddenFieldIds`), its `fieldSources` are ignored, and a
  section left with nothing to show disappears like an unanswered one. Everything that sits in the
  body of `renderSignatureSection` reads `isTemplatePartHidden`/`getBuiltInSectionLabel` — add a
  part there *and* in `BUILTIN_PART_FIELD_IDS`.
- **The block catalogue covers every built-in section.** Besides highlight/figure/columns/
  document/story/checklist/stack, blocks can be `cover` (the hero's composition, but its title
  is any slot — the hero's word-by-word FX rewrites the first `.sg-hero__title`, so the cover uses
  its own `.sg-cover__title`), `steps` (the roadmap rail; one `« date — texte »` entry per item,
  `STEP_LABEL_SEPARATOR`, which is exactly what `formatSlotQuestionValue` makes of a
  `milestone_list` answer, sorted chronologically), `team` (lead + roster: `subtitle` = lead,
  `description` = their role, `items` = « Nom — rôle » members) and `quote`. A slot definition
  may carry `labelKey` when the field plays another role than its name; the inspector reads the
  same mapping from `SECTION_TEMPLATE_CONFIG[type].labels`. Owners get the four new layouts in
  their section picker too.
- **Built-in sections are presets of that catalogue.** `getBuiltInBlockPreset`/
  `convertBuiltInToBlock` turn any built-in but `notice` into the equivalent block, at the same
  place: titles (the template's, else the app's in all 4 languages via `DICTIONARIES`) become
  locked text, fields (or the questions `fieldSources` put there) become question slots, hidden
  parts become hidden slots, the display condition is kept. What a block cannot recompute is
  listed in `lost` and shown before the click (hero CTA and country/environment chips, the impact
  figure — a showcase-only field, not a question —, the launch countdown, compliance delays and
  budget). Built-ins themselves stay as they are: existing templates and every showcase without a
  template render exactly as before.
- **Display conditions.** Any section of a template but `notice` may carry `displayCondition`
  (`{conditionGroups}`, rules grammar, `ConditionGroupsEditor` in a collapsed panel of its row).
  `getTemplateSectionDisplayConditions` keeps only complete ones — an empty or half-typed condition
  hides nothing, the opposite of activation, where it applies nothing — keyed by showcase section
  id, so like slots they follow the template even in a customised showcase. `ProjectShowcase`
  evaluates them on the project's answers under their real question ids, draft included
  (`sectionsHiddenByCondition`: raw answers overlaid with each editable field's draft, mapped back
  through `fieldSources`). The reader and the preview (key `P`) get no node; the editor keeps the
  section in its frame, greyed, with a « Masquée pour ce projet » badge (`SectionFrame`
  `isHiddenByCondition`). The activity scope is excluded, as for activation.
- **Back-office preview** renders the real `ProjectShowcase` (`forcedShowcaseTemplate` bypasses the
  activation) on demo answers stripped of their showcase structure, plus the per-template sample
  answers of `showcaseTemplatePreviewAnswers`, plus an invented answer per question the template
  still reads (`buildShowcaseTemplatePreviewAnswers`). Never saved. The showcase stylesheets come
  from `src/styles/loadShowcaseStyles.js`, shared with `App.jsx`.
- **The template studio** (`ShowcaseTemplateStudio.jsx`, « Éditer sur la vitrine » on each card)
  sets a template up on the real showcase: outline (order, add after the selection, remove),
  `ProjectShowcase` in the middle with `authoring={{selectedKey, onSelect, showChrome, labels}}`,
  and the selected section's settings on the right. Both the form and the studio render the same
  editors from `showcaseTemplateEditors.jsx` (`TemplateSectionSettings` — `compact` for the narrow
  inspector) and edit the template through the same pure helpers (`buildTemplateSectionKey` —
  `kind:id`, since a built-in and a block may share an id —, `updateTemplateSection`,
  `moveTemplateSection`, `addTemplateSection`, `removeTemplateSection`,
  `convertTemplateSectionToBlock`). The studio **replaces** the card list instead of covering it:
  both would render the same field ids and every label would point at the hidden copy. In
  authoring mode `ProjectShowcase` walks the *template's* sections, not `sectionOrder`, so a block
  with no content yet (which `applyShowcaseTemplate` leaves out) and a built-in that renders nothing
  with these answers still get a clickable frame (`.sga-frame`, `showcase-editor.css`); a section
  hidden by its condition is rendered greyed. The shell always carries `sg-shell--editing` there (a
  section whose layout changes was never observed by the reveal pass). Data: sample answers
  (`buildFictiveShowcaseAnswers`, or a test-bench sample project stripped of its own showcase
  structure) or none at all (« Emplacements vides »: what an owner sees first); key `P` or « Vue
  lecteur » drops the frames. Every change applies to the template at once, like the form.
- **The donation questions** (`donationAmount` — number in € —, `donationBeneficiary`,
  `donationBeneficiaryCount`, `donationPurpose`, `donationCounterpart`, `donationPaymentSchedule`,
  `donationSelectionCriteria`, all conditioned on `ProjectType = don_bourse_appel_a_projets`) feed
  the default donation template. They are ordinary questions, not `showcase` ones
  (`restoreShowcaseQuestions` does not re-inject them): a referential already published in
  SharePoint (`questions.json`, `showcase-templates.json`) keeps what it holds, so neither these
  questions nor the new donation template reach it by themselves.
- Tests: `test/showcaseTemplates.test.mjs`, `e2e/showcase-templates.spec.js`, `e2e/showcase-template-sources.spec.js`, `e2e/showcase-donation-template.spec.js`, `e2e/showcase-template-studio.spec.js`.

## The showcase editor (live canvas)

Editing the project showcase is not a form that describes the showcase — it *is* the showcase, with editing chrome laid over the real rendering. Three things follow from that, and breaking any of them silently degrades the whole thing back to a blind form:

- **`previewAnswers` is the single rendering source.** In edit mode it is `answers` overlaid with the draft (`buildPreviewAnswers` in `src/utils/showcaseEditor.js`); outside edit mode it is `answers` itself, untouched. Every display derivation in `ProjectShowcase.jsx` (slogan, theme, runway, milestones, project name…) reads `previewAnswers`, never `answers` — one derivation left on `answers` is one part of the page that stops reacting to typing. `answers` stays the reference for *publishing* (`computeShowcaseUpdates`), which is also what computes "are there unpublished changes": don't fork those two.
- **`isEditorChromeVisible` vs `isLiveEditing`.** `isLiveEditing` = editing at all; `isEditorChromeVisible` = editing *and* not in the preview toggle (key `P`). Chrome, in-place editing, unsanitized custom sections and "show sections hidden in Light view" all key off the latter, so the preview renders exactly what a reader gets.
- **`sg-shell--editing` neutralizes the reveal animations.** They are applied once by an `IntersectionObserver` in `ShowcaseSignatureFx`; a section inserted afterwards is never observed and would stay at `opacity: 0` while the user types into it.

The chrome itself lives in `src/components/showcase/` (`SectionFrame`, `SectionInserter`, `ShowcaseEditorBar`, `ShowcaseOutline`, `InlineRichText`). Template thumbnails and the hover "ghost" are the real `renderCustomSectionSignature` output scaled down — never a separate wireframe drawing, which is what made the old picker useless for judging a template. The document viewer (`document-viewer` template) accepts a dropped file in three places — the inspector field, its empty slot on the canvas, and over a document already shown (which replaces it) — all through `showcase/DocumentDropZone.jsx` and the single `handleDocumentUpload` path (same size/extension checks, same SharePoint/local switch as the file button). Two things are load-bearing: the zone reacts to **files only** (`dataTransfer.types` contains `Files`), so dragging a section handle still reaches the `SectionInserter` drop targets; and while a file hovers the page it lays a veil over its content, because an embedded `<iframe>` (PDF, Office) is another document and would swallow the drop. "File hovering the page" is detected from the continuous `dragover` stream, not a dragenter/dragleave counter, for that same iframe reason. While editing (`isLiveEditing`, preview included), `useBlockStrayFileDrops` refuses a file dropped *beside* a zone — the browser would otherwise open it and leave the SharePoint page mid-edit; it listens on `window` in the bubble phase and steps aside whenever something else already called `preventDefault`. `e2e/showcase-document-drop.spec.js` covers it. In edit chrome, an Office file (pptx/docx/xlsx, read from the URL extension — `documentType` stores every non-viewer format as `pptx`) stored in the tenant library also offers « Modifier dans … en ligne » (`Doc.aspx?action=edit`) and « Ouvrir dans l’application » (`ms-*:ofe|u|`), built by `buildOfficeEditLinks` (`documentEmbed.js`); none in local mode (a `data:` URL has nowhere to be saved back). The file is edited in place, so readers see it at once, outside the draft/publish cycle — the UI says so. Coming back to the tab remounts only that viewer's `iframe` (`documentFrameRevisions` key), never the page, so the draft and undo stack survive. Drafts are persisted per project under `complianceNavigatorShowcaseDrafts` (separate from `complianceNavigatorState`, so an unpublished draft never leaks into a shared showcase) and undo/redo runs on snapshots of `{draftValues, customSections, sectionOrder}`.

The roadmap section (`.sg-road`) has lost its separate rail element: each milestone draws its own dot (`::before`) and its own connector down to the next one (`::after`), both positioned against that row and both centred on `--sg-marker-col / 2`. That is deliberate and load-bearing. The rail used to live in the list's coordinate system while the dots lived in their row's, joined by a hand-written negative offset, so a generic `ol` reset in another file could silently pull them apart — which it did, twice. Nothing crosses two elements now, `:last-child` drops the connector so the line ends on the last dot by construction, and `ShowcaseSignatureFx` no longer recomputes rail extents in JavaScript (that pass only re-ran on window resize, so the line kept a stale height whenever the layout moved without one: entering edit mode, adding a milestone, a label wrapping to two lines). Progressive fill rides the per-row `is-on` class the IntersectionObserver already sets. `e2e/showcase-roadmap.spec.js` measures dot/connector geometry at four widths and in edit mode. Milestone order is **not** manual: `sortMilestonesChronologically` (`src/utils/showcaseMilestones.js`) puts dated entries back in date order — each one taking one of the slots already held by a dated entry, so an entry whose date is still empty never jumps away under the author's fingers — and it runs on the stored value and on the inspector draft — but **not while a date is being typed**: the inspector's date input sorts on blur/Enter (`handleMilestoneDateCommit`), because the milestone rows are keyed by index, so a sort on every keystroke moved the typed milestone to another rank while the focus stayed in the old rank's field (the next digits then landed in another milestone's date). Drag-and-drop therefore stays enabled only on rows without a parsable date; re-enabling it on dated rows offers a move the sort undoes one render later.

The multi-column custom block (`type: 'columns'`) keeps **two independent settings**: `columnCount` is the grid width (1–4, `MAX_CUSTOM_SECTION_COLUMNS`) and `columns` is the list of blocks, grown and trimmed from the inspector exactly like `items` on the checklist/stack templates. They used to be the same number — `normalizeCustomSectionColumns` padded and truncated the array to `columnCount`, which made a fourth block impossible to create and a fifth unthinkable. `.sg-grid` only honours the chosen count when the element carries `data-sg-columns`; the built-in grids (indicators…) deliberately keep the fluid `auto-fit` rule, since nobody chooses how many cards they hold.

The media gallery block (`type: 'media-gallery'`, `src/components/showcase/MediaGallery.jsx`, pure logic in `src/utils/showcaseMediaGallery.js`) holds a `media` list (`{id, kind: image|video|audio|stream, url, name, caption}`), a `captionMode` (`none`/`shared`/`per-media` — the shared caption is the block's ordinary `description`, so a template block's starting text lands there), a `captionPosition` (`left`/`right`/`below`) and a `mediaWidth` (25–100, % of the block; height follows the media's own proportions). Those four fields are only written on this block type (`sanitizeMediaGalleryFields`), never on the others. Two media or more make a carousel that only moves on click, and **only the active media is mounted** — that is what pauses a video when you leave it; don't render the other slides hidden. The width is set by dragging a handle on the media edge opposite the caption (one history step, committed on pointer-up) or by keyboard/the inspector's range input. The side caption drops under the media through a **container** query on `.sg-media-host`, not a media query: in a SharePoint page the showcase can be narrow in a wide window. Uploads reuse `createAttachmentFromFile` (several files at once, a refused file doesn't block the others); video/audio extensions are allowed app-wide in `documentStore.js`, capped at 10 MB outside SharePoint only (`MAX_LOCAL_MEDIA_SIZE_BYTES`), because local mode stores files as data URLs inside the persisted state. A Microsoft Stream item keeps the pasted URL (the `src` of a pasted embed code is extracted; https on `*.sharepoint.com`/`microsoftstream.com` only); `resolveStreamEmbedUrl` only iframes the real player URLs (`_layouts/15/embed.aspx`, classic `/video/<id>`), a sharing link is shown as an « Ouvrir dans Stream » button. The inspector warns that the video must be shared in Stream with the showcase's visitors — the app cannot check it. Tests: `test/showcaseMediaGallery.test.mjs`, `e2e/showcase-media-gallery.spec.js`.

Section colours are **the theme's own colours**, nothing else. `buildAccentFamilies(palette)` in `src/utils/showcaseAccents.js` walks `PALETTE_COLOR_KEYS` (ordered from most to least characteristic), keeps every colour that can actually act as an accent (saturation and lightness bounds; `inkMuted` is excluded outright as a text grey), and drops any that is within ΔE76 15 of one already kept or of the theme's own `accentPrimary` — which the `theme` swatch already offers as the stored-as-absent default. **Nothing is composed**: no anchor hues, no harmonies, no invented colours. The count therefore varies with the palette, from two swatches on `factenova` to the `MAX_ACCENT_FAMILY_COUNT` cap of eight on `universel`, and `resolveAccentFamily` falls back to the theme family when a stored rank is richer than the current theme. `g1` is the palette hex itself, untouched — it is what the swatch shows; `c`, `g2`, `p1`, `p2` and `onDark` are derived from it by moving lightness only, and only as far as the 4.5:1 contrast against the light panel and the dark ground (`--sg-ink`, the darker of `backgroundStart`/`inkStrong` — six of the eleven themes have a *light* page background, so the dark bands rest on the ink) requires. `test/showcaseAccents.test.mjs` pins all of that, starting with "every colour offered is declared in the palette". Both colour pickers read the same array, so "Couleur de la section" on a built-in section and the colour of a custom block offer identical swatches. **Swatches carry no colour name**, deliberately: two picks may be two shades of one hue (a burgundy and its powder pink on `hemostase`), which naming made impossible — the label is the rank (`projectShowcase.colorSwatchLabel`), which is also the stored id. **Ids are positional** (`accent-1`…`accent-8`), so a project keeps its swatch rank when the theme changes; the old named ids (`rouge`, `bleu`, …) are still read and mapped to the rank they used to occupy by `normalizeAccentFamilyId`, which every entry point goes through. Themes carry no hand-written `sectionAccentFamilies` array; don't reintroduce one. A family is a real colour, not a wash: it drives card and panel gradients, avatar rings and roster seals, not just the eyebrow tint.

Sharing a showcase produces a single opaque query parameter (`?sv=<token>`, `src/utils/showcaseShareLink.js`) that carries project id, display mode (`full`/`light`), comments toggle and post-it visibility — obfuscated and sealed with a checksum, so a recipient can no longer drop `showcaseMode=light` from the URL to reach the full view. It is deterrence, not security: everything still runs client-side. A tampered token decodes to `null` and opens nothing rather than falling back to full mode; the older plain-text params (`showcaseShared`/`showcaseMode`/…) are still *read* so links already shared keep working, but are never written again. A shared link also hides the app's `<nav>` (`shouldHideMainNav` in `App.jsx`, driven by `isShowcaseSharedView`, which is now seeded from the URL at first render so the bar doesn't flash during hydration); it comes back as soon as the visitor closes the showcase.

## Consulting compliance early (levels, uncertainty, two doors)

The whole point is that a project owner can consult compliance **before** the project is
finished, and keep changing it afterwards. Four pieces carry that, and each one degrades
gracefully to the old behaviour when its data is absent:

- **There is no project stage — only levels derived from the answers.** A declared stage
  (`framing`/`design`/`pre_launch`, once a selector in the questionnaire, stored under
  `__project_stage__`) was removed: classifying yourself is not a question about the project. No
  project writes that key any more, nothing reads it (older projects may still carry it, it is
  ignored, and it is no longer a selectable condition nor a diff entry). Don't bring a stage back
  as a second axis next to the levels: the two disagreed, which is how the preliminary door ended
  up enabled by the panel and refused at send time.
- **`question.requiredFromStage` — which level a mandatory question belongs to.** Absent or
  `framing` = the core, required from orientation on; anything else = required for technical
  advice and validation only (`getQuestionRequirementLevel` in `src/utils/projectStage.js`; the
  back-office offers exactly these two choices, and the legacy `design` value reads as the second).
  The stored values keep their old names so published referentials need no rewrite. Outside the
  readiness levels, "mandatory" means every `required` question: that is what the questionnaire
  flags. `src/utils/mandatoryQuestions.js` is the **only** definition of "this answer is filled in"
  and of "this question is mandatory" — it was copy-pasted identically into `App.jsx`,
  `QuestionnaireScreen.jsx`, `SynthesisReport.jsx` and `projectNormalization.js`, and copies that
  disagree would produce different progress counts for one project.
- **`src/utils/unknownAnswer.js` — "I do not know yet" as a real answer.** Sentinel value stored
  like any other answer, but **no condition is ever satisfied by it**, negative conditions
  included — the guard lives in *both* condition engines (`questions.js#evaluateQuestionCondition`
  and `rules.js#matchesCondition`, they are separate code paths; patching one only is the trap).
  Without that, `not_equals` would fire on an absence of information. `getUncertainRuleCoverage`
  (`uncertainCoverage.js`) is the necessary counterpart: it names the rules such an answer leaves
  in suspense, **the teams those rules would solicit, and the teams the doubt was actually sent
  to** — a doubt nobody is asked about has no chance of being lifted, so the questionnaire offers
  those teams right under the toggle and the synthesis flags an unrouted one. Routing reuses
  `questionThreads.js` rather than inventing a second solicitation path: only a thread notifies a
  team and makes it a perimeter. It is offered on the question types the rules engine reads
  (`canAnswerBeUnknown`), not on narrative fields. The synthesis's « Rappel de vos réponses »
  renders such an answer as an open point rather than as a value like any other — a doubt printed
  as plain text next to the question reads as an answer, not as something still owed to someone —
  with its recipient team, the offer to route it when it has none, and the reminder that it blocks
  the final validation. Beware `QuestionnaireScreen.jsx`'s effect that
  prunes a `choice`/`multi_choice` answer no longer among the visible options: the sentinel is not
  an option, so without its explicit guard the doubt is erased the moment it is expressed, with no
  error anywhere (that is exactly what happened, on the two types where it is most useful).
- **`src/utils/submissionKind.js` — two doors, one project.** `preliminary` vs `final`, stored in
  answers (so it needs no SharePoint column). A preliminary request only requires the orientation
  level — the core questions (`getMissingForPreliminaryRequest`, the same list that enables the
  button in `ProjectReadinessPanel.jsx`); a validation request requires everything, with a firm answer everywhere
  (`rejectUnknown`). Never split this into two project objects — answers, threads, rights and the
  showcase would all be duplicated. A favourable opinion on a preliminary request yields
  `PROJECT_VALIDATION_PRELIMINARY`, never `PROJECT_VALIDATION_VALIDATED`, and the team/owner
  notifications are distinct templates saying explicitly that guidance, not approval, is expected.

`src/utils/projectReadiness.js` turns all of this into the three levels the synthesis shows
(orientation / technical advice / validation) — they are *derived*, nothing extra to configure.
Orientation is "the questions mandatory from `framing` are answered"; **technical advice and
validation share one and the same base** — every mandatory question the project triggers — and
differ only by `rejectUnknown`: an opinion can be given on assumed "I don't know yet" answers, a
validation cannot. That is deliberate: an expert does not weigh in on the substance with a
thinner file than the one who validates; what an opinion buys you is that the project can still
change, not that fewer answers are needed. `ProjectReadinessPanel.jsx` (in the synthesis
chunk, only `SynthesisReport.jsx` imports it) renders them as one ladder with a single "what's missing" list
— one list per level made the two look like different dossiers — plus both doors, what the send
actually commits to, and the showcase as a thinking tool.

Two UI invariants that are easy to break:

- **The expert opinion card is hidden until the expert has written something** — an empty
  card reads as a missing stamp and turns an exchange into a formality. Hidden for the reader
  only (`canEditTeamComment` still sees the editor), and **auto-validated perimeters keep their
  current display unconditionally** (`isTeamAutoValidated`): nobody will ever write there, that
  card is the only compliance message those perimeters will ever have.
- **No `input[type=radio]` in the questionnaire's sidebar.** It precedes the question in the DOM,
  so radio inputs there capture any generic "select the first radio" automation aimed at the
  answer itself (a former stage selector did exactly that and silently broke the e2e autopilot).

## Consulting by waves (a preliminary request to some perimeters first)

A preliminary request can solicit only some of the detected perimeters first (teams *and*
committees): the owner consults the one that conditions the rest, adjusts, then solicits the
others on a corrected project. `src/utils/stagedConsultation.js` holds it, in `answers` under
`__staged_consultation__` (`{isActive, solicited[], waves[]}`, keys `team:<id>`/`committee:<id>`).

- **Only solicited perimeters are stored**; « à solliciter ensuite » is *derived*
  (`getDeferredPerimeters` = `getSolicitablePerimeters` minus `solicited`, while `isActive`). So a
  team an update makes appear falls into it by itself, and one no longer concerned vanishes
  without ever having been told anything. Auto-validated teams are never solicitable.
- **A deferred perimeter receives nothing and sees nothing**: skipped by
  `notifyProjectSubmission`, filtered out of every bucket of `handleSendProjectUpdate` (no update,
  no « no longer concerned » mail for a team that never heard of the project), absent from
  `HomeScreen`'s `complianceTriggeredProjects` and from the scoped back-office dashboard. The one
  exception is a team with a manual request (an anchored question): it was explicitly asked.
- **It never passes for favourable**: `projectValidationStatus` returns `partial`
  (« Consultation partielle ») while anything is deferred — below `rejected`, above everything else.
  Admins see the list in the dashboard (« Périmètres jamais sollicités »), separate from expert delays.
- **Soliciting the next wave** (`handleSolicitDeferredPerimeters`) goes through
  `handleSendProjectUpdate({ solicitKeys })` when the project changed since the last send (the
  first wave must see those changes, the new one discovers the current state), otherwise it only
  notifies the newly solicited teams and the version does not move. The marker closes itself when
  nothing is left; a validation request always closes it (`withStagedConsultationClosed`) and
  solicits everyone. There are no reminders and no admin-imposed order, deliberately.
- The chooser in `ProjectReadinessPanel.jsx` only appears with two perimeters or more, defaults to
  « tous », and uses buttons with `aria-pressed`, not radios. Tests: `test/stagedConsultation.test.mjs`,
  `e2e/staged-consultation.spec.js`.

## After submission: the project keeps living (versions, diff, targeted notifications)

Consulting compliance early is pointless if the request freezes the project. A **submitted project
stays editable by its owner** (`isProjectOpenForEditing`), and what makes that tenable for the
experts is that an update notifies only the perimeters it actually changes.

- **One snapshot, not a version history** (`src/utils/submissionHistory.js`, stored in `answers`
  under `__submission_history__`, so no new SharePoint column). It keeps the current version
  number, the answers **as of the last send**, the labels of that send's changes, and a log of
  narrative changes per version. Keeping N full answer snapshots would blow the `localStorage`
  quota long before it helped: the only question the app ever needs to answer is "what changed
  since what the experts received?". The snapshot excludes the meta keys (compliance comments
  above all — they churn constantly and weigh a lot).
- **A project submitted before this feature reads as v1 with no snapshot.** Its state at
  submission cannot be reconstructed, and inventing one would produce a lying diff. An update on
  such a project therefore asks *every* concerned team to re-review — deliberately conservative;
  later updates are targeted.
- **`answersDiff.js` is the readable diff, `perimeterImpact.js` is the truth.** The diff covers
  real questions only (that is what a human reads). The impact compares two *analyses*, never two
  answer sets — only the rules engine sees the extra checkboxes, the units and the activity scope.
  It sorts every team into exactly one of four cases: newly triggered (first solicitation, whole
  team), rules changed (re-review, claim-aware recipients), no longer concerned (told, never
  silently dropped), unchanged (**nothing sent** — this case is the whole point).
- **Narrative fields (`text`, `long_text`, `file`, `milestone_list`, `ranking`) never notify.** No
  rule reads them, so no impact can be derived; they are logged per version and surfaced to the
  expert as a count since their own review. This is the known hole that a final validation round
  is meant to close.
- **An opinion carries a version** (`perimeterReview.js`): `reviewedVersion` is stamped whenever a
  status/comment changes (a reply in the thread is not a review), `needsReviewSince` when an update
  impacts that perimeter. When the latter is greater, the perimeter is "to review again" and
  `projectValidationStatus` returns `PROJECT_VALIDATION_OUTDATED` instead of `validated` — a green
  stamp must never describe a state of the project that no longer exists.

Gotcha worth knowing: `src/` is transpiled with `const` → `var` (see the block-scoping note above),
so referencing a `const` declared **later** in the component does not throw a TDZ error — it silently
reads `undefined`.
A memo placed above `activeProject` therefore computed an empty submission history on every
render, with no error anywhere. Keep derived memos below the state they read.

## Committee sessions (calendar, registration, agenda, attendance)

Spec: `docs/specs/calendrier-comites.md` (step 1 — the app — is done; Outlook invitations by
Power Automate, steps 2–3, are not). Pure logic in `src/utils/committeeSessions.js`
(`test/committeeSessions.test.mjs`), writes in `src/hooks/useCommitteeSessionActions.js`, UI in
`src/components/committee/` (planner in the back-office committee card, `CommitteeSessionPanel`
in the synthesis committee block, `CommitteeAgendaScreen` = screen `committee-agenda`, link
`?committeeSession=<id>`). Strings in `src/i18n/dictionaries/committeeSessions/*.js`.

- **A session is a time budget, not a grid.** Passages chain from `startAt` in agenda order; the
  sum of their minutes (plus a pending time request's `heldMinutes`) is what "full" means. Owners
  book a session, never a time — their slot is indicative and they block the whole session.
  Owners only see published sessions ≥ J-3 with ≥ the committee's default passage length left;
  chairs (`presidentEmail`/`vicePresidentEmail` on the committee, or any admin) bypass both. A
  chair action that overruns is refused with `error: 'overrun'` until re-sent with
  `allowOverrun: true`, which extends the session.
- **The whole agenda lives on the session row** (`CN_CommitteeSessions.AgendaJson`). In SharePoint
  mode every action goes through `mutateSession`: re-read the row, re-apply the pure
  `applySessionAction`, write under IF-MATCH, replay on 412 — so a booking is judged on the time
  actually left. Deliberately **not** a `retryQueue`: a full session is an answer to show the
  owner now, not a write to replay later. Local mode keeps sessions in the `committeeSessions`
  slice of `complianceNavigatorState`.
- **Per-project data stays in the session**, not the project: attendance overrides
  (`passage.attendanceOverride`, only differences with the session's `attendance`), the
  « present again » request, reminders sent. The only thing written on the project is on the
  committee's compliance entry: `sessionId` + `sessionOutcomes` (opinion frozen per session),
  stamped by `stampCommitteeOpinionSessions` in `handleUpdateComplianceComments` when the opinion
  is rendered after a passage started; they travel in `ClaimJson.review` and are carried over by
  `perimeterReview.js`/`mergeComplianceComments.js` like the opinion date.
- **Agenda topics**: a passage is `kind: 'project'` (default) or `'topic'` — a chair-only free
  item (`addTopic`/`updateTopic`, `title`/`presenterEmails`/`note`; legacy free-text `presenter`
  still displayed) that takes session time like a project but has no `projectId`, no attendance
  and sends no mail. Its `presenterEmails` get the session's Outlook invitation
  (`buildTopicInvitation`); a topic without presenters invites nobody, and clearing them cancels
  the invitation already sent. Every pass that
  looks for a project's passages filters on `projectId`, so topics fall out by construction; count
  « projects » with `kind !== 'topic'`. The chair can also cancel the session from the agenda page.
- **Several passages per project and committee** (numbered, history in the synthesis); an owner
  has at most one *upcoming* passage per committee. A committee deferred by staged consultation
  cannot be booked. Trashing a project releases its upcoming passages; a project that stops
  triggering a booked committee gets a banner (`orphanCommitteePassages` in `App.jsx`) — the
  passage is never dropped silently.
- **Mails** (English, `CN_NotificationsQueue`) via `handleCommitteeSessionEvent`: chairs hear what
  owners do, owners hear what chairs do, every registered owner hears a session move/extend/
  cancel; reordering and guest changes notify nobody. Reminders (owner J-7/J-1, chair 4 weeks
  before the last published session) run in-app in **both** modes: the marker is written on the
  session first (`markReminderSent` fails with `alreadySent` on a re-read row), then the mail goes.
- **Outlook invitations for owners (step 2)** — `src/utils/committeeInvitations.js` +
  `committeeInvitationsProvider.js`, list `CN_CommitteeInvitations`. After every successful
  session action, `onSessionChanged` → `computeSessionInvitations(before, after)` describes each
  passage's invitation **as it should be** (whole session window, owner + co-owners + guests,
  `active`/`cancelled`) and `committeeInvitationsQueueRef` (a `retryQueue`, SharePoint mode only,
  never in simulation) writes it only when its fingerprint changed, bumping `Revision`. The Power
  Automate flow (PREPARATION doc, étape 5 quater) reconciles Outlook and writes back only its own
  columns (`ProcessedRevision`, `OutlookEventId`, `SyncState`…); its trigger condition
  `Revision ≠ ProcessedRevision` stops it re-triggering on itself. The invitation body carries
  neither the running order nor the passage length, so reordering/resizing sends nothing. A
  passage whose project isn't loaded is neither invited nor cancelled. `InvitationBadge` shows the
  flow's result on the agenda and in the synthesis panel.
- Tests: `test/committeeSessions*.test.mjs`, `test/committeeInvitations.test.mjs`,
  `e2e/committee-sessions.spec.js`.

## The final round before launch (and why it cannot block anything)

There is no formal gate in the organisation: nothing can technically stop a launch. The whole
design follows from that — the round's force is that it is **asked for explicitly**, **costs the
expert one click** in the nominal case, and makes a project that ships without it **visible**.

- **`src/utils/finalValidationRound.js`** holds the round (in `answers` under
  `__final_validation_round__`, like every other project-level marker — no new SharePoint column).
  The owner requests it; the app never opens one on its own, because only the owner knows they are
  launching. It is **replayable**: a launch pushed back six months opens round 2 and archives
  round 1, so a stale confirmation never passes for a current one.
- **Only perimeters that actually gave an opinion enter the round.** The check reads the *raw*
  compliance entry, which excludes auto-validated perimeters by construction — nobody will ever
  come and confirm an opinion no human wrote. Teams that never answered stay in the ordinary
  solicitation flow.
- **Re-issuing an opinion after the request counts as confirming** (`reviewedAt > requestedAt`).
  Asking an expert to click "I confirm" right after they rewrote their opinion would be a
  formality, and formalities are what make a round expensive.
- **"I need to review again" reuses the update machinery**: it sets `needsReviewSince`, so the
  perimeter shows the same "to review again" state as after a project update and the home badge
  goes `outdated`. The round stays open until a new opinion lands.
- **A launch is declared, never inferred** (`src/utils/projectLaunch.js`). `launchDate` is a
  forecast saved months earlier, and most owners wait for their confirmation before shipping —
  so deducing "launched without confirmation" from a missed date accused exactly the people who
  behave well, and a signal that is wrong about the good pupils stops being read, which destroys
  the only force this round has. The owner, an administrator, or an expert of the project's own
  perimeter can record the launch (and undo it; both gestures are kept in `history`).
- **`src/utils/launchConfirmation.js`** derives the visible signal from that declaration, the
  `launchDate` and the round: `due` → `awaiting` → `confirmed`; `late` when the announced date has
  passed while the round is still open (the delay then sits with the review, not with the owner);
  and `launched_without` **only** once someone has recorded the launch with an incomplete round —
  true by construction. The dashboard keeps the two apart in two sections, because mixing a
  reproach to the owner with a reproach to the experts makes both unreadable. `launchDate` is
  mandatory for technical advice and validation (`requiredFromStage: 'pre_launch'`), since
  nothing else can drive the reminders.
- **Reminders** (default J-30 then J-10, `0` disables, editable in the back-office's validation
  committee tab) run the same way as the claim reminders: no server, so the pass runs in the
  session of whoever opens the app — here the owner, since they are the one who decides to launch
  — and `remindersSent` keeps it idempotent. The nearest threshold wins.

## Anchored questions (asking an expert from inside the questionnaire)

The point of consulting early is to ask *while filling the form*, at the moment the doubt appears,
without submitting anything. `src/utils/questionThreads.js` holds those threads, in `answers` under
`__question_threads__` (same reason as every other project-level marker: selectable, no new
SharePoint column). A thread is `{id, questionId, teamId, createdBy, createdAt, resolvedAt,
messages[]}` — anchored to one questionnaire item and one expert team.

- **Asking solicits the team for real.** `handleAskQuestionToTeam` (`App.jsx`) writes the thread
  *and* an `addManualTeamRequest(...)` entry, which is what already makes a team a perimeter of the
  synthesis. No parallel visibility mechanism was invented: `manualTeamRequests` survives a
  recomputation of the analysis, and `HomeScreen.jsx`'s `complianceTriggeredProjects` now merges
  manually-requested teams into `relevantTeams` exactly as `SynthesisReport.jsx` already did —
  without that merge an anchored question on a still-draft project would land in nobody's queue
  (and neither did a manual team request, which this fixes too).
- **The thread is shown on both sides, in the same place each side already works**: under the
  questionnaire item for the owner (`data-tour-id="question-ask-expert"`, collapsed form + thread
  list), and inside that team's card in the synthesis for the expert, with the originating question
  label on top. A team with an **unresolved** thread defaults to *expanded* in the synthesis
  (`hasPendingQuestionThread`) — expert cards are collapsed by default, which would otherwise hide
  the very thing waiting for an answer.
- **Writing happens through `patchActiveProjectAnswers`**, not `setAnswers` alone: these threads live
  on projects that are usually still drafts, so the project entry has to be patched too or the
  thread dies with the next hydration.
- **Closing a thread belongs to whoever opened it** (`handleResolveQuestionThread` checks
  `thread.createdBy`): an expert who answered does not get to decide their answer was enough.
- Replies notify **the other side only** (`QUESTION_ASKED` towards the team via
  `resolveTeamMailRecipients`, `QUESTION_ANSWERED` back to the asker). Tests:
  `test/questionThreads.test.mjs`, `e2e/question-threads.spec.js`.

## A manager's view of their team's projects (« Mon équipe »)

A manager sees the projects of everyone below them, at every level, in a **third home tab**
(`homeView === 'team'`, between « Mes projets » and « Inspiration ») — never mixed into their own
list. `src/utils/reportingHierarchy.js` walks the org chart breadth-first through the SharePoint
user profiles' `DirectReports` (`/_api/SP.UserProfiles.PeopleManager/GetPropertiesFor`, read-only,
under the current SPO session; `mockOrgReports` in `src/data/mockOrgDirectory.js` outside SharePoint
mode), cached per tab in `sessionStorage` for 6h and capped at `MAX_REPORTING_PEOPLE` (the UI says
when the result is partial). It always queries the *current* identity, never `GetMyProperties`, so
« Voir en tant que » shows the simulated person's team.

- **One project, one place.** `selectTeamProjects` keeps projects owned by someone in the
  hierarchy and drops any the manager owns or co-owns (those stay in « Mes projets »); the public
  block drops team projects too. Cancelled submissions never show.
- **Drafts are an admin setting, private by default.** `teamVisibility: { includeDrafts }` lives in
  `settings.json` (`SETTINGS_KEYS` in `referentialStore.js`, edited in the back-office
  `Administrateurs` tab, persisted in `complianceNavigatorState` in local mode), normalized by
  `normalizeTeamVisibility`. Default `false`: consulting compliance early only works if a draft is
  not read by the hierarchy before it is sent, so opening drafts is a deliberate organisational
  choice, and the team panel says which regime applies.
- **Read-only by construction.** `renderProjectCard(project, { teamEntry })` hides every write action
  (edit, delete, duplicate, cancel, visibility), even for an admin, and carries an owner ribbon
  (« Porté par X · Équipe de Y »). Opening one — draft included — goes to the synthesis, read-only
  for a non-owner, never to the questionnaire. The showcase editor is likewise only handed
  `onUpdateAnswers` when `canEditShowcaseProject` (owner/co-owner/admin) holds: opening a showcase
  is not owning it. This grants visibility in the UI only, like every other access rule here.
- **The tab only exists for someone with reports**, is hidden during the guided tour, and is never
  restored from `complianceNavigatorState` on reload — a manager always lands on their own projects.
  Inside, `TeamProjectsPanel.jsx` adds search, one chip per direct report (sub-team) and a
  « Points d'attention » filter (rejected/outdated opinion, late or unconfirmed launch).
- Tests: `test/reportingHierarchy.test.mjs`, `e2e/home-team-projects.spec.js`.

## Deleting a project (trash, « Abandonnés »)

Deleting a project from the home screen **never removes it**: it puts a marker in its answers
(`__project_trash__`, `src/utils/projectTrash.js` — no new SharePoint column, like every other
project-level marker), the row stays and keeps its status, so restoring puts it back exactly where
it was. `App.jsx` splits `projects` into `liveProjects` (what the home, the back-office, launch
signals and the reminder passes get) and `trashedProjects` (handed to `HomeScreen` only). Iterate
`liveProjects`, or guard with `isProjectTrashed`, in any new pass over projects — a trashed project
must not reach a queue, a reminder or a dashboard.

- **The owner's trash** (button next to the project count in « Mes projets ») lists trashed projects
  with *Restaurer* and *Supprimer définitivement*.
- **Permanent deletion is real only while no expert has answered** (`canPermanentlyDeleteProject`:
  a status, a comment, or a thread reply from someone other than the owner/co-owners — or, when
  known, from a contact of that team/committee — on the *raw* compliance entry, so auto-validation
  and a bare claim never count). It then goes through the old hard-delete path, satellite lists
  included. Once an expert has answered, the same button only stamps `purgedByOwnerAt`: the project
  leaves the owner's trash but survives for the experts — their work is not the owner's to erase.
- **« Abandonnés »** is a tab of the experts' triggered-projects section: every trashed project
  (in the owner's trash or purged from it) on which one of *that person's* teams/committees has
  answered. A trashed project nobody answered is invisible to experts.
- **A link never opens a trashed or deleted project** — shared showcase (`?sv=`), `?showcase=` or a
  notification's synthesis link alike. The pending-link effect in `App.jsx` routes it to
  `SubmissionCancelledNotice` with `reason: 'trashed'`, or `'missing'` once the project list has
  really loaded (`sharePointSync.state` in `local-only`/`synced`/`partial` — never while loading or
  after a failed load, which would announce a deletion that didn't happen). The one exception is
  the synthesis link for an expert who answered (`isRespondingExpert`), consistent with « Abandonnés ».
- Tests: `test/projectTrash.test.mjs`, `e2e/project-trash.spec.js`.

## Project validation status (home cards)

`src/utils/projectValidationStatus.js` aggregates the per-perimeter compliance statuses of one
project into a single verdict, used by the badge on every submitted project card in
`HomeScreen.jsx`. The perimeters that must weigh in are the teams in `analysis.teams` plus the
committees `getTriggeredValidationCommittees(...)` returns; a triggered committee with
`commentRequired === false` never blocks the verdict, but its `rejected` still counts. `validated`,
`validated_with_conditions` and `not_concerned` all count as favourable — `pending_information` and
an empty status do not. One `rejected` anywhere wins over everything else.

Two deliberate choices: a project with no perimeter at all returns `none` and the card keeps its
plain « Synthèse finalisée » badge rather than claiming a validation nobody gave, and the badge
*replaces* that status badge instead of sitting next to it (the submission date already says the
project is submitted, so the card's single badge slot carries the information that is actually
missing; the counts stay in the `title` tooltip). Don't add a second badge here.

## Per-member triggering inside an expert team

A team with several contacts can route each solicitation: `src/utils/teamMemberRules.js` holds one
optional entry per member (`team.memberRules`, persisted as `MemberRulesJson` on `CN_Teams`) made of
a `mode` (`include` = contacted only if the criteria match, `exclude` = contacted unless they match,
`never` = never contacted, unconditionally) and the very same `conditionGroups` shape the rules use —
`evaluateRule` from `src/utils/rules.js` is what evaluates them, so both grammars can never drift
apart. A contact with no entry is always contacted, which is what makes the whole feature
backward-compatible: with no entry anywhere, `resolveTeamRecipients(team, answers)` returns exactly
`normalizeTeamContacts(team)`.

`never` needs no `conditionGroups` to be a real entry — `isMemberRuleMeaningful` in
`teamMemberRules.js` keeps it in `normalizeTeamMemberRules` on the mode alone, unlike `include`/
`exclude` (see below). It exists for someone who should keep ordinary access to the team's settings
and projects (routing narrows recipients, never access — same invariant as the other two modes) but
must stop receiving notifications altogether, e.g. someone on long-term leave with no single backup.
Because it's unconditional it also never counts towards `hasUnconditionalTeamMember`, so an
all-`never` team still raises the `allConditional` coverage warning. Reassigning *away from* a
`never` member (`reassignTeamMemberRule`) resets both its mode and its conditions on the source, not
just the conditions — otherwise the freed member would stay silently blocked.

Three things are deliberate here:

- **Recipients are narrowed, access is not.** `App.jsx` (submission mail, compliance-comment mail)
  and `SynthesisReport.jsx`'s displayed contact line go through `resolveTeamRecipients`; the
  `normalizeTeamContacts` calls that decide *who may comment or review* (`complianceTeamIdsForUser`,
  thread authorship, `hasScopedBackOfficeAccess`) stay on the full contact list. A member who isn't
  solicited for one project must still be able to open it, or removing yourself from a mail routing
  would lock you out of your own team's back-office.
- **An entry without conditions is not an entry — except `never`.** `normalizeTeamMemberRules` drops
  `include`/`exclude` rules with no condition and rules whose email is no longer a team contact, so
  an address removed and later re-added never silently inherits invisible old criteria. Note that
  `conditionGroups` present but empty is authoritative in this module (`resolveMemberConditionGroups`)
  — the legacy flat `conditions` fallback in `normalizeRuleConditionGroups` would otherwise resurrect
  the criteria the admin just cleared. `never` is the one mode kept with zero conditions, by design.
- **The back-office warns when nobody is unconditional, and offers the way out.**
  `getTeamMemberCoverageWarning` returns `allConditional` as soon as every remaining contact carries
  criteria: there is then a set of answers for which the team solicits nobody. The teams tab renders
  it as a standing `role="alert"` on the card rather than a toast, so it shows up the moment a member
  is removed *and* stays until someone fixes the routing. The alert embeds a reassignment control
  (`reassignTeamMemberRule`): moving one member's criteria onto another frees the first, who becomes
  unconditional again — which is why that single action always clears the warning. The target's own
  criteria are overwritten, so the alert says so before the click.
  `e2e/backoffice-team-member-routing.spec.js` covers all of it.

The criteria panel itself is `src/components/ConditionGroupsEditor.jsx`, extracted so the member
modal is a reuse of the rules grammar rather than a fourth copy of it (`RuleEditor.jsx` and the
validation-committee block in `BackOffice.jsx` still carry their own inline copies). Only `BackOffice.jsx` imports it, so it rides in the
back-office chunk.

## Taking a project in charge (claim / take-over)

When several contacts of the same expert team are triggered on a project, one of them can **take it
in charge**: the project then leaves the others' « À traiter » list and the following exchanges only
notify the person handling it. `src/utils/projectClaims.js` holds all of it, `src/utils/businessDays.js`
the (Mon–Fri, no holiday calendar) delay arithmetic, and `src/utils/teamMemberProfile.js` the two
per-person settings this feature needs.

- **The unit is the perimeter, never the project.** A claim lives in
  `answers['__compliance_team_comments__'].teams[teamId].claim`, right next to that perimeter's
  compliance status, because a project can trigger several teams and one person can be a contact of
  two of them. Counts and tab routing are therefore computed per perimeter (`openPerimeters` in
  `HomeScreen.jsx`); a project only leaves « À traiter » when **every** still-open perimeter of that
  person is claimed by someone else.
- **Recipients are narrowed, access is not** — same invariant as `teamMemberRules.js`, and the two
  compose in one direction only: `resolveClaimAwareRecipients` starts from `resolveTeamRecipients`,
  so a claim can only ever shrink an already-routed list. `resolveClaimCopyRecipients` intersects
  with it too, so a voluntary copy never resurrects a member the routing excluded. A claim never
  changes who may open, comment or take over, and it never influences
  `projectValidationStatus.js` — it is routing, not validation.
- **Committees are not claimable** (deliberate: a committee deliberates). A committee perimeter
  always counts as « mine », which is why a project whose team side is claimed can still sit in a
  committee member's queue.
- **The claim is implicit.** Posting a compliance comment, setting a status, or replying in the
  thread claims the perimeter (`injectImplicitClaims` in `App.jsx`) — without it the queue never
  empties, because nobody clicks a button before doing the work. Three guards: only a contact of
  that team claims (the project owner replying claims nothing), a perimeter already claimed by
  someone else is **never** taken over silently (the comment goes through, the claim does not move,
  and the UI says so), and only compliance-side changes count (`status`/`comment`/a reply written by
  that person), never a reply from the owner.
- **Taking over is open to every contact of the team**, with no permission gate — a lock only the
  absent person could open is exactly the failure mode to avoid. What replaces the gate: a mandatory
  reason, an entry in `claimHistory`, and a **non-disableable** email to the dispossessed person and
  the team. Releasing (`CLAIM_ACTION_RELEASE`) mails the team, since the project becomes everyone's
  business again.
- **Copies are opt-out per person and per team** (`userProfiles.TeamPreferencesJson`), **on by
  default**: a contact routed on the project (the copy list is intersected with
  `resolveTeamRecipients`) must learn that a colleague took it, so they know it is not theirs to
  handle. Only an explicit refusal (`claimCopy: false`) is stored; an absent profile or entry means
  "receives it". They cover the take-in-charge announcement **only** — not the exchanges that follow
  (use followers for those), or the checkbox brings back the very email volume the feature removes.
  They are sent in `to` and not `cc`
  because there is no primary recipient (the new owner is the actor, whom `notify` filters out).
- **The first submission mail still goes to the whole team.** You cannot claim a project you never
  heard of; only absence substitution applies there (`resolveTeamMailRecipients`).
- **Staleness is signalled, never auto-released.** `ClaimStaleDays` (6 business days) flags the card,
  `ClaimReminderDays` (3) emails the owner; `0` disables either. There is no server, so the reminder
  pass runs in the session of *any* contact of the team who opens the app — deliberately not only the
  owner's, since an absent owner opens nothing. `claim.reminderSentAt`, re-armed by any new activity
  on the perimeter, is what makes that pass idempotent.
- **A claim held by someone who is no longer a contact is surfaced, not cleaned up** (`isOrphanClaim`,
  standing `role="alert"` on the team card with a reassignment control). This is the opposite of what
  `normalizeTeamMemberRules` does with orphan routing criteria, and on purpose: stale criteria are
  noise, work in progress is not. Removing a contact who still holds claims opens a dialog first
  (reassign / put back in the queue), it never orphans them silently.
- **A perimeter nobody took in charge is reminded once** (`getUnclaimedReminderState`): no claim, no status, same `ClaimReminderDays` as the stale-claim reminder, counted from the solicitation (`lastSentAt`, or the manual request date) or the last activity. The whole team is mailed (`PERIMETER_UNCLAIMED_REMINDER`, English), `unclaimedReminderSentAt` on the perimeter entry makes it single until new activity. Like the stale-claim pass it runs in-app in local mode only; the SharePoint side would need its own Power Automate flow (not written).
- **Transfer is a voluntary hand-over, initiated by the current assignee** (`CLAIM_ACTION_TRANSFER`, « Transférer à… » on the team card of the synthesis, next to the followers block). Only the assignee (or an admin) can give a perimeter, only to another contact of the same team, and it is immediate: nothing to accept. No mandatory reason (unlike a take-over) — an optional free text goes in `reasonNote` and in `claimHistory`. The giver leaves the project: neither assignee nor follower (`applyClaimAction` drops both the giver and the receiver from `followers`, the receiver being the assignee now). Only the receiver is mailed (`PERIMETER_TRANSFERRED`, non-disableable, with the free text as excerpt); neither the giver nor the team is. Access is untouched: the giver stays a team contact and can still open and comment. Tests: `test/projectClaims.test.mjs`, `e2e/project-transfer.spec.js`.
- **Absence lives in the profile, not in `memberRules`**: those conditions are evaluated against a
  project's answers and know nothing about dates. `AbsenceJson` carries the period and a backup (who
  must be a contact of the same team to receive anything), and it is editable by a third party from
  the back-office — an unplanned absence is never declared by the person who is away.
- **Followers widen recipients on one project** (`src/utils/perimeterFollowers.js`, `followers` next
  to `claim` in the team's compliance entry, carried in `ClaimJson` on `CN_ComplianceComments` — no
  new column). Any contact of the team (or an admin) adds a colleague from the team card of the
  synthesis, just above « Points à préparer ». A follower must already be a team contact, so it
  grants no access; what it changes is mail: `resolveTeamRecipients` adds followers even when member
  routing excludes them, `resolveClaimAwareRecipients` sends to assignee + followers, and a follower
  keeps a claimed project in « À traiter ». The synthesis editor never edits followers:
  `preservePerimeterFollowers` restores them on every comment save. Tests:
  `test/perimeterFollowers.test.mjs`, `e2e/perimeter-followers.spec.js`.
- Tests: `test/projectClaims.test.mjs`, `test/teamMemberProfile.test.mjs`, `e2e/project-claim.spec.js`.

## The rules/questions engine (the risk-critical logic)

This is where correctness matters most and where tests exist:

- `src/utils/questions.js` — `shouldShowQuestion` and condition evaluation (operators: equals/not_equals/contains/lt/lte/gt/gte; groups with `all`/`any` logic). Adaptive visibility lives here.
- `src/utils/rules.js` — `analyzeAnswers(answers, rules, riskLevelRules, riskWeighting)` returns `{ triggeredRules, teams, notifiedTeams, questions, risks, riskScore, timeline, complexity, ... }`. `riskScore` is the sum of triggered risk weights.
- `src/utils/conditionGroups.js` normalizes the legacy `conditions`/`conditionLogic` shape into `conditionGroups`; both are kept for back-compat.
- Referential **data** is in `src/data/rules.js` (~4k lines) and `src/data/questions.js` (~3.8k lines) — edited via the back-office UI, persisted into `complianceNavigatorState`.

Any change touching these must keep `npm test` green; the tests pin scoring behavior against the demo project (`src/data/demoProject.js`).

## A click must not make the clicked thing disappear (stable order, leaving, reordering)

A list sorted by « last updated » reorders the card you just acted on (claiming a project rewrites
its `lastUpdated`, so it jumped to the top, often out of the screen). Three behaviours, picked per
case — keep using them for any new list/action instead of inventing another one:

- **Stays in place** — `src/hooks/useStableList.js` (pure logic in `src/utils/stableOrder.js`, tests
  `test/stableOrder.test.mjs`). The sorted order is applied on arrival and when `resetKey` changes
  (tab, filter, search, sort); afterwards items already shown keep their slot, new ones are inserted
  after their sorted predecessor, vanished ones leave. Used for the experts' « À traiter » tabs, « Mes
  projets » / submitted lists (before pagination, so a card never changes page under the cursor),
  the synthesis team cards (an expert's saved opinion no longer sinks the card they just edited),
  « Mon équipe » and the trash dialog. `useTransientHighlight` + `.cn-halo` flash the acted-on card.
- **Leaves, and says where it went** — `animateLeave: true` keeps a removed item rendered for ~280ms as
  a ghost (`isLeaving(id)`, skipped under `prefers-reduced-motion`) inside `CollapseItem.jsx`, which
  carries the `role="listitem"` (a grid-rows collapse; don't put the role on the card inside). Own
  actions that move an item to another view raise an `ActionToast` (home: take-over → « Voir dans
  À traiter », trash → « Annuler » / « Ouvrir la corbeille », restore → « Voir », cancelled submission).
  « Voir » switches tab/page and scrolls via the `pendingReveal` effect in `HomeScreen.jsx`. In the
  synthesis, saving the opinion on your last open perimeter says the project moves to « Traités »
  (`perimeterResolution.js`). The per-team save message now renders under the card header: it used to
  sit inside the editor form and the collapsed card, both closed by the save, so it was never seen.
- **Slides** (reorder arrows) — `src/hooks/useReorderFeedback.js`: FLIP slide, focus kept on the moved
  item's button (or its enabled sibling at a boundary), `scrollIntoView` (`start` for items taller than
  80% of the viewport), `.cn-moved` halo and an `aria-live` announcement (`common.feedback.movedPosition`).
  Mark each card `data-reorder-key` and its buttons `data-reorder-action` (with a `scope`, the attributes
  become `data-reorder-<scope>-key/-action`, so a nested list's card isn't animated twice). Index-keyed
  rows (question options, milestones) don't move their DOM node: pass the **destination** index as the key
  so the focus and halo follow the item. Wired on the FAQ, showcase templates (+ sections), the studio
  outline, the showcase canvas sections, question options/sub-options and milestones.

Styles live in `src/styles/cn-motion.css` (`cn-` prefix, injected in `mountApp`). `e2e/ux-stable-position.spec.js`
records every order change during a claim with a `MutationObserver`: the unfixed code reorders for ~500ms
then another effect reorders it back, so asserting only the final order proves nothing.

## Generated files — never hand-edit

- `harness/dist/` ← `npm run build:harness` (git-ignored); `spfx/lib`, `spfx/dist`, `spfx/release`, `spfx/sharepoint/solution` ← `npm run spfx:build`
- `src/data/mockSharePointProjects.js`, `mockSharePointInspirations.js` ← `scripts/sync-mock-sharepoint-data.js` (source of truth: `mock-sharepoint-lists/*.json`)
- `src/styles/tailwind-internal.css` ← `scripts/generate-tailwind-lite.js`. It scans literal `class="..."` attributes *and* the static fragments of template literals / class-name constants, so dynamically-built class names are picked up too. Two warnings are printed at the end of the build and must stay empty: **"Classes Tailwind sans regle"** (a hard-coded class that produces no CSS — add the rule in `baseRule()`) and **"Classes non reconnues"** (a class matching no known prefix and defined in no stylesheet — add its prefix to `knownPrefix` if it is Tailwind, or to `customClassPrefixes` if it is a project class). Run with `--strict` to make either one fail the build.

## Conventions

- No comments unless the "why" is non-obvious (hidden constraint / workaround). Existing components are near comment-free.
- Rich text is sanitized through an allow-list in `src/utils/richText.js` before any `dangerouslySetInnerHTML` — route user HTML through it, don't bypass.
- Rules of Hooks matters here: several components are huge; never place an early `return` before hooks (a real bug of this kind was fixed in `QuestionnaireScreen.jsx` using a stable sentinel + guard-after-hooks). `npm run lint` enforces `react-hooks/rules-of-hooks`.
- Memoize any array/object built with `.filter()`/`.map()`/`.slice()` that a `useEffect` depends on, or that effect refires on *every* unrelated render of that component (a new array reference each time never equals the previous one). A real instance of this in `SynthesisReport.jsx` (`relevantTeams` computed inline, feeding an effect that rebuilds `complianceCommentDrafts` from whatever's already persisted) made the compliance status `<select>` functionally unusable — any re-render, including the one caused by picking a status, instantly reset the draft back to empty before it could be saved. Fixed via `useMemo`; watch for the same pattern elsewhere in the huge components.
- Back-office access has a second, finer gate beyond the shared password: in `BackOffice.jsx`, `allowedTabIds` collapses the UI to a restricted "scoped compliance lead" view (only `dashboard`/`teams`/`rules`/`complianceReview`/`validationCommittee`, filtered to that person's own teams/committees) for anyone who isn't in `adminEmails` but *is* listed as a team contact or validation-committee member — with **no on-screen explanation** and the `Administrateurs` tab itself hidden, so there's no way back through the UI except removing yourself from that team/committee again. It's pure display filtering (the underlying `questions`/`rules`/`teams` state is untouched, verified via `complianceNavigatorState`), not data loss — but if you're setting up a test/demo session as a team contact or committee member, add that email to `adminEmails` *first* or you'll immediately lose the rest of the back-office.
