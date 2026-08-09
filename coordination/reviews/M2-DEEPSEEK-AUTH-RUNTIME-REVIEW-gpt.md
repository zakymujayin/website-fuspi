# M2 — GPT Integrator Review of DeepSeek Auth Runtime Review

## Metadata

- Reviewed branch: `ai/deepseek/m2-auth-runtime-review`
- Reviewed head: `a50fc78`
- Runtime candidate: `1a138d8`
- Review verdict: **REQUEST_CHANGES**
- Source disposition: no GPT runtime defect proven by this gate

## Blocking findings

### High — claimed MariaDB gate does not pass

Running the manifest acceptance command with the project MariaDB environment produced
three failures in `tests/security/auth-runtime/auth-adversarial.integration.test.ts`:

1. The concurrent rate-limit scenario and the later session-issuer scenario share the same
   email/IP key and fixed window. The first scenario blocks that key, so the second never
   reaches `issueSession()`.
2. The deactivation and password-change scenarios create sessions expiring at
   `2026-07-14T03:01:00Z`. They are already expired relative to the runtime clock used by
   `getActiveActor()`, so both mutations return `SESSION_INVALID`.

Observed gate result: 13 passed and 3 failed. This contradicts the durable handoff, which
records the integration suite as entirely skipped and nevertheless marks acceptance PASS.
A critical auth review cannot be approved using a skipped database gate when a configured
MariaDB service is available.

### High — required HTTP boundary is not exercised

The manifest explicitly requires exercising `POST /api/auth/credentials` against MariaDB.
The added tests invoke primitives such as `authenticateCredentials()` directly; they do not
call the route handler and therefore do not verify its status mapping, JSON boundary,
response headers, cookie serialization, safe redirect behavior, or that rejected CSRF
requests leave counters and sessions unchanged.

The correction must add focused route-level integration coverage. It must not edit the
writer's route or runtime source.

## Accuracy corrections

### Low — default HTTPS port observation is false

The review claims `https://fuspi.uinbanten.ac.id:443` mismatches the same origin without an
explicit port. WHATWG URL normalization removes the default HTTPS port; both values produce
the same `.origin`. Add an executable regression assertion and remove this residual risk.

### Low — terminology and evidence overclaims

- `HDAC`/`HLAC` in the review and handoff must be `HMAC`.
- The review should distinguish coverage inherited from GPT writer tests from new independent
  coverage.
- Do not claim timing-distribution, browser-cookie persistence, or endpoint behavior unless
  it was executed. Record these accurately as residual or untested areas.
- Replace command results and test counts with exact correction-run evidence.

## Required re-review outcome

DeepSeek may retain `APPROVE` only after all manifest commands pass from the correction
branch, `npm run test:integration` runs against MariaDB without skipping the auth suites,
the route-level boundary is covered, and the review/handoff match the observed evidence.
Any source defect discovered during correction must be reported as `REQUEST_CHANGES`; it
must not be fixed in the DeepSeek lane.
