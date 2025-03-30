const wasmBundle = new URL('./lib.wasm');

/** @internal Function reference calls, that allow zig to do the heavy lifting that is required for leaf. */
interface WASMExports {
  dispatch: (job: string) => void;
}

/** @internal Loads wasm binary from the zig binary, so that it can be used inside of leaf. */
async function loadWasm() {
  const repsonse = await fetch(wasmBundle);
  const bytes = await repsonse.arrayBuffer();
  const wasmModule = await WebAssembly.instantiate(bytes);

  // @ts-ignore
  return wasmModule.instance.exports as WASMExports;
}

export default loadWasm;
