export const capsuleVertexSize = 4 * 10;
export const capsulePositionOffset = 0;
export const capsuleColorOffset = 4 * 4;
export const capsuleUVOffset = 4 * 8;

// Define capsule parameters
const capsuleRadius = 0.5;
const capsuleHeight = 3;
const latSegments = 8; // More segments for a smoother cap
const lonSegments = 16; // More segments for a rounder shape

export const capsuleParams = {
  capsuleHeight: capsuleHeight,
  capsuleRadius: capsuleRadius,
  latSegments: latSegments,
  lonSegments: lonSegments,
};

let capsuleVertices = [];
let capsuleIndices = [];

// Function to push vertex
const addVertex = (
  x: number,
  y: number,
  z: number,
  r: number,
  g: number,
  b: number,
  a: number,
  u: number,
  v: number,
) => {
  capsuleVertices.push(x, y, z, 1, r, g, b, a, u, v);
};

// Function to push indices
const addTriangle = (a: number, b: number, c: number) => {
  capsuleIndices.push(a, b, c);
};

// ** Generate Cylinder Body **
let startIndex = 0;
for (let i = 0; i <= 1; i++) {
  let y =
    i === 0
      ? -capsuleHeight / 2 + capsuleRadius
      : capsuleHeight / 2 - capsuleRadius;
  for (let lon = 0; lon <= lonSegments; lon++) {
    let phi = (lon / lonSegments) * (2 * Math.PI);
    let sinPhi = Math.sin(phi);
    let cosPhi = Math.cos(phi);

    let x = capsuleRadius * cosPhi;
    let z = capsuleRadius * sinPhi;

    addVertex(x, y, z, 1, 0, 0, 1, lon / lonSegments, i);

    if (lon < lonSegments) {
      let current = startIndex + i * (lonSegments + 1) + lon;
      let next = current + lonSegments + 1;

      addTriangle(current, next, next + 1);
      addTriangle(current, next + 1, current + 1);
    }
  }
}

// ** Generate Hemisphere (top and bottom) **
const generateHemisphere = (
  offsetY: number,
  flip: boolean,
  startIndex: number,
) => {
  let hemisphereStartIndex = capsuleVertices.length / 10;
  for (let lat = 0; lat <= latSegments; lat++) {
    let theta = (lat / latSegments) * (Math.PI / 2);
    let sinTheta = Math.sin(theta);
    let cosTheta = Math.cos(theta);

    for (let lon = 0; lon <= lonSegments; lon++) {
      let phi = (lon / lonSegments) * (2 * Math.PI);
      let sinPhi = Math.sin(phi);
      let cosPhi = Math.cos(phi);

      let x = capsuleRadius * cosPhi * sinTheta;
      let y = capsuleRadius * cosTheta * (flip ? -1 : 1) + offsetY;
      let z = capsuleRadius * sinPhi * sinTheta;

      addVertex(x, y, z, 1, 1, 1, 1, lon / lonSegments, lat / latSegments);

      if (lat < latSegments && lon < lonSegments) {
        let current =
          hemisphereStartIndex + lat * (lonSegments + 1) + lon;
        let next = current + lonSegments + 1;

        if (!flip) {
          addTriangle(current, next, next + 1);
          addTriangle(current, next + 1, current + 1);
        } else {
          addTriangle(current, current + 1, next + 1);
          addTriangle(current, next + 1, next);
        }
      }
    }
  }
};

generateHemisphere(
  capsuleHeight / 2 - capsuleRadius,
  false,
  startIndex + (lonSegments + 1) * 2,
);
generateHemisphere(
  -capsuleHeight / 2 + capsuleRadius,
  true,
  startIndex + (lonSegments + 1) * 2,
);

export const capsuleVertexArray = new Float32Array(capsuleVertices);
export const capsuleIndexArray = new Uint16Array(capsuleIndices);
export const capsuleVertexCount = capsuleVertices.length / 10;
export const capsuleIndexCount = capsuleIndices.length;
