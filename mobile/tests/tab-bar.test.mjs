import test from "node:test";
import assert from "node:assert/strict";
import {
  nextTabScroll,
  tabBarLayout,
  MIN_TAB_TARGET,
  TAB_PADDING,
} from "../src/components/tab-bar-model.ts";

const LABEL_WIDTHS = [34, 28, 42, 55, 18];

test("top and bottom bounce do not masquerade as changes in scroll direction", () => {
  const bottom = { offset: 500, distance: 0, compact: true };
  const bounced = nextTabScroll(bottom, 540, 500);
  assert.equal(bounced.compact, true);
  assert.equal(nextTabScroll(bounced, 500, 500).compact, true);
  assert.equal(nextTabScroll(bottom, -30, 500).offset, 0);
  assert.equal(nextTabScroll(bottom, 24, 500).compact, false);
  assert.equal(nextTabScroll(bottom, 40, 40).compact, false, "short pages stay expanded");
});

test("slow intentional scrolling still reaches the threshold", () => {
  let state = { offset: 100, distance: 0, compact: true };
  for (let offset = 99.8; offset >= 85; offset -= 0.2) state = nextTabScroll(state, offset, 1000);
  assert.equal(state.compact, false);
});

test("animated tab transitions keep every button inside the bar without shrinking touch targets", () => {
  for (let step = 0; step <= 20; step++) {
    const amount = step / 20;
    for (const compact of [0, 0.25, 0.5, 0.75, 1]) {
      const layout = tabBarLayout(296, compact, [1 - amount, 0, amount, 0, 0], LABEL_WIDTHS);
      layout.positions.forEach((left, index) => {
        assert.ok(left >= TAB_PADDING);
        assert.ok(layout.widths[index] >= MIN_TAB_TARGET - 0.00001);
        assert.ok(left + layout.widths[index] <= layout.width - TAB_PADDING + 0.00001);
      });
    }
  }
});
