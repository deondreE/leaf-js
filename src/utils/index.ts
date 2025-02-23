/**
 * Asserts `condition` is true. Otherwise, throws an `Error` with the provided message.
 */
export function assert(condition: boolean, msg?: string | (() => string)): asserts condition {
  if (!condition) {
    throw new Error(msg && (typeof msg === 'string' ? msg : msg()));
  }
}

/** If the argument is an Error, throw it. Otherwise, pass it back. */
export function assertOK<T>(value: Error | T): T {
  if (value instanceof Error) {
    throw value;
  }
  return value;
}

/**
 * Assert this code is unreachable. Unconditionally throws an `Error`.
 */
export function unreachable(msg?: string): never {
  throw new Error(msg);
}

// i use these a LOT

/**
 * Attempt to lookup a name using dot notation.
 * It should be warned that due to the nature of leaf events the event handling function will be bound to the scene or renderer.
 * Eventually I will add more type safety however fow now it may need to be casted
 */
export function findGlobalFunction<T extends Function = VoidFunction>(fnName: string): T {
  const nms = fnName.split('.');
  let cursor: any = window;
  while (nms.length) {
    const nm = nms.shift();
    if (!(nm in cursor)) return undefined;
    cursor = cursor[nm];
  }
  if (typeof cursor === 'function') return cursor as T;
}
