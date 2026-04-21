# Skills

This folder contains **SKILL** documents — focused, in-depth guides describing the conventions, structure, and best-practice usage for each major framework or library used in **iothub-controller**. Each skill lives in its own subdirectory with a `SKILL.md` file.

These documents are written specifically for *this* repository — the patterns, file paths, helper utilities, and integration points described here are the ones actually in use. They serve as authoritative onboarding/reference material for both human contributors and AI coding agents.

> **Note on naming:** The repository's primary web framework is **Next.js 16.2.4** (see `package.json`). The skill is named `nextjs/` accordingly. (If you came here looking for "Nest.js" — that's a different framework not used by this project.)

## Tech stack at a glance

| Area               | Library / Tool                              | Version  |
| ------------------ | ------------------------------------------- | -------- |
| Web framework      | Next.js (App Router)                        | 16.2.4   |
| UI runtime         | React / React DOM                           | 19.2.x   |
| Component library  | shadcn/ui (style: `new-york`)               | n/a      |
| Icons              | lucide-react                                | 0.574.x  |
| CSS framework      | Tailwind CSS                                | 3.4.x    |
| Theming            | next-themes                                 | 0.4.x    |
| ORM                | Prisma                                      | 5.22.0   |
| Database           | MongoDB                                     | —        |
| Language           | TypeScript                                  | 5.x      |
| Custom server      | Node `http` + `next` + `socket.io` + `ws`   | —        |
| Auth               | JWT (`jose`), `bcryptjs`, `iron-session`    | —        |
| Security           | `csrf-csrf`, `express-rate-limit`           | —        |
| Logging            | Winston + `winston-daily-rotate-file`       | 3.19.x   |
| IoT                | `@azure/event-hubs`, `azure-iothub`         | —        |

## Skill index

| Skill                                      | Topic                                                                              |
| ------------------------------------------ | ---------------------------------------------------------------------------------- |
| [nextjs](./nextjs/SKILL.md)                | Next.js 16 App Router conventions, custom server, route handlers, middleware       |
| [shadcn](./shadcn/SKILL.md)                | shadcn/ui setup, registered components, adding new components, variant patterns    |
| [tailwind](./tailwind/SKILL.md)            | Tailwind v3 config, CSS variables / theme tokens, dark mode, the `cn()` helper     |
| [prisma](./prisma/SKILL.md)                | Prisma + MongoDB schema, client singleton, generation, migrations (`db push`)      |
| [typescript](./typescript/SKILL.md)        | Dual `tsconfig` setup, path aliases, strictness, server-vs-client typing patterns  |
| [azure-iot](./azure-iot/SKILL.md)          | IoT Hub provisioning, Event Hubs telemetry consumer, MessageEnvelope               |
| [authentication](./authentication/SKILL.md)| JWT sessions, password hashing, CSRF, rate limiting, role-based access             |
| [websockets](./websockets/SKILL.md)        | `ws` device sockets, Socket.IO UI sockets, connection manager                      |
| [logging](./logging/SKILL.md)              | Winston configuration, log levels, daily-rotated files, audit log                  |

## How to use these skills

* **Reading:** Each `SKILL.md` is self-contained. Start with the *Overview* section, then jump to the section relevant to your task.
* **Updating:** When you change something architectural (add a major dependency, change a config, introduce a new convention), update the relevant skill(s) in the same PR.
* **Adding a new skill:** Create `skills/<topic>/SKILL.md`, follow the structure of the existing skills (Overview → Where it lives → Conventions → How-to → Pitfalls → References), and add a row to the index above.

## Conventions that apply across all skills

* **Path aliases:** Use `@/components`, `@/lib`, `@/components/ui`, `@/hooks` (see `components.json` and `tsconfig.json`). Never use deep relative imports like `../../../lib/foo`.
* **Server vs. client code:** Files importing Node-only modules (`fs`, `http`, `ws`, Prisma) must run on the server. Mark client components with `"use client"` at the top.
* **Don't commit secrets:** All runtime configuration goes through `.env` (see `.env.example`). Never hard-code connection strings, IoT Hub keys, or JWT secrets.
* **Logging over `console.log`:** Use the `logInfo` / `logError` / `logWarn` helpers from `lib/logger.ts` for anything that runs on the server (see [logging skill](./logging/SKILL.md)).
