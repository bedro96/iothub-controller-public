# Skill: Next.js 16 (App Router + Custom Server)

## Overview

This project runs **Next.js 16.2.4** using the **App Router** (`app/` directory) with **React 19**. Unlike a default `next start` deployment, the production runtime is a **custom Node.js server** (`server.ts`) that mounts Next.js alongside a `socket.io` server and a native `ws` WebSocket server on the same HTTP port. Most of the app surface area lives in `app/` (pages and route handlers), with shared server utilities in `lib/` and reusable React components in `components/`.

## Where it lives

| Path                       | Purpose                                                                        |
| -------------------------- | ------------------------------------------------------------------------------ |
| `app/`                     | App Router: pages (`page.tsx`), layouts (`layout.tsx`), route handlers (`api/*/route.ts`) |
| `app/layout.tsx`           | Root layout — wraps everything in `ThemeProvider` (dark mode) and app `Providers` |
| `app/providers.tsx`        | Client-side context providers                                                  |
| `app/globals.css`          | Global Tailwind directives + CSS variables for the shadcn theme                |
| `app/api/*/route.ts`       | API route handlers (request/response, server-only)                             |
| `middleware.ts`            | Edge/Node middleware — wires CSRF + rate limiting before requests hit handlers |
| `server.ts`                | Custom Node entry — `next({ dev })` + `socket.io` + `ws` on one HTTP server    |
| `next.config.ts`           | Next.js configuration                                                          |
| `tsconfig.json`            | TS config for the Next app                                                     |
| `tsconfig.server.json`     | Separate TS config that **compiles `server.ts` + `lib/**`** with CommonJS to `dist/` |

## How requests flow

1. Browser → Node `http` server in `server.ts`.
2. `server.ts` peeks the URL: if it starts with `/ws/`, it's handed to the native `ws` `WebSocketServer` (device sockets). Otherwise it goes to Next.
3. Next runs `middleware.ts` first (CSRF, rate limiting — see [authentication skill](../authentication/SKILL.md)).
4. Next dispatches to the matching App Router route (`app/.../page.tsx` for HTML, `app/api/.../route.ts` for JSON APIs).
5. Socket.IO is mounted on the same server for browser-side realtime — see [websockets skill](../websockets/SKILL.md).

## Conventions

### Server vs. client components

* All files in `app/` are **server components by default** in Next 16 / React 19.
* Add `"use client"` as the very first line *only* when you need state, effects, browser APIs, or React context (e.g., theme toggle, charts, forms with local state).
* **Never** import server-only modules (`fs`, `crypto`, Prisma, `lib/iothub-consumer`, native `ws`) into a client component — it will break the build or leak secrets.

### Route handlers (`app/api/*/route.ts`)

* Export an async function per HTTP verb: `export async function GET(req: NextRequest) { ... }`.
* Return `NextResponse.json(...)`; don't return raw `Response` unless you need streaming.
* Read auth from the `session` cookie via `verifyToken` from `lib/auth.ts` — see [authentication skill](../authentication/SKILL.md).
* Use `prisma` (singleton from `lib/prisma.ts`) for database access — never instantiate `new PrismaClient()` directly in a handler.
* Always `try/catch` and call `logError(error, { route: '...' })` from `lib/logger.ts`; return a sanitized error JSON, never the raw stack.

### Layouts and pages

* `app/layout.tsx` is the root layout — it imports `globals.css`, sets `<html lang="en" suppressHydrationWarning>`, wires `ThemeProvider` (`attribute="class"`) and `Providers`. Don't duplicate these in nested layouts.
* Page-level metadata is exported as `export const metadata: Metadata = { ... }`.
* Co-locate page-specific UI helpers next to the `page.tsx`, but if a component is reused across pages, move it under `components/`.

### Path aliases

`tsconfig.json` defines `@/* → ./*`. **Always** import via aliases:

* `@/components/...`, `@/components/ui/...`
* `@/lib/...`
* `@/hooks/...` (also aliased through `components.json`)

Avoid `../../../` deep relative imports.

### Middleware

`middleware.ts` is a single Next middleware that:

* Skips Server Action POSTs from stale bundles by redirecting to GET.
* Applies `csrfProtection` and `rateLimiters` from `lib/`.
* Lets static and `_next/*` paths bypass.

If you add a new public-API route, decide whether to add it to the bypass list (`shouldBypassCSRF` / `shouldBypassRateLimit` in `lib/csrf.ts` / `lib/rate-limit.ts`) — don't disable middleware globally.

## How-to: common tasks

### Add a new page

1. Create `app/<route>/page.tsx`. Default-export a function that returns JSX.
2. If the page needs to be interactive, add `"use client"` at the top.
3. Reuse layout from the nearest `layout.tsx`; only add a new `layout.tsx` if the subtree needs distinct chrome or providers.

### Add a new API endpoint

1. Create `app/api/<resource>/route.ts`.
2. Implement the verbs you need (`GET`, `POST`, `PUT`, `DELETE`).
3. Authenticate inside the handler (read `session` cookie → `verifyToken`).
4. Validate inputs explicitly (type-check `await req.json()` fields).
5. Return `NextResponse.json({...}, { status: ... })`.
6. Add structured logging via `logInfo` / `logError`.

### Run the app

```bash
npm run dev          # nodemon → server.ts (Next + socket.io + ws together)
npm run dev:next     # plain `next dev` (no custom socket layer; rarely used)
npm run build        # next build  +  tsc --project tsconfig.server.json
npm start            # NODE_ENV=production node dist/server.js
npm run lint         # ESLint (next core-web-vitals)
```

### Build pipeline

* `next build` produces the `.next/` Next.js artifact.
* `tsc --project tsconfig.server.json` compiles `server.ts` + `lib/**/*.ts` to `dist/` as CommonJS.
* Production starts via `node dist/server.js`, which then loads the standalone-style Next handler.

## Pitfalls

* **Don't run `next start` in production** — the WebSocket server in `server.ts` won't be running. Always use `npm start` (which runs `dist/server.js`).
* **`AsyncLocalStorage` polyfill** is at the very top of `server.ts`. Don't reorder imports — Next's invariants require it before `import next from 'next'`.
* **Vue is in `package.json`** (`vue`, `vue3-toastify`) but the actual UI is React. Treat Vue packages as legacy; don't add new Vue code.
* **Two TS configs.** Files compiled by `tsconfig.server.json` (i.e., `server.ts` and everything under `lib/`) must be compatible with **CommonJS / ES2019** — avoid top-level `await`, `import.meta`, JSX, etc. in `lib/`. UI code under `app/` and `components/` uses the main `tsconfig.json` (ESNext).
* **API responses must be JSON-serializable.** Don't return `Date` or `BigInt` directly without converting (Prisma may return both).

## References

* `server.ts` — custom server entry
* `middleware.ts` — global middleware
* `next.config.ts`, `tsconfig.json`, `tsconfig.server.json`
* `app/layout.tsx`, `app/page.tsx`
* Next.js docs: <https://nextjs.org/docs>
