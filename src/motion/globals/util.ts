/** Globals skip anything inside a [data-scene] — a scene owns its elements. */
export const isFree = (el: Element) => !el.closest('[data-scene]');
