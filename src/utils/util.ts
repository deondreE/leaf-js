/**
 * Asserts `condition` is true. Otherwise, throws an `Error` with the provided message.
 */
export function assert(
    condition: boolean,
    msg?: string | (() => string)
  ): asserts condition {
    if (!condition) {
      throw new Error(msg && (typeof msg === 'string' ? msg : msg()));
    }
}


/**
 * Assert this code is unreachable. Unconditionally throws an `Error`.
 */
export function unreachable(msg?: string): never {
  throw new Error(msg);
}
  
// i use these a LOT