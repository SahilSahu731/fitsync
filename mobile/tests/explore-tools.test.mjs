import test from "node:test";
import assert from "node:assert/strict";

import {
  estimatedOneRepMax,
  workoutVolume,
  calculatePlates,
  warmupLoads
} from "../src/features/explore/tools.ts";

test(
  "1RM estimator handles valid and invalid repetition ranges",
  () => {
    assert.equal(
      estimatedOneRepMax(60, 1),
      60
    );

    assert.equal(
      estimatedOneRepMax(60, 10),
      80
    );

    assert.equal(
      estimatedOneRepMax(60, 13),
      null
    );

    assert.equal(
      estimatedOneRepMax(-1, 8),
      null
    );
  }
);

test(
  "volume is only computed for valid inputs",
  () => {
    assert.equal(
      workoutVolume(3, 8, 50),
      1200
    );

    assert.equal(
      workoutVolume(3, 8, -50),
      null
    );

    assert.equal(
      workoutVolume(2.5, 10, 50),
      null
    );
  }
);

test(
  "plate calculator balances both sides and handles unachievable targets",
  () => {
    assert.deepEqual(
      calculatePlates(60, 20)?.perSide,
      [
        {
          weight: 20,
          countPerSide: 1
        }
      ]
    );

    assert.equal(
      calculatePlates(63, 20)?.actualTotal,
      62.5
    );

    assert.equal(
      calculatePlates(15, 20),
      null
    );

    assert.equal(
      calculatePlates(20, 20)?.perSide.length,
      0
    );
  }
);

test(
  "warmup loads scale and round",
  () => {
    assert.deepEqual(
      warmupLoads(100),
      [50, 70, 85]
    );

    assert.equal(
      warmupLoads(0),
      null
    );
  }
);
import { calculateExtra, EXTRA_CALCULATORS } from "../src/features/explore/tools.ts";
test("all ten additional calculators implement their worked examples", () => {
  const expected = {
    "percentage-load": "80 kg",
    "rep-target": "63.2 kg estimated load",
    "weight-converter": "44.092 lb",
    "pace-calculator": "6:00 /km · 10 km/h",
    "session-time": "8 min 40 sec",
    "progression": "Candidate next load: 52.5 kg, if technique and effort met your plan",
    "rest-planner": "12 min 0 sec",
    "distance-converter": "3.107 miles",
    "training-density": "60 kg/min",
    "rep-tempo": "0 min 40 sec",
  };
  for (const [id, definition] of Object.entries(EXTRA_CALCULATORS)) {
    const values = Object.fromEntries(definition.fields.map(f => [f.key, f.initial]));
    assert.equal(calculateExtra(id, values), expected[id], id);
    assert.equal(calculateExtra(id, { ...values, [definition.fields[0].key]: "" }), null, id);
    assert.equal(calculateExtra(id, { ...values, [definition.fields[0].key]: "Infinity" }), null, id);
  }
});
test("additional calculators reject invalid ranges and respect boundary cases", () => {
  assert.equal(calculateExtra("rep-target", { weight: "80", reps: "1" }), "80 kg estimated load");
  assert.equal(calculateExtra("rep-target", { weight: "80", reps: "13" }), null);
  assert.equal(calculateExtra("session-time", { sets: "1", seconds: "40", rest: "120" }), "0 min 40 sec");
  assert.equal(calculateExtra("session-time", { sets: "1.5", seconds: "40", rest: "120" }), null);
  assert.equal(calculateExtra("pace-calculator", { distance: "0", minutes: "30" }), null);
  assert.equal(calculateExtra("percentage-load", { weight: "100", percent: "101" }), null);
  assert.equal(calculateExtra("progression", { weight: "50", reps: "11", target: "12", increase: "2.5" }), "Repeat 50 kg until every set meets your target");
});
