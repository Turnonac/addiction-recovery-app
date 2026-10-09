/**
 * Move the item at `from` one step up (-1) or down (+1). Returns a new array;
 * the original is returned unchanged when the move would leave the bounds.
 */
export function moveItem<T>(list: readonly T[], from: number, delta: -1 | 1): T[] {
  const to = from + delta;
  if (from < 0 || from >= list.length || to < 0 || to >= list.length) return [...list];
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/** Move the item with id `id` one step up/down in an id list. */
export function moveId(ids: readonly string[], id: string, delta: -1 | 1): string[] {
  return moveItem(ids, ids.indexOf(id), delta);
}

/**
 * The complete id list for `reorderHabits`: the (reordered) active ids first,
 * then every other habit — archived ones — by their current order. Every habit
 * gets a unique position, so a habit restored later lands after the active ones
 * instead of colliding with them.
 */
export function fullOrder(activeIds: readonly string[], habits: readonly { id: string; order: number }[]): string[] {
  const active = new Set(activeIds);
  const rest = habits
    .filter((h) => !active.has(h.id))
    .sort((a, b) => a.order - b.order)
    .map((h) => h.id);
  return [...activeIds, ...rest];
}
