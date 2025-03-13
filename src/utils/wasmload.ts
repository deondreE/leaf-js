const wasmBundle = new URL('./lib.wasm');

async function loadWasm() {
  const repsonse = await fetch(wasmBundle);
  const bytes = await repsonse.arrayBuffer();
  const wasmModule = await WebAssembly.instantiate(bytes);

  return wasmModule.instance.exports;
}

export default loadWasm;
