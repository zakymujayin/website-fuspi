# ADR-0002 — Auth.js Dependency and Contract Boundary

- Status: proposed for M2 implementation review
- Date: 2026-07-13
- Owner: GPT Platform

## Context

FUSPI requires Credentials authentication with opaque database sessions that can be revoked. JWT fallback, public registration, OAuth, magic links, and password reset are outside v1. M0 intentionally deferred Auth.js because its then-current optional Nodemailer peer was affected by an advisory.

Next.js 16 separates authentication, session management, and authorization; recommends secure checks close to the data source; and treats Proxy as an optimistic redirect layer. Auth.js supports Next.js 16 `proxy.ts`, while its Credentials guide states that Credentials data is not persisted automatically. Installing an adapter therefore does not prove the required Credentials database-session flow.

## Decision

Pin, without ranges:

- `next-auth@5.0.0-beta.31`
- `@auth/prisma-adapter@2.11.2`
- `bcryptjs@3.0.3` (pre-existing password primitive, now pinned because it directly
  participates in credential verification and timing equalization)

Registry metadata resolves both packages to `@auth/core@0.41.2`. `next-auth` declares compatibility with Next `^16.0.0` and React `^19.0.0`. Nodemailer and WebAuthn packages are optional peers; none are installed because this contract uses Credentials only and SMTP belongs to the transactional outbox workstream.

The selected Auth.js release remains beta. It is a candidate contract, not permission to ship without integration tests. The implementation task must demonstrate:

1. Credentials success creates an opaque `Session` database record with an eight-hour expiry.
2. The cookie is HttpOnly, Secure in production, SameSite=Lax, Path=/, and carries no role/PII.
3. Revocation, user deactivation, password change, and role change invalidate sessions transactionally.
4. Every secure loader/action/handler revalidates the database session and active user; Proxy is redirect UX only.
5. Failed, inactive, unknown-email, and rate-limited authentication does not disclose account existence.
6. Protected Server Actions/APIs return the generic typed `SESSION_INVALID` result without
   exposing expiry/revocation reasons or technical errors.

If Auth.js Credentials does not create the database session automatically, GPT must implement the documented custom create/revoke path and test it. Changing to JWT is prohibited.

## Audit evidence

`npm audit` after installation reports zero Critical/High and five Moderate findings. None originate from Auth.js, `@auth/core`, the Prisma adapter, or Nodemailer. The Moderate findings are the pre-existing Next/PostCSS and Prisma development-tool chains recorded in M0. `npm audit fix --force` is rejected because its proposed downgrades are incompatible with the frozen platform.

## Rejected alternatives

- Unpinned `next-auth@latest`: rejected because the v5 line is beta and reproducibility is required.
- JWT session fallback: rejected because sessions must be centrally revocable.
- Installing Nodemailer now: rejected because Credentials does not need it and application email uses the outbox.
- Implementing routes/config now: rejected until the contracts and permission matrix receive cross-review.
- Better Auth migration: outside the frozen v1 architecture and requires a separate owner decision and ADR.

## Primary references

- https://authjs.dev/getting-started/installation?framework=next-js
- https://authjs.dev/getting-started/authentication/credentials
- https://authjs.dev/getting-started/adapters/prisma
- `node_modules/next/dist/docs/01-app/02-guides/authentication.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`
