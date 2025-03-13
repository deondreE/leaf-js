declare module '*.wgsl' {
  const shader: string;
  export default shader;
}

declare global {
  interface HTMLElementTagNameMap {
    'leaf-js': Leaf;
  }
}
