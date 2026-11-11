export const TAB_PADDING = 6;
export const TAB_GAP = 3;
export const MIN_TAB_TARGET = 44;

/** Pure, worklet-safe geometry keeps labels and touch areas inside the bar. */
export function tabBarLayout(available: number, compact: number, weights: readonly number[]) {
  "worklet";
  const count = Math.max(1, weights.length);
  const amount = Math.min(1, Math.max(0, compact));
  const chrome = TAB_PADDING * 2 + TAB_GAP * (count - 1);
  const minimum = count * MIN_TAB_TARGET + chrome;
  const expandedWidth = Math.max(available, minimum);
  const smallWidth = Math.max(minimum, expandedWidth * 0.82);
  const width = expandedWidth + (smallWidth - expandedWidth) * amount;
  const room = width - chrome;
  const extra = Math.min(68, Math.max(0, room - count * MIN_TAB_TARGET)) * (1 - amount);
  const base = (room - extra) / count;
  const widths = weights.map((weight) => base + extra * Math.min(1, Math.max(0, weight)));
  const positions: number[] = [];
  let left = TAB_PADDING;
  let indicatorLeft = 0;
  let indicatorWidth = 0;
  weights.forEach((weight, index) => {
    positions.push(left);
    indicatorLeft += left * weight;
    indicatorWidth += widths[index] * weight;
    left += widths[index] + TAB_GAP;
  });
  return { width, height: 68 - 12 * amount, buttonHeight: 56 - 12 * amount, widths, positions, indicatorLeft, indicatorWidth };
}

export type TabScrollState = { offset: number; distance: number; compact: boolean };

/** Direction hysteresis ignores small reversals and native overscroll bounce. */
export function nextTabScroll(state: TabScrollState, rawOffset: number, maxOffset: number): TabScrollState {
  "worklet";
  const maximum = Math.max(0, maxOffset);
  const offset = Math.max(0, Math.min(rawOffset, maximum));
  if (offset <= 24 || maximum <= 48) return { offset, distance: 0, compact: false };
  const delta = offset - state.offset;
  if (Math.abs(delta) < 0.5) return { ...state, offset };
  const distance = state.distance * delta >= 0 ? state.distance + delta : delta;
  if (distance >= 18 && offset > 72) return { offset, distance: 0, compact: true };
  if (distance <= -12) return { offset, distance: 0, compact: false };
  return { offset, distance, compact: state.compact };
}
