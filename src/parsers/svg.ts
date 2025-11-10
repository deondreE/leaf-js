import { mat4 } from "gl-matrix";

export interface SVGGeometry {
  vertices: Float32Array;
  indices: Uint16Array;
  transform?: Float32Array;
  name: string;
}

export default class SVGParser {
  async loadSVG(url: string): Promise<SVGGeometry[]> {
    const resp = await fetch(url);
    const text = await resp.text();
    const doc = new DOMParser().parseFromString(text, "image/svg+xml");

    const geometries: SVGGeometry[] = [];
    const elements = doc.querySelectorAll("rect,circle,polygon,path");

    for (const el of elements) {
      const geom = await this.elementToGeometry(el);
      if (geom) geometries.push(geom);
    }

    console.log(`Parsed ${geometries.length} SVG geometries.`);
    return geometries;
  }

  private async elementToGeometry(el: Element): Promise<SVGGeometry | null> {
    const tag = el.tagName.toLowerCase();
    let vertices: number[] = [];
    let indices: number[] = [];

    switch (tag) {
      case "rect": {
        const x = parseFloat(el.getAttribute("x") || "0");
        const y = parseFloat(el.getAttribute("y") || "0");
        const width = parseFloat(el.getAttribute("width") || "0");
        const height = parseFloat(el.getAttribute("height") || "0");

        // Rectangle as two triangles
        vertices = [
          x,
          y,
          0, // bottom-left
          x + width,
          y,
          0, // bottom-right
          x + width,
          y + height,
          0, // top-right
          x,
          y + height,
          0, // top-left
        ];
        indices = [0, 1, 2, 0, 2, 3];
        break;
      }

      case "circle": {
        const cx = parseFloat(el.getAttribute("cx") || "0");
        const cy = parseFloat(el.getAttribute("cy") || "0");
        const r = parseFloat(el.getAttribute("r") || "0");

        const segments = 32;
        vertices.push(cx, cy, 0); // center
        for (let i = 0; i <= segments; i++) {
          const angle = (i / segments) * Math.PI * 2;
          const x = cx + r * Math.cos(angle);
          const y = cy + r * Math.sin(angle);
          vertices.push(x, y, 0);
        }
        for (let i = 1; i <= segments; i++) {
          indices.push(0, i, i + 1);
        }
        break;
      }

      case "polygon": {
        const pointsAttr = el.getAttribute("points");
        if (!pointsAttr) return null;
        const points = pointsAttr
          .trim()
          .split(/\s+/)
          .map((p) => p.split(",").map(Number));
        if (points.length < 3) return null;

        for (const [x, y] of points) {
          vertices.push(x, y, 0);
        }

        // Simple fan triangulation
        for (let i = 1; i < points.length - 1; i++) {
          indices.push(0, i, i + 1);
        }
        break;
      }

      case "path": {
        // Minimal flattened path → polygon interpreter
        // Only supports 'M', 'L', and 'Z' commands
        const d = el.getAttribute("d");
        if (!d) return null;

        const commands = d.match(/[a-df-z][^a-df-z]*/gi);
        if (!commands) return null;

        const pathPoints: number[][] = [];
        let cursor = [0, 0];

        for (const cmd of commands) {
          const type = cmd[0];
          const args = cmd.slice(1).trim().split(/[ ,]+/).map(Number);

          switch (type) {
            case "M":
            case "L":
              for (let i = 0; i < args.length; i += 2) {
                cursor = [args[i], args[i + 1]];
                pathPoints.push(cursor);
              }
              break;
            case "m":
            case "l":
              for (let i = 0; i < args.length; i += 2) {
                cursor = [cursor[0] + args[i], cursor[1] + args[i + 1]];
                pathPoints.push(cursor);
              }
              break;
            case "Z":
            case "z":
              pathPoints.push([...pathPoints[0]]);
              break;
          }
        }

        if (pathPoints.length < 3) return null;

        for (const [x, y] of pathPoints) {
          vertices.push(x, y, 0);
        }

        for (let i = 1; i < pathPoints.length - 1; i++) {
          indices.push(0, i, i + 1);
        }
        break;
      }

      default:
        return null;
    }

    const transform = this.computeTransform(el);

    return {
      vertices: new Float32Array(vertices),
      indices: new Uint16Array(indices),
      transform,
      name: el.getAttribute("id") || tag,
    };
  }

  private computeTransform(el: Element): Float32Array {
    const transformAttr = el.getAttribute("transform");
    const m = mat4.create();

    if (!transformAttr) return m as Float32Array;

    // Very basic parsing for translate(), rotate(), scale()
    const translateMatch = /translate\(([^)]+)\)/.exec(transformAttr);
    if (translateMatch) {
      const [tx, ty] = translateMatch[1].split(/[ ,]+/).map(parseFloat);
      mat4.translate(m, m, [tx || 0, ty || 0, 0]);
    }

    const rotateMatch = /rotate\(([^)]+)\)/.exec(transformAttr);
    if (rotateMatch) {
      const angle = parseFloat(rotateMatch[1]) * (Math.PI / 180);
      mat4.rotateZ(m, m, angle);
    }

    const scaleMatch = /scale\(([^)]+)\)/.exec(transformAttr);
    if (scaleMatch) {
      const [sx, sy] = scaleMatch[1].split(/[ ,]+/).map(parseFloat);
      mat4.scale(m, m, [sx || 1, sy || sx || 1, 1]);
    }

    return m;
  }
}
