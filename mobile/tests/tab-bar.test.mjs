import test from "node:test";
import assert from "node:assert/strict";
import {
  nextTabScroll,
  tabBarLayout,
  MIN_TAB_TARGET,
  TAB_PADDING,
  TAB_ICON_SIZE,
  TAB_LABEL_GAP,
  TAB_CONTENT_PADDING,
} from "../src/components/tab-bar-model.ts";

const LABEL_WIDTHS = [34, 28, 42, 55, 18];

test("downward scrolling compacts the bar and deliberate upward scrolling restores it", () => {
  let state = nextTabScroll({ offset: 0, distance: 0, compact: false }, 5, 1000);
  assert.equal(state.compact, false, "tiny movements do not change the bar");
  state = nextTabScroll(state, 90, 1000);
  assert.equal(state.compact, true);
  state = nextTabScroll(state, 140, 1000);
  state = nextTabScroll(state, 136, 1000);
  assert.equal(state.compact, true, "small reversals must not flicker");
  state = nextTabScroll(state, 126, 1000);
  assert.equal(state.compact, false, "upward scrolling restores the active label");
});

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

test("compact tabs are equal circles with accessible targets; expanded labels fit beside their icons", () => {
  for (const available of [280, 296, 336, 390, 768]) {
    for (let selected = 0; selected < 5; selected++) {
      const weights = Array.from({ length: 5 }, (_, index) => Number(index === selected));
      const large = tabBarLayout(available, 0, weights, LABEL_WIDTHS);
      const small = tabBarLayout(available, 1, weights, LABEL_WIDTHS);
      assert.ok(small.width < large.width);
      assert.ok(large.width <= available);
      assert.equal(small.height, small.buttonHeight + TAB_PADDING * 2);
      assert.ok(
        small.widths.every((width) => width === MIN_TAB_TARGET && width === small.buttonHeight),
      );
      assert.ok(
        large.widths[selected] >=
          TAB_ICON_SIZE + TAB_LABEL_GAP + large.labelCapacities[selected] + TAB_CONTENT_PADDING * 2,
      );
      assert.equal(small.widths[selected], MIN_TAB_TARGET);
    }
  }
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

test("the selected pill hugs its measured label with equal left and right padding", () => {
  for (let selected = 0; selected < 5; selected++) {
    const weights = LABEL_WIDTHS.map((_, index) => Number(index === selected));
    const layout = tabBarLayout(360, 0, weights, LABEL_WIDTHS);
    const contentWidth = TAB_ICON_SIZE + TAB_LABEL_GAP + LABEL_WIDTHS[selected];
    assert.equal(layout.widths[selected] - contentWidth, TAB_CONTENT_PADDING * 2);
    assert.equal(layout.labelCapacities[selected], LABEL_WIDTHS[selected]);
    layout.widths.forEach((width, index) => {
      if (index !== selected) assert.equal(width, MIN_TAB_TARGET);
    });
  }
  const shortLabel = tabBarLayout(360, 0, [0, 0, 0, 0, 1], LABEL_WIDTHS);
  const longLabel = tabBarLayout(360, 0, [0, 0, 0, 1, 0], LABEL_WIDTHS);
  assert.equal(longLabel.width - shortLabel.width, LABEL_WIDTHS[3] - LABEL_WIDTHS[4]);
});
