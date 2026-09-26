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
  components/            Shared UI (MatrixInput, SizeSelector, header)
  lib/linalg/            Pure math helpers (matrix types, determinant, parsing)
  tools/
    registry.ts          List of all tools
    components/          One component per tool
```

## Adding a tool

1. Create a client component in `src/tools/components/`, e.g. `InverseTool.tsx`.
   Reuse `MatrixInput` and helpers from `src/lib/linalg/`.
2. Register it in `src/tools/registry.ts` — either add a new entry or set
   `component` on an existing placeholder (entries without a component are shown
   as "Soon").

The tool page at `/tools/<slug>` and the home page card are generated automatically.
`src/tools/components/DeterminantTool.tsx` is a complete example.

## Deployment

The app is ready for [Vercel](https://vercel.com/new): import this GitHub repository
and keep the default Next.js settings — no environment variables are required.
All tool pages are statically prerendered, so any Node.js host running
`npm run build && npm run start` works as well.
