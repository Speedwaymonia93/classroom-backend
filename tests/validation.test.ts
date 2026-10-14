import assert from "node:assert/strict";
import test from "node:test";
import { positiveInteger, validDepartmentId } from "../src/validation.js";

test("query IDs reject arrays, fractions, overflow and non-decimal formats", () => {
  for (const invalid of [undefined, null, "", " ", "1.5", "1e2", "0x10", "-1", "0", "Infinity", "2147483648", ["1"], {}, true]) {
    assert.equal(positiveInteger(invalid), undefined, String(invalid));
  }
  assert.equal(positiveInteger("2147483647"), 2147483647);
  assert.equal(positiveInteger("1"), 1);
});
test("pagination enforces its maximum", () => {
  assert.equal(positiveInteger("100", 100), 100);
  assert.equal(positiveInteger("101", 100), undefined);
});
test("JSON departmentId requires a number fitting the foreign key", () => {
  assert.equal(validDepartmentId(1), true);
  for (const invalid of ["1", 0, -1, 1.5, 2147483648, null, [], true]) assert.equal(validDepartmentId(invalid), false);
});
