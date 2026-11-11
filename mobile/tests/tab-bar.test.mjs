import test from "node:test";
import assert from "node:assert/strict";
import {
  MIN_TAB_TARGET,
  TAB_PADDING,
  tabBarLayout,
  nextTabScroll,
} from "../src/components/tab-bar-model.ts";

test("reading down compacts the bar; a deliberate upward scroll expands it", () => {
  let state = nextTabScroll({ offset: 0, distance: 0, compact: false }, 50, 1000);
  assert.equal(state.compact, false);
  state = nextTabScroll(state, 90, 1000);
  assert.equal(state.compact, true);
  state = nextTabScroll(state, 140, 1000);
  state = nextTabScroll(state, 136, 1000);
  assert.equal(state.compact, true, "small reversals must not flicker");
  state = nextTabScroll(state, 126, 1000);
  assert.equal(state.compact, false);
});

test("top and bottom bounce do not masquerade as changes in scroll direction", () => {
  const bottom = { offset: 500, distance: 0, compact: true };
  const bounced = nextTabScroll(bottom, 540, 500);
  assert.equal(bounced.compact, true);
  assert.equal(nextTabScroll(bounced, 500, 500).compact, true);
  assert.equal(nextTabScroll(bottom, -30, 500).compact, false);
  assert.equal(nextTabScroll(bottom, 24, 500).compact, false);
  assert.equal(nextTabScroll(bottom, 40, 40).compact, false, "short pages stay expanded");
});

test("slow intentional scrolling still reaches the threshold", () => {
  let state = { offset: 100, distance: 0, compact: true };
  for (let offset = 99.8; offset >= 85; offset -= 0.2) state = nextTabScroll(state, offset, 1000);
  assert.equal(state.compact, false);
});

test("small-phone and tablet layouts preserve touch targets throughout a transition", () => {
  for (const available of [288, 343, 398, 448]) {
    for (const compact of [0, 0.25, 0.5, 0.75, 1]) {
      for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
        const layout = tabBarLayout(available, compact, [1 - progress, 0, 0, 0, progress]);
        assert.ok(layout.width <= available + 0.001);
        assert.ok(layout.widths.every((width) => width >= MIN_TAB_TARGET - 0.001));
        assert.ok(layout.buttonHeight >= MIN_TAB_TARGET);
        assert.ok(
          Math.abs(layout.positions[4] + layout.widths[4] + TAB_PADDING - layout.width) < 0.001,
        );
        assert.ok(layout.indicatorLeft >= TAB_PADDING - 0.001);
        assert.ok(
          layout.indicatorLeft + layout.indicatorWidth <= layout.width - TAB_PADDING + 0.001,
        );
      }
    }
    const full = tabBarLayout(available, 0, [0, 0, 0, 1, 0]);
    const compact = tabBarLayout(available, 1, [0, 0, 0, 1, 0]);
    assert.ok(compact.width < full.width);
    assert.ok(compact.height < full.height);
    assert.ok(full.widths[3] > full.widths[0]);
  }
});

test("rapid interrupted tab changes cannot push a button outside the bar", () => {
  for (const weights of [
    [0.1, 0.7, 0.4, 0, 0],
    [0, 0, 0.03, 0.04, 0],
    [0, 0, 0, 0, 0],
  ]) {
    const layout = tabBarLayout(288, 0.4, weights);
    assert.ok(
      Math.abs(layout.positions[4] + layout.widths[4] + TAB_PADDING - layout.width) < 0.001,
    );
    assert.ok(layout.widths.every((width) => width >= MIN_TAB_TARGET));
    assert.ok(layout.indicatorLeft + layout.indicatorWidth <= layout.width - TAB_PADDING + 0.001);
  }
});
