import { nextTick, onUnmounted, watch } from 'vue';

// Native inert keeps the background out of pointer, keyboard and accessibility
// navigation. These guards also cover older browsers that do not support inert.
export function useModalFocus(isOpen, dialog, background, options = {}) {
  let opener = null;
  let restoreTarget = null;
  let generation = 0;
  let disposed = false;
  let isolated = [];
  const outsideEvents = ['click', 'pointerdown', 'pointerup', 'keyup'];

  function allowedRoots() {
    const outside = options.allowedOutside?.();
    return [dialog.value, ...(Array.isArray(outside) ? outside : [outside])]
      .filter(Boolean);
  }
  function isAllowed(element) {
    return allowedRoots().some((root) => root.contains(element));
  }
  function buttons() {
    return [...new Set(allowedRoots().flatMap((root) => [
      ...(root.matches('button:not(:disabled)') ? [root] : []),
      ...root.querySelectorAll('button:not(:disabled)')
    ]))].filter((button) => button.tabIndex >= 0 && !button.closest('[hidden], [inert]'));
  }
  function focusInside() {
    (buttons()[0] || dialog.value)?.focus({ preventScroll: true });
  }
  function releaseBackground() {
    for (const element of isolated) element.removeAttribute('inert');
    isolated = [];
  }
  function isolateBackground() {
    releaseBackground();
    const root = background.value;
    const modal = dialog.value;
    if (!root || !modal) return;
    const targets = [];
    const allowed = allowedRoots();
    // Preserve only the paths to the dialog and explicitly allowed controls.
    // A sibling such as Help must remain reachable without exposing the game.
    function collect(element) {
      if (allowed.includes(element)) return;
      if (allowed.some((target) => element.contains(target))) {
        for (const child of element.children) collect(child);
      } else targets.push(element);
    }
    collect(root);
    for (const element of targets) {
      if (!element.hasAttribute('inert')) {
        element.setAttribute('inert', '');
        isolated.push(element);
      }
    }
  }
  function canFocus(element) {
    return element?.isConnected && background.value?.contains(element)
      && !element.disabled && !element.closest('[inert]') && typeof element.focus === 'function';
  }
  function stop(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
  function guardOutside(event) {
    if (!isOpen.value || isAllowed(event.target)) return;
    stop(event);
  }
  function guardFocus(event) {
    if (isOpen.value && dialog.value && !isAllowed(event.target)) focusInside();
  }
  function onKeyDown(event) {
    if (!isOpen.value) return;
    if (event.key === 'Escape') {
      stop(event);
      isOpen.value = false;
      return;
    }
    if (event.key === 'Tab') {
      stop(event);
      const targets = buttons();
      if (!targets.length) { focusInside(); return; }
      const index = targets.indexOf(document.activeElement);
      const next = index < 0 ? (event.shiftKey ? targets.length - 1 : 0)
        : (index + (event.shiftKey ? -1 : 1) + targets.length) % targets.length;
      targets[next].focus({ preventScroll: true });
      return;
    }
    if (!isAllowed(event.target)) {
      stop(event);
      focusInside();
    }
  }
  function listen(add) {
    const method = add ? 'addEventListener' : 'removeEventListener';
    document[method]('keydown', onKeyDown, true);
    document[method]('focusin', guardFocus, true);
    for (const type of outsideEvents) document[method](type, guardOutside, true);
  }
  function open(event) {
    if (isOpen.value) return;
    opener = event?.currentTarget?.focus ? event.currentTarget : document.activeElement;
    isOpen.value = true;
  }
  function cancel() { isOpen.value = false; }

  watch(isOpen, (opened) => {
    generation += 1;
    if (opened) {
      opener ||= document.activeElement;
      restoreTarget = null;
      listen(true);
    } else {
      listen(false);
      releaseBackground();
      restoreTarget = opener;
      opener = null;
    }
  }, { flush: 'sync' });

  // Wait until Vue has patched the dialog and the background's inert attribute.
  // A nextTick scheduled inside a synchronous watcher can precede that patch.
  watch([isOpen, dialog], ([opened]) => {
    const token = generation;
    if (opened) {
      nextTick(() => {
        if (!disposed && isOpen.value && token === generation) {
          isolateBackground();
          focusInside();
        }
      });
    } else {
      const previous = restoreTarget;
      restoreTarget = null;
      if (!previous) return;
      nextTick(() => {
        if (disposed || isOpen.value || token !== generation) return;
        const target = [previous, options.fallbackFocus?.(),
          background.value?.querySelector('.start-button'),
          background.value?.querySelector('.help-button'),
          ...Array.from(background.value?.querySelectorAll('button') || [])].find(canFocus);
        target?.focus({ preventScroll: true });
      });
    }
  }, { flush: 'post' });

  onUnmounted(() => { disposed = true; generation += 1; listen(false); releaseBackground(); opener = null; restoreTarget = null; });
  return { open, cancel };
}
