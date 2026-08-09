# ADR-0003 — PostgreSQL on VPS supersedes MariaDB/Hostinger database baseline

- Status: accepted
- Date: 2026-07-15
- Supersedes: database and hosting assumptions in ADR-0001

## Context

The owner selected a VPS deployment and PostgreSQL for the long-term FUSPI platform. The
existing implementation was still pre-production and used a MariaDB-specific Prisma driver,
provider, migration history, database tests, CI service, and deployment documentation.
Continuing with both providers would duplicate migrations and weaken test evidence.

## Decision

- PostgreSQL is the only application database provider after this migration.
- Use a supported PostgreSQL major consistently across development, CI, staging, backup
  restore drills, and production; PostgreSQL 17 is the initial tested baseline.
- Use Prisma's PostgreSQL provider with `@prisma/adapter-pg` and an explicit connection pool.
- Replace the active pre-production MariaDB migration history with one PostgreSQL baseline.
  Preserve the old SQL unchanged in a clearly labelled archive that is never executed.
- Use separate database roles and databases per environment. Production does not use a
  superuser application connection.
- Require TLS for remote/staging/production database connections. Local loopback development
  may run without TLS.
- Keep Moodle, if added later, in a separate database and role. It must not share FUSPI tables,
  migration history, or direct database access.

## Consequences

- MariaDB-specific packages, parsing, CI services, environment examples, and gates are removed.
- Historical handoffs and reviews remain unchanged as records of tests that ran at the time.
- Current source-of-truth plans and milestone gates must refer to PostgreSQL.
- Deploying on Hostinger Business is no longer the locked platform assumption; VPS operations,
  PostgreSQL backup/restore, storage persistence, SMTP, cron, TLS, and monitoring require fresh
  staging evidence.
- This is a provider cutover, not an in-place SQL conversion. If real MariaDB data exists before
  production, migrate it through an explicit export/transform/import/reconciliation runbook.
