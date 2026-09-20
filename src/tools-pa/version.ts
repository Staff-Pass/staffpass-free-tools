/**
 * Package-level version constants, read by `scripts/build-tools-bundle.mjs`
 * for the bundle manifest (spec §5.6): `version` identifies this module's
 * own API/behaviour, `RULES_VERSION` identifies the legal-research snapshot
 * the catalog (`rules/catalog.ts`) was transcribed from — the "Fecha de
 * consulta de todas las fuentes" in `docs/panama-legal-rules.md` — and the
 * contract template's own version/date live in `contract/fields.ts`.
 *
 * Bump `TOOLS_PA_VERSION` on any change to this module's public API or
 * calculation behaviour; bump `RULES_VERSION` only when the catalog is
 * re-derived from a newer legal-research pass over
 * `docs/panama-legal-rules.md`.
 */
export const TOOLS_PA_VERSION = '1.0.0';
export const RULES_VERSION = '2026-09-14';
