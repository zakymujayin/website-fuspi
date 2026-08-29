/**
 * Support contacts shown on the PPKS reporting page, required by
 * `docs/14` section D3.
 *
 * The national entries below are transcribed from that document, not composed
 * here. D4 is explicit that an agent must not invent regulatory or service
 * details, so anything the project has not verified stays `null` and the page
 * simply omits it. An empty block is honest; a plausible-looking wrong number
 * sends someone in distress to nobody.
 *
 * Before go-live the project owner must confirm the faculty and university
 * Satgas details with Satgas PPKS UIN SMH Banten and fill them in here.
 */

export type PpksContact = Readonly<{
  /** Message key under the `Ppks` namespace describing who this reaches. */
  labelKey: string;
  phone: string | null;
  email: string | null;
  url: string | null;
}>;

/** Emergency numbers. Transcribed from docs/14 D3. */
export const PPKS_EMERGENCY_CONTACTS: readonly PpksContact[] = Object.freeze([
  Object.freeze({labelKey: "contactPolice", phone: "110", email: null, url: null}),
  Object.freeze({labelKey: "contactSapa", phone: "129", email: null, url: null}),
]);

/**
 * Faculty and university Satgas PPKS. Unverified, therefore empty.
 * Fill in only from details confirmed with the Satgas itself.
 */
export const PPKS_INSTITUTIONAL_CONTACTS: readonly PpksContact[] = Object.freeze([]);

export const hasInstitutionalPpksContact = PPKS_INSTITUTIONAL_CONTACTS.length > 0;
