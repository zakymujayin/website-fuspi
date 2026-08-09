# Archived MariaDB migrations

These files are immutable historical evidence from the pre-production MariaDB baseline. They
are intentionally outside `prisma/migrations` and must never be passed to Prisma Migrate or
applied to PostgreSQL. The active history begins at the PostgreSQL baseline in
`prisma/migrations` under ADR-0003.

If an external MariaDB database contains real data, migrate it with the explicit ETL and
reconciliation runbook in `docs/08-deploy-hostinger.md`; do not execute either provider's SQL
against the other database.
