// Geometry is in viewport CSS pixels, matching PointerEvent.clientX/clientY.
export function pointInRect(x, y, rect) {
  return Boolean(rect && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom);
}

export function createDragSession() {
  let active = null;
  return {
    get active() { return active; },
    begin(event) {
      if (active || !event.isPrimary || event.button !== 0) return false;
      active = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
      return true;
    },
    move(event) {
      if (!active || event.pointerId !== active.pointerId) return false;
      active = { ...active, x: event.clientX, y: event.clientY };
      return true;
    },
    finish(event, targetRect) {
      if (!active || event.pointerId !== active.pointerId) return false;
      active = null;
      return pointInRect(event.clientX, event.clientY, targetRect);
    },
    cancel() { active = null; },
  };
}
