export const TAB_PADDING = 4;
export const TAB_GAP = 2;
export const MIN_TAB_TARGET = 44;
export const TAB_ICON_SIZE = 24;
export const TAB_LABEL_GAP = 6;
export const TAB_MAX_WIDTH = 336;
export const TAB_CONTENT_PADDING = 10;

/** Pure, worklet-safe geometry keeps labels and touch areas inside the bar. */
export function tabBarLayout(
  available: number,
  compact: number,
  weights: readonly number[],
  labelWidths: readonly number[],
) {
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
  const availableExtra = Math.max(0, Math.min(available, TAB_MAX_WIDTH) - minimum);
  const contentChrome = TAB_ICON_SIZE + TAB_LABEL_GAP + TAB_CONTENT_PADDING * 2;
  const extras = source.map((_, index) =>
    Math.min(
      availableExtra,
      Math.max(
        0,
        contentChrome + Math.min(80, Math.max(0, labelWidths[index] ?? 0)) - MIN_TAB_TARGET,
      ),
    ),
  );
  const labelCapacities = extras.map((extra) =>
    Math.max(0, MIN_TAB_TARGET + extra - contentChrome),
  );
  const widths = activation.map(
    (weight, index) => MIN_TAB_TARGET + extras[index] * weight * (1 - amount),
  );
  const positions: number[] = [];
  let left = TAB_PADDING;
  widths.forEach((width) => {
    positions.push(left);
    left += width + TAB_GAP;
  });
  return {
    width: widths.reduce((sum, width) => sum + width, chrome),
    activation,
    labelCapacities,
    height: 60 - 8 * amount,
    buttonHeight: 52 - 8 * amount,
    widths,
    positions,
  };
}

export type TabScrollState = { offset: number; distance: number; compact: boolean };

/** Direction hysteresis keeps downward scrolling compact until a deliberate upward scroll. */
export function nextTabScroll(
  state: TabScrollState,
  rawOffset: number,
  maxOffset: number,
): TabScrollState {
  "worklet";
  const maximum = Math.max(0, maxOffset);
  const offset = Math.max(0, Math.min(rawOffset, maximum));
  if (maximum <= 48) return { offset, distance: 0, compact: false };
  const delta = offset - state.offset;
  if (Math.abs(delta) < 0.01) return { ...state, offset };
  const distance = state.distance * delta >= 0 ? state.distance + delta : delta;
  if (distance >= 14) return { offset, distance: 0, compact: true };
  if (distance <= -12) return { offset, distance: 0, compact: false };
  return { offset, distance, compact: state.compact };
}
