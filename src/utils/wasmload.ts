const wasmBundle = new URL('./lib.wasm');

interface WASMExports {
  dispatch: (job: string) => void;
}

async function loadWasm() {
  const repsonse = await fetch(wasmBundle);
  const bytes = await repsonse.arrayBuffer();
  const wasmModule = await WebAssembly.instantiate(bytes);

  // @ts-ignore
  return wasmModule.instance.exports as WASMExports;
}

export default loadWasm;
