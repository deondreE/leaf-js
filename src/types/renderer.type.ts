type PrimitiveTypes = Array<{
  scale?: number;
  rotation?: { x: number; y: number; z: number };
  color?: { r: number; g: number; b: number; a: number };
  position?: { x: number; y: number; z: number };
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

export type { PrimitiveTypes };
