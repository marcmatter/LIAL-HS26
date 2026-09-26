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

- **Vector & Matrix Operations (3D)** — vector addition, scalar multiplication, linear
  combinations and the dot product; matrix × vector (as a combination of columns and as a
  transformation of space); matrix addition and scalar multiplication. Every result is
  computed step by step and drawn in a rotatable 3D (or 2D) view.
- **Determinant**
- **Gauss-Jordan (interactive)** — row-reduce with your own row operations, exact fractions.

## Adding a tool

1. Create a client component in `src/tools/components/`.
   Reuse `MatrixInput`, `Scene3D` and the helpers from `src/lib/linalg/`.
2. Register it in `src/tools/registry.ts`.

The tool page at `/tools/<slug>` and the home page card are generated automatically.

## Deployment

The app is ready for [Vercel](https://vercel.com/new): import this GitHub repository
and keep the default Next.js settings — no environment variables are required.
All tool pages are statically prerendered, so any Node.js host running
`npm run build && npm run start` works as well.
