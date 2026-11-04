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