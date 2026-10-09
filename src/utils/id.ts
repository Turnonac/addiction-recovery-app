let counter = 0;

/** Locally-unique id. No backend, so this only needs to be unique on-device. */
export function makeId(prefix = ''): string {
  counter = (counter + 1) % 1_000_000;
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}${Date.now().toString(36)}${counter.toString(36)}${rand}`;
}
