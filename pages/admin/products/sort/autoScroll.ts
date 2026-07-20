const DEFAULT_EDGE_SIZE = 72;
const DEFAULT_MAX_SPEED = 20;

export function getDragAutoScrollSpeed({
  pointerY,
  containerTop,
  containerBottom,
  edgeSize = DEFAULT_EDGE_SIZE,
  maxSpeed = DEFAULT_MAX_SPEED,
}: {
  pointerY: number;
  containerTop: number;
  containerBottom: number;
  edgeSize?: number;
  maxSpeed?: number;
}): number {
  const containerHeight = containerBottom - containerTop;
  if (containerHeight <= 0 || edgeSize <= 0 || maxSpeed <= 0) return 0;

  const effectiveEdgeSize = Math.min(edgeSize, containerHeight / 2);
  const topEdge = containerTop + effectiveEdgeSize;
  const bottomEdge = containerBottom - effectiveEdgeSize;

  if (pointerY < topEdge) {
    const intensity = Math.min(1, Math.max(0, (topEdge - pointerY) / effectiveEdgeSize));
    return -maxSpeed * intensity;
  }

  if (pointerY > bottomEdge) {
    const intensity = Math.min(1, Math.max(0, (pointerY - bottomEdge) / effectiveEdgeSize));
    return maxSpeed * intensity;
  }

  return 0;
}
