// PostgreSQL integer primary keys and foreign keys are signed 32-bit values.
export function positiveInteger(value: unknown, maximum = 2147483647): number | undefined {
  if (typeof value !== "number" && (typeof value !== "string" || !/^\d+$/.test(value))) return undefined;
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 && number <= maximum ? number : undefined;
}

export function validDepartmentId(value: unknown): value is number {
  return typeof value === "number" && positiveInteger(value) !== undefined;
}
