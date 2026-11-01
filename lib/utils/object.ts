// Drops keys whose value is `undefined`. Keys whose declared type never included
// `undefined` stay required; keys typed `T | undefined` (zod .optional() output)
// become optional-and-present-or-absent. Needed wherever such a result is passed
// into a Supabase insert/update under exactOptionalPropertyTypes, which requires
// truly-absent keys rather than keys present with an undefined value.
type StripUndefined<T> =
  { [K in keyof T as undefined extends T[K] ? never : K]: T[K] } &
  { [K in keyof T as undefined extends T[K] ? K : never]?: Exclude<T[K], undefined> }

export function stripUndefined<T extends object>(obj: T): StripUndefined<T> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) result[key] = value
  }
  return result as StripUndefined<T>
}
