interface SceneTypes {
    id: number,
    /** This is written as optional because it will be created inside the constructor of the scene. */
    renderer?: Renderer,
    /** If there is no horizontal motion a camera is not required. */
    camera?: Camera,
    canvas?: HTMLCanvasElement,
    shapes: []
}

interface Renderer {

}

/** Animation takes in any applied math and does what the user wants with it. */
interface Animation {
}

interface Color {
    r: number,
    g: number,
    b: number, 
    a: number,
    hexcode: string,
}

interface Camera {
    position: Vec3,
}

interface Vec2 {
    x: number,
    y: number,
}

interface Vec3 {
    x: number,
    y: number,
    z: number
}

interface Cursor<T> {
    position: Vec2, 
    name: string,
    id: string,
    event: T,
}

export type { SceneTypes, Renderer, Color, Vec2, Vec3, Cursor };