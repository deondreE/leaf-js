/*
    This is for POF. 

    Using a webworker this will use a an offscreencanvase to create a static singular image graphic.

    because of the separation in context I may implement binary parsing through the web worker as well.
*/

const wkr = new Worker(new URL('./pxlmagic.worker.ts', import.meta.url));
