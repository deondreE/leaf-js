export const LEAF_2D_VERTEX_LAYOUT: GPUVertexBufferLayout = {
	arrayStride: 4 * 4,
	attributes: [
		{
			// position
			shaderLocation: 0,
			offset: 0,
			format: "float32x2"
		},
		{
			shaderLocation: 1,
			offset: 2 * 4,
			format: "float32x2"
		}
	]
};

export const LEAF_2D_BIND_GROUP_LAYOUT_DESCRIPTOR: GPUBindGroupLayoutDescriptor = {
	entries: [
		{ //Texture
			binding: 0,
			visibility: GPUShaderStage.FRAGMENT,
			texture:{}
		},
		{ //sampler
			binding: 1,
			visibility: GPUShaderStage.FRAGMENT,
			sampler: {}
		},
		{ // uniforms
			binding: 2,
			visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
			buffer: {}
		},
		{ //instances
			binding: 3,
			visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
		}
	]
};
