-- Internal handling notes must be distinguishable from replies the reporter sees.
-- Defaulting to false keeps every existing reply public, which is what it already was.
ALTER TABLE "TicketReply"
  ADD COLUMN IF NOT EXISTS "isInternal" BOOLEAN NOT NULL DEFAULT false;
