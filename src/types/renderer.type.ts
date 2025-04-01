/** @internal The Primitive is a given shape that is predefed, inside of the renderer class. The user takes primitives and applies things to them allowing for the
 * user to have a base to work from.
 */
type PrimitiveTypes = Array<{
  scale?: number;
  rotation?: { x: number; y: number; z: number };
  color?: { r: number; g: number; b: number; a: number };
  position?: { x: number; y: number; z: number };
  texture?: string;
  animation?: {
    effect: {
      type: string;
      start: { x: number; y: number; z: number };
      to: { x: number; y: number; z: number };
    };
    timeScale?: string | 'infinite';
  };
  interactable?: boolean;
}>;

/** @internal A reference to the "animation" possibilities the user can provide. */
type PrimitiveAnimation = Array<{
  effect?: {
    type?: 'scale' | 'rotation' | 'position' | 'color';
    from?: { x: number; y: number; z: number } | { r: number; g: number; b: number } | number;
    to?: { x: number; y: number; z: number } | { r: number; g: number; b: number } | number;
  };
  timeScale: string | 'infinite'; // infinite will be default.
}>;

/** @internal
 * A Particle that only serves one purpose.
 */
type PrimitiveParticle = Array<{
  type?: 'emitter' | 'global';
  amount?: number | 1000;
  color: { r: number; g: number; b: number; a: number };
  startPos: { x: number; y: number; z: number };
  shader?: string | '';
  emitter?: {
    shape: 'cone' | 'square' | 'sphere';
    size?: {
      radius?: number;
      size?: { x: number; y: number };
    };
  };
}>;

export type { PrimitiveTypes, PrimitiveAnimation, PrimitiveParticle };
