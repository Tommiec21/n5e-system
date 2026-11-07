/**
 * Degree of success: one resolver for Genjutsu four-tier saves and toolkit "beat by 5" tables.
 * Concept from PF2e's DegreeOfSuccess (Apache 2.0); this implementation is N5e-specific.
 *
 * KB 10: Critical Success = beat the DC by 5+; Success = beat the DC; Failure = fail to meet or beat;
 * Critical Failure = 5+ below. The exact-DC case is open (A33); core rule "meet or beat = success"
 * is used, so a total equal to the DC is a Success.
 */
export const DEGREE = { CRITICAL_FAILURE: 0, FAILURE: 1, SUCCESS: 2, CRITICAL_SUCCESS: 3 };
export const DEGREE_KEYS = ["critFailure", "failure", "success", "critSuccess"];

/**
 * @param {number} total
 * @param {number} dc
 * @param {object} [options]
 * @param {number} [options.natural]      the d20 face (20 on a save always passes)
 * @param {boolean} [options.isSave=true]
 * @param {number} [options.shift=0]      n5e.saveTier.shift: moves the result up/down
 * @param {number} [options.margin=5]
 */
export function degreeOfSuccess(total, dc, { natural, isSave = true, shift = 0, margin = 5 } = {}) {
  let degree;
  if ( total >= dc + margin ) degree = DEGREE.CRITICAL_SUCCESS;
  else if ( total >= dc ) degree = DEGREE.SUCCESS;
  else if ( total <= dc - margin ) degree = DEGREE.CRITICAL_FAILURE;
  else degree = DEGREE.FAILURE;
  degree = Math.max(0, Math.min(3, degree + shift));
  if ( isSave && natural === 20 && degree < DEGREE.SUCCESS ) degree = DEGREE.SUCCESS;
  return { degree, key: DEGREE_KEYS[degree] };
}
