import { Vec2 } from "./math.types";

/** Definition of an animation applied to a model */
interface Animation {
    name: string;   
    type: 'rotation' | 'translation' | 'scale';
    duration: string;

    start(): void;
    update(dt: number): void;
    stop(): void;
};

interface Scene {
    name: string;
    models: Model[];
    subscenes?: Scene[];
    animations?: Animation[];
}

/** Definition of a model inside of a scene. */
interface Model {
    type: "square" | "circle" | "custom";
    id: number;
    name: string;
    position: Vec2;
    size: { w: number, h: number },
    verticies: Float32Array;
    shaders: string[],
    modelFile?: string;
    startAnimation: boolean;

    /** Apply transformation: Scale, Rotation, Transform. */
    applyTransformation(type: 'scale' | 'rotate' | 'translate', value: { x: number, y: number, z: number }): void;  
};

export type { Model, Animation, Scene };