import { mat4, Mat4, vec3, Vec3 } from "wgpu-matrix";
import { cubeVertexArray } from "./meshes/cube";

export type ModelTypes = "cube" 
| undefined; //more to come
type ModelOptions<T extends ModelTypes> = T extends "cube" ? {
	type: "cube"
	size?: Vec3}
: {
	verticies: Float32Array
}

class Model<T extends ModelTypes> {
	type: ModelTypes = undefined;
	verticies: Float32Array;
	transformMatrix: Mat4
	constructor(options: ModelOptions<T>){
		this.transformMatrix = mat4.identity()
		if(options.type) {
			this.type = options.type;
			mat4.scale(this.transformMatrix, options.size ?? vec3.create(1,1,1), this.transformMatrix);
			switch (this.type){
				case "cube":
					this.verticies = cubeVertexArray;
					break;
				default:
					throw new Error("Unsupported primitive");
			}
		}
	}
}