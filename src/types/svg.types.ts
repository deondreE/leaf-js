export interface BezierSegment {
  type: number;
  p0: [number, number];
  p1: [number, number];
  p2?: [number, number];
  p3?: [number, number];
}
