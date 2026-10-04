import assert from "node:assert/strict";
import { test } from "node:test";
import { batchShiftSchema, planningDateSchema, singleShiftSchema, slotsOverlap, weeklyTemplateSchema } from "./shiftValidation";

test("real dates and 24-hour times are required", () => {
  assert.equal(planningDateSchema.safeParse("2026-02-30").success, false);
  assert.equal(planningDateSchema.safeParse("2028-02-29").success, true);
  for (const [startTime, endTime] of [["25:00", "26:00"], ["09:70", "12:00"], ["18:00", "09:00"], ["09:00", "09:00"]]) {
    assert.equal(singleShiftSchema.safeParse({ employeeId: "employee", date: "2026-10-05", startTime, endTime }).success, false);
  }
});
test("adjacent services are allowed, overlapping services are rejected", () => {
  assert.equal(slotsOverlap({ startTime: "09:00", endTime: "12:00" }, { startTime: "12:00", endTime: "15:00" }), false);
  const payload = { employeeId: "employee", dates: ["2026-10-05"], slots: [{ startTime: "09:00", endTime: "13:00" }, { startTime: "12:00", endTime: "15:00" }] };
  assert.equal(batchShiftSchema.safeParse(payload).success, false);
  payload.slots[1].startTime = "13:00";
  assert.equal(batchShiftSchema.safeParse(payload).success, true);
});
test("a batch deduplicates dates and requires at least one day", () => {
  const payload = { employeeId: "employee", dates: ["2026-10-06", "2026-10-05", "2026-10-06"], slots: [{ startTime: "11:00", endTime: "15:00" }] };
  assert.deepEqual(batchShiftSchema.parse(payload).dates, ["2026-10-05", "2026-10-06"]);
  assert.equal(batchShiftSchema.safeParse({ ...payload, dates: [] }).success, false);
});
test("recurring split services preserve day grouping and reject overlaps", () => {
  const entries = [{ dayOfWeek: 0, startTime: "11:00", endTime: "15:00" }, { dayOfWeek: 0, startTime: "18:00", endTime: "23:00" }];
  assert.equal(weeklyTemplateSchema.safeParse({ entries }).success, true);
  assert.equal(weeklyTemplateSchema.safeParse({ entries: [...entries, entries[0]] }).success, false);
  assert.equal(weeklyTemplateSchema.safeParse({ entries: [] }).success, true);
  assert.equal(weeklyTemplateSchema.safeParse({ entries: [{ ...entries[0], dayOfWeek: 7 }] }).success, false);
});
