class TextureManager {
    private textures: Map<string, GPUTexture> = new Map();

    constructor(private device: GPUDevice) {}

    async loadTexture(url: string): Promise<GPUTexture> {
        if (this.textures.has(url)) {
            return this.textures.get(url)!;
        }

        const response = await fetch(url);
        const imageBitmap = await createImageBitmap(await response.blob());

        const texture = this.device.createTexture({
            size: [imageBitmap.width, imageBitmap.height, 1],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
        });

        this.device.queue.copyExternalImageToTexture(
            { source: imageBitmap },
            { texture },
            [imageBitmap.width, imageBitmap.height]
        );

        this.textures.set(url, texture);
        return texture;
    }
}

export default TextureManager;