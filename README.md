# LIAL-HS26 · Linear Algebra Tools

A [Next.js](https://nextjs.org) app collecting helper tools for Linear Algebra.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Script              | Purpose                          |
| ------------------- | -------------------------------- |
| `npm run dev`       | Start the dev server             |
| `npm run build`     | Production build                 |
| `npm run start`     | Serve the production build       |
| `npm run lint`      | Run ESLint                       |
| `npm run typecheck` | Generate route types and run tsc |

## Project structure

```
src/
  app/                   Routes (home page lists tools, /tools/[slug] renders one)
  components/            Shared UI (MatrixInput, SizeSelector, Scene3D, header)
  lib/linalg/            Pure math helpers (matrices, vectors, fractions, row operations)
  tools/
    registry.ts          List of all tools
    components/          One component per tool
```

## Tools

- **Practice Arena** — endless generated exercises for the SW01 topics (vector addition,
  linear combinations, dot product, length, matrix addition, matrix × vector, determinant,
  linear systems) with instant checking, hints and worked solutions. Difficulty adapts to
  your mastery; each topic also has a 60-second sprint. SW03 adds matrix multiplication,
  transpose, inverse and LU decomposition.
- **Vector & Matrix Operations (3D)** — vector addition, scalar multiplication, linear
  combinations and the dot product; matrix × vector (as a combination of columns and as a
  transformation of space); matrix addition and scalar multiplication. Every result is
  computed step by step and drawn in a rotatable 3D (or 2D) view.
  Since SW03 also **matrix × matrix** (click an entry of AB to see row · column, AB vs. BA,
  AB as "first B, then A" in 3D) and **special matrices**: identity, transpose, inverse
  (with the null vector of a singular matrix) and permutation matrices (P·A vs. A·P).
- **LU Decomposition (LR-Zerlegung)** — PA = LU step by step with elimination matrices E_ij,
  row swaps when a pivot is 0, then Ax = b by forward and back substitution; exact
  fractions, lecture examples (Folie 18/19/24/26) and a quiz mode for the multipliers l_ij.
- **Determinant**
- **Gauss-Jordan (interactive)** — row-reduce with your own row operations, exact fractions.

## Adding a tool

1. Create a client component in `src/tools/components/`.
   Reuse `MatrixInput`, `Scene3D` and the helpers from `src/lib/linalg/`.
2. Register it in `src/tools/registry.ts`.

The tool page at `/tools/<slug>` and the home page card are generated automatically.

## Languages

The whole app is available in **English and German** — switch with **EN | DE** in the header.
The choice is stored in `localStorage` (`lial-lang`); without a stored choice the browser
language decides, and all open tabs switch together. Texts live next to their translation:
`t("English", "Deutsch")` in components (`useT()` from `src/lib/i18n/lang.ts`) and
`L("English", "Deutsch")` for data such as the tool registry, exercises and badges
(`src/lib/i18n/text.ts`).

## Gamification

Progress lives in the browser (`src/lib/game/progress.ts`, localStorage — no account, works
offline, per device):

- **XP and levels** (Scalar → Vector → … → Vector-Space Master) for correct answers, with
  a bonus for first-try streaks and half points when a hint was used.
- **Mastery stars** per topic (3 / 8 / 15 correct), which also raise the difficulty.
- **Daily streak** and **badges** (`src/lib/game/badges.ts`), including discovery badges in
  the 3D tool (orthogonal vectors, a flattening matrix, watching a transformation).
- **Gauss-Jordan challenge**: every matrix has a *par* (the steps of a standard
  Gauss-Jordan elimination); reaching reduced row echelon form earns 1–3 stars.

## Offline use (PWA)

The app is an installable Progressive Web App. The start page has an **Install app** button:
it opens the browser's install dialog where supported (Chrome, Edge, Android), shows the
Share → "Add to Home Screen" steps on iPhone/iPad, and is hidden when the app is already installed.

- **Offline:** on the first visit the service worker (`src/app/sw.js/route.ts`) saves every
  tool page plus its JS/CSS. All tools then work without internet.
- **Updates:** every build gets a new version (`NEXT_PUBLIC_APP_VERSION`, set in
  `next.config.ts`) that is baked into `/sw.js`. Whenever the device comes back online,
  returns to the app, or once an hour, the app checks for a new version and downloads it
  in the background, including any newly added tools. The start page reloads itself; on a tool
  page a "Reload" prompt appears so no input is lost. The footer shows the version and
  a "Check for updates" button.
- New tools are cached automatically: the page list comes from `src/tools/registry.ts`.
- The service worker is only registered in production builds (`npm run build && npm run start`).

## Deployment

The app is ready for [Vercel](https://vercel.com/new): import this GitHub repository
and keep the default Next.js settings — no environment variables are required.
All tool pages are statically prerendered, so any Node.js host running
`npm run build && npm run start` works as well.
