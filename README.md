# FUSPI Website & CMS

Custom multilingual website and CMS for Fakultas Ushuluddin dan Pemikiran Islam, UIN Sultan Maulana Hasanuddin Banten.

## Stack

- Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui
- Prisma 7 + PostgreSQL
- Auth.js Credentials with database sessions
- next-intl: Indonesian, English, Arabic/RTL
- Vitest + Playwright

The complete product specification starts at [`docs/README.md`](docs/README.md). Multi-model implementation rules are in [`docs/24-implementation-plan-multi-model.md`](docs/24-implementation-plan-multi-model.md).

## Local setup

```bash
cp .env.example .env.local
npm install
npm run prisma:generate
npm run dev
```

Use a separate database, port, temporary upload directory, branch, and Git worktree for each AI lane. Do not run multiple agents in the same checkout.

## Quality gates

```bash
npm run ci:quick
npm run ci:merge
npm run ci:milestone
```
