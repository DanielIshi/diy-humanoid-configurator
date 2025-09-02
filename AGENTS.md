# Repository Guidelines

## Project Structure & Module Organization
- Root: `diy_humanoid_configurator_v_0_7_p_1_3_4.jsx` — legacy/prototype JSX. Keep changes minimal; do not couple it to the Vite app.
- App: `frontend/` — Vite + React 18 project.
  - Config: `vite.config.js`, `package.json` (scripts below).
  - Source: prefer `frontend/src/` for components, hooks, and utilities.
  - Static assets: place files in `frontend/public/` (served at `/`).
- Docs: `DEV_PLAN.md` for planning and context.

## Build, Test, and Development Commands
Run these from `frontend/`:
- `npm run dev`: start Vite dev server with HMR.
- `npm run build`: create production build in `frontend/dist/`.
- `npm run preview`: serve the built app locally for verification.

Testing is not configured in `package.json`. If adding tests, prefer Vitest + React Testing Library and add a `test` script.

## Coding Style & Naming Conventions
- Indentation: 2 spaces; keep lines focused and readable.
- React components: `PascalCase` files in `frontend/src/components/` (e.g., `RobotPanel.jsx`).
- Hooks/utilities: `camelCase` (e.g., `useConfigurator.js`, `formatDimensions.js`).
- Styling: Tailwind CSS and PostCSS are available; co-locate classnames in JSX, avoid oversized utility chains.
- Imports: use relative paths within `frontend/src/`; avoid deep index barrels unless beneficial.

## Testing Guidelines
- Location: `frontend/src/**/__tests__/` or co-located `*.test.jsx` files.
- Scope: cover configuration logic, critical UI flows, and boundary cases.
- Data: use small, explicit fixtures; avoid network calls in tests.
- Goal: prefer fast, deterministic unit tests; add light component tests.

## Commit & Pull Request Guidelines
- Commits: small, imperative messages (e.g., `feat: add joint presets`). Prefer Conventional Commits (`feat`, `fix`, `chore`) when reasonable.
- PRs: clear description, linked issues, screenshots/GIFs for UI, and notes on risks, migrations, or env vars.
- Keep unrelated refactors out of feature PRs; follow-up separately.

## Security & Configuration Tips
- Secrets: store in `frontend/.env.local`; never commit. Vite exposes `import.meta.env.VITE_*` only.
- Review third-party code before adding dependencies; keep the dependency set lean.

## Agent-Specific Notes
- Prefer building new features in `frontend/`; treat the root JSX as legacy until explicitly migrated.
- When editing build or config, verify `npm run build` and update this file if behavior changes.

