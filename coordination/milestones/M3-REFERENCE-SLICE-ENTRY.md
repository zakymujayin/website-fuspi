# M3 Reference Slice Entry

Status: **M3 active — Post and Media admin transport runtimes reviewed and merged**

M3 starts from the accepted M2 development head
`f83a00e6816a91f72b9ade654b012be8a1a0b2d0`. That head passed GitHub Actions run
`29460510481`. The integration branch is `integration/m3-reference-slice`.

M3 delivers one complete Post + Media + i18n vertical slice and freezes the reusable content
pattern before M4 expands the CMS. Opening M3 does not waive deployment/go-live evidence still
tracked by the M2 exit contract.

## Activation order

1. **GPT contract freeze (merged):** define the Zod and TypeScript boundary for Post, Media,
   locale fallback, ownership, optimistic versioning, autosave, publish/schedule/archive, and
   safe public reads. No route, action, UI, dependency, or schema change is included.
2. **GPT runtime slice (merged):** after the contract merges, implement the server-only service,
   authorization, transaction, revision, upload commit/rollback, and public query boundaries.
3. **Claude public experience (merged):** implement the bounded `/berita` list/detail reference
   experience against the frozen public query contract, including ID/EN/AR fallback presentation,
   RTL, accessibility, metadata, JSON-LD, responsive states, and safe rich-text rendering.
4. **DeepSeek public experience QA (accepted):** the initial independent browser pass found one
   WCAG AA sidebar-date contrast defect. Claude corrected it in a bounded UI task; the final
   PostgreSQL-backed retest passed 60/60 across Chromium and mobile with all ID/AR axe scans green.
5. **Admin transport/editor slice (Post and Media runtimes merged):** the GPT-owned Berita/Post/Media admin
   transport contract and Post admin runtime passed independent DeepSeek adversarial review with
   no Critical/High defect. The batch-upload response gap is now closed and independently reviewed;
   the Media admin runtime is also independently reviewed and merged with no Critical/High defect.
   The next bounded lane is Claude's admin editor/Media Library presentation, followed by executable
   ownership/IDOR browser evidence.
6. **Integrator gate:** merge serially, run the full PostgreSQL and browser suites, reconcile the
   carried security cases, then freeze the reference pattern for M4.

Claude and DeepSeek may work only from a newly committed task manifest and non-overlapping frozen
assignment branch. They must not infer permission from this entry document or a chat prompt alone.

## Carried mandatory security evidence

M3 cannot close until executable tests prove:

- EDITOR list/detail/mutation ownership and negative-ID IDOR rejection;
- session, permission, ownership, and record-scope checks in every loader/action/route;
- CSRF rejection for every new Post and Media mutation boundary;
- required ID translation, deterministic EN/AR fallback, and no duplicate fallback results;
- rich-text sanitization on write and safe render against stored XSS;
- optimistic conflict rejection for update and 30-second draft autosave;
- publish-now, future scheduling, archive, and public `publishedAt <= now()` behavior;
- Media ownership plus staged-file rollback/orphan cleanup when the database transaction fails;
- upload validation remains bound to the M2 storage contract.

## M3 exit gate

The milestone is complete only when the Post reference slice works end to end for ADMIN and
EDITOR, public ID/EN/AR and Arabic RTL paths pass, accessibility and metadata checks pass, the
full CI pipeline is green, and no Critical/High security finding remains. M4 stays closed until
the GPT integrator records that evidence in a dedicated M3 exit contract.
