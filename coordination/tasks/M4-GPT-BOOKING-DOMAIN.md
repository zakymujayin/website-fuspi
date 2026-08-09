---
id: M4-GPT-BOOKING-DOMAIN
milestone: M4
owner: gpt
reviewer: backend-wave-review
tester: gpt
base_branch: integration/m4-features
base_sha: b6f8f2887f3196bc4c7632f1eac17695dd7faaef
allowed_paths:
  - "src/features/booking/**"
  - "src/app/api/admin/rooms/**"
  - "src/app/api/public/rooms/**"
  - "src/app/api/public/bookings/**"
forbidden_paths:
  - ".env*"
  - "package*.json"
  - "prisma/**"
readonly_paths:
  - "prisma/schema.prisma"
  - "src/lib/db/**"
  - "src/contracts/**"
risk: high
token_class: L
status: merged
---

# Booking and Room management

Room CRUD with translations/operating hours/blackouts.
Booking creation with Serializable overlap detection and P2034 retry.
Public room availability and booking submission with tracking tokens.
Optimistic locking for approval/rejection/cancellation.
Jakarta-timezone display, UTC storage.

Files:
- src/features/booking/domain.ts (38.8K)
- src/app/api/admin/rooms/route.ts
- src/app/api/public/rooms/route.ts
- src/app/api/public/bookings/route.ts
