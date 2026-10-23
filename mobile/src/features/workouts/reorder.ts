export function moveItem<T extends { id: string }>(rows: T[], id: string, destination: number) {
  const index = rows.findIndex(row => row.id === id);
  if (index < 0) return rows;
  const target = Math.max(0, Math.min(rows.length - 1, destination));
  if (index === target) return rows;
  const next = [...rows];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}
export function dragPosition(origin: number, dy: number, scrollDelta: number, count: number, rowHeight: number) {
  return Math.max(0, Math.min(Math.max(0, count - 1) * rowHeight, origin * rowHeight + dy + scrollDelta));
}
export function edgeScroll(y: number, top: number, height: number) {
  if (height <= 0) return 0;
  const edge = Math.min(64, height / 4);
  if (y < top + edge) return -Math.min(1, (top + edge - y) / edge) * 420;
  if (y > top + height - edge) return Math.min(1, (y - (top + height - edge)) / edge) * 420;
  return 0;
}
