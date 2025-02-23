function src() {
  console.log('Running src');
}

//@ts-ignore
window.loaded = function () {
  console.log('Scene loaded');
};
