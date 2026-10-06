// Keep only the current screen and one likely next screen in the loading plan.
// Browser URL caching handles reuse; this adds no persistent/offline storage.
export function createImagePreloader({
  createImage = () => new Image(),
  schedule = (callback) => setTimeout(callback, 180),
  cancelSchedule = clearTimeout,
  allowPrefetch = () => {
    const connection = globalThis.navigator?.connection;
    return !connection?.saveData && !['slow-2g', '2g'].includes(connection?.effectiveType);
  },
} = {}) {
  const images = new Map();
  let generation = 0;
  let pending;
  let disposed = false;

  function load(url, priority) {
    if (images.has(url)) {
      const entry = images.get(url);
      if (priority === 'high') entry.image.fetchPriority = 'high';
      return entry.ready;
    }
    const image = createImage();
    image.decoding = 'async';
    image.fetchPriority = priority;
    const entry = { image };
    entry.ready = new Promise((resolve) => {
      const finish = (ok) => {
        image.onload = null;
        image.onerror = null;
        if (!ok && images.get(url) === entry) images.delete(url);
        resolve(ok);
      };
      image.onload = async () => {
        try { if (image.decode) await image.decode(); } catch { /* A loaded image remains usable. */ }
        finish(true);
      };
      image.onerror = () => finish(false);
    });
    images.set(url, entry);
    image.src = url;
    return entry.ready;
  }

  async function plan(currentUrls, nextUrls) {
    const token = ++generation;
    if (pending !== undefined) cancelSchedule(pending);
    pending = undefined;
    if (disposed) return;
    const current = [...new Set(currentUrls.filter(Boolean))];
    const ready = await Promise.all(current.map((url) => load(url, 'high')));
    if (disposed || token !== generation || ready.includes(false) || !allowPrefetch()) return;
    const next = [...new Set(nextUrls.filter((url) => url && !current.includes(url)))];
    if (!next.length) return;
    pending = schedule(async () => {
      pending = undefined;
      for (const url of next) {
        if (disposed || token !== generation || !allowPrefetch()) return;
        // A single low-priority image at a time avoids a speculative download burst.
        await load(url, 'low');
      }
    });
  }

  function dispose() {
    disposed = true;
    generation += 1;
    if (pending !== undefined) cancelSchedule(pending);
    images.clear();
  }
  return { plan, dispose };
}
