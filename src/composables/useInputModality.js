import { onMounted, onUnmounted, ref } from 'vue';

export function useInputModality() {
  // Preserve a visible focus cue for keyboard/assistive navigation by default.
  const inputModality = ref('keyboard');
  const pointerEvents = ['pointerdown', 'mousedown', 'touchstart'];
  const onPointer = () => { inputModality.value = 'pointer'; };
  function onKeyDown(event) {
    if (!event.altKey && !event.ctrlKey && !event.metaKey) inputModality.value = 'keyboard';
  }
  function listen(add) {
    const method = add ? 'addEventListener' : 'removeEventListener';
    // Capture on document so a modal's Tab/Escape guard cannot hide the input.
    document[method]('keydown', onKeyDown, true);
    for (const type of pointerEvents) document[method](type, onPointer, true);
  }
  onMounted(() => listen(true));
  onUnmounted(() => listen(false));
  return inputModality;
}
