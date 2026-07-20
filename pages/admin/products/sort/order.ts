export function moveItemToIndex<T extends { id: number }>(items: T[], id: number, oneBasedPosition: number): T[] {
  const sourceIndex = items.findIndex((item) => item.id === id);
  if (sourceIndex < 0 || items.length < 2) return [...items];

  const targetIndex = Math.min(items.length - 1, Math.max(0, Math.trunc(oneBasedPosition) - 1));
  if (sourceIndex === targetIndex) return [...items];

  const nextItems = [...items];
  const [moved] = nextItems.splice(sourceIndex, 1);
  nextItems.splice(targetIndex, 0, moved);
  return nextItems;
}

export function moveItemByOffset<T extends { id: number }>(items: T[], id: number, offset: -1 | 1): T[] {
  const sourceIndex = items.findIndex((item) => item.id === id);
  if (sourceIndex < 0) return [...items];
  const targetIndex = sourceIndex + offset;
  if (targetIndex < 0 || targetIndex >= items.length) return [...items];
  return moveItemToIndex(items, id, targetIndex + 1);
}
