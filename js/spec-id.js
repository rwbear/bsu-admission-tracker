/**
 * Specialty ids must be unique across monitoring tables.
 * Legacy snapshots used uni:faculty:spec:plan and collided when the same
 * specialty+plan appeared on budget and paid (or military) tables.
 */

/**
 * @param {object} spec
 * @returns {object}
 */
export function withFormScopedId(spec) {
  if (!spec || typeof spec !== 'object') return spec;
  const form = String(spec.form ?? '');
  const id = String(spec.id ?? '');
  if (!form || !id) return spec;

  const uni = String(spec.universityId || id.split(':')[0] || 'sb-bsu');
  const prefix = `${uni}:`;
  const rest = id.startsWith(prefix) ? id.slice(prefix.length) : id;

  if (rest === form || rest.startsWith(`${form}:`)) {
    const scoped = `${prefix}${rest}`;
    return scoped === id ? spec : { ...spec, id: scoped };
  }

  return { ...spec, id: `${prefix}${form}:${rest}` };
}

/**
 * @param {object | null | undefined} payload
 * @returns {object | null | undefined}
 */
export function normalizeUniversityPayload(payload) {
  if (!payload || typeof payload !== 'object') return payload;
  const specialties = payload.specialties;
  if (!Array.isArray(specialties)) return payload;
  return {
    ...payload,
    specialties: specialties.map((s) => withFormScopedId(s)),
  };
}
