import { expect, test } from 'vitest';
import OBJParser from '../parsers/obj.ts';

test('Checking Object files truth.', async () => {
    const cube = `
    # Blender v2.79 (sub 0) OBJ File: ''
    # www.blender.org
    mtllib cube.mtl
    o Cube
    v 1.000000 1.000000 -1.000000
    v 1.000000 -1.000000 -1.000000
    v 1.000000 1.000000 1.000000
    v 1.000000 -1.000000 1.000000
    v -1.000000 1.000000 -1.000000
    v -1.000000 -1.000000 -1.000000
    v -1.000000 1.000000 1.000000
    v -1.000000 -1.000000 1.000000
    vn 0.000000 1.000000 0.000000
    vn 0.000000 0.000000 1.000000
    vn -1.000000 0.000000 0.000000
    vn 0.000000 -1.000000 0.000000
    vn 1.000000 0.000000 0.000000
    vn 0.000000 0.000000 -1.000000
    usemtl Material
    s off
    f 1//6 5//6 6//6
    f 1//6 6//6 2//6
    f 3//5 7//5 8//5
    f 3//5 8//5 4//5
    f 5//3 1//3 4//3
    f 5//3 4//3 8//3
    f 2//4 6//4 7//4
    f 2//4 7//4 3//4
    f 1//1 2//1 4//1
    f 1//1 4//1 3//1
    f 5//2 8//2 7//2
    f 5//2 6//2 8//2
    `;

    const parsedCube = new OBJParser();
    expect(parsedCube !== null);
});
