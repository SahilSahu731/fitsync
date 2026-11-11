export const TAB_PADDING = 6;
export const TAB_GAP = 3;
export const MIN_TAB_TARGET = 44;

/** Pure, worklet-safe geometry keeps labels and touch areas inside the bar. */
export function tabBarLayout(available: number, compact: number, weights: readonly number[]) {
  "worklet";
  const source = weights.length ? weights : [1];
  const count = source.length;
  const positive = source.map((weight) => Math.min(1, Math.max(0, weight)));
  const total = positive.reduce((sum, weight) => sum + weight, 0);
  const activation = positive.map((weight, index) =>
    total > 0 ? weight / total : index === 0 ? 1 : 0,
  );
  const amount = Math.min(1, Math.max(0, compact));
  const chrome = TAB_PADDING * 2 + TAB_GAP * (count - 1);
  const minimum = count * MIN_TAB_TARGET + chrome;
  const expandedWidth = Math.max(available, minimum);
  const smallWidth = Math.max(minimum, expandedWidth * 0.82);
  const width = expandedWidth + (smallWidth - expandedWidth) * amount;
  const room = width - chrome;
  const expandedRoom = expandedWidth - chrome;
  const expandedExtra = Math.min(68, Math.max(0, expandedRoom - count * MIN_TAB_TARGET));
  const labelCapacity = Math.min(
    64,
    Math.max(0, (expandedRoom - expandedExtra) / count + expandedExtra - 36),
  );
  const extra = Math.min(68, Math.max(0, room - count * MIN_TAB_TARGET)) * (1 - amount);
  const base = (room - extra) / count;
  const widths = activation.map((weight) => base + extra * weight);
  const positions: number[] = [];
  let left = TAB_PADDING;
  let indicatorLeft = 0;
  let indicatorWidth = 0;
  activation.forEach((weight, index) => {
    positions.push(left);
    indicatorLeft += left * weight;
    indicatorWidth += widths[index] * weight;
    left += widths[index] + TAB_GAP;
  });
  return {
    width,
    activation,
    labelCapacity,
    height: 68 - 12 * amount,
    buttonHeight: 56 - 12 * amount,
    widths,
    positions,
    indicatorLeft,
    indicatorWidth,
  };
}

export type TabScrollState = { offset: number; distance: number; compact: boolean };

/** Direction hysteresis ignores small reversals and native overscroll bounce. */
export function nextTabScroll(
  state: TabScrollState,
  rawOffset: number,
  maxOffset: number,
): TabScrollState {
  "worklet";
  const maximum = Math.max(0, maxOffset);
  const offset = Math.max(0, Math.min(rawOffset, maximum));
  if (offset <= 24 || maximum <= 48) return { offset, distance: 0, compact: false };
  const delta = offset - state.offset;
  if (Math.abs(delta) < 0.01) return { ...state, offset };
  const distance = state.distance * delta >= 0 ? state.distance + delta : delta;
  if (distance >= 18 && offset > 72) return { offset, distance: 0, compact: true };
  if (distance <= -12) return { offset, distance: 0, compact: false };
  return { offset, distance, compact: state.compact };
}
