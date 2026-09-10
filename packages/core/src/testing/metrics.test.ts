import { test } from "node:test";
import assert from "node:assert/strict";
import { cpl, cpm, ctrLink, percentagePointDiff, percentChange, weightedCpl } from "../metrics.js";

test("zero denominator yields an explained unavailable result, never Infinity", () => {
  const result = cpl(500, 0);
  assert.deepEqual(result, { unavailable: true, reason: "denominador zero ou inválido" });
});

test("cpm and ctr compute correctly with real denominators", () => {
  assert.deepEqual(cpm(1000, 200000), { value: 5 });
  assert.deepEqual(ctrLink(400, 20000), { value: 2 });
});

test("percentage points and percent change are not conflated", () => {
  // CTR went from 2% to 2.7%: +0.7 p.p., but a +35% relative change
  assert.ok(Math.abs(percentagePointDiff(2.7, 2) - 0.7) < 1e-9);
  const relative = percentChange(2.7, 2);
  assert.ok("value" in relative);
  if ("value" in relative) {
    assert.ok(Math.abs(relative.value - 35) < 0.01);
  }
});

test("weighted CPL is computed from totals, not an average of per-campaign CPLs", () => {
  // Campaign A: CPL 50 (spend 500, leads 10). Campaign B: CPL 200 (spend 200, leads 1).
  // A naive average would say 125; the correct weighted CPL from totals is 700/11 ≈ 63.6.
  const result = weightedCpl([
    { spend: 500, leads: 10 },
    { spend: 200, leads: 1 },
  ]);
  assert.ok("value" in result);
  if ("value" in result) {
    assert.ok(Math.abs(result.value - 700 / 11) < 0.001);
  }
});
