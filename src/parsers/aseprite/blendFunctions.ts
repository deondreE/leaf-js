import { LfQuad } from '../types';

/* This file is an attempt to replicate aseprites blendmodes without the use of multiple canvases */
//looking at examples of how their blending works requires a lot of optimization to ensure values dont overflow. Javascript this will be less necessary. but in turn less efficient.
export const rgbaNormal = ([br, bg, bb, ba]: LfQuad, [fr, fg, fb, fa]: LfQuad, alpha: number) => {
  if (!(ba & 255)) {
    //if background is invisible
    const a = fa * alpha;
    return [fr, fg, fb, a];
  } else if (!(fa & 255)) {
    //if foreground is invisible
    return [br, bg, bb, ba];
  }

  const bo = ba / 255; //convert to 0-1
  const fo = fa / 255; //this will simplify and reduce divisions later
  const na = bo + fo - bo * fo;
  const nr = br + ((fr - br) * fo) / na;
  const ng = bg + ((fg - bg) * fo) / na;
  const nb = bb + ((fb - bb) * fo) / na;

  return [nr, ng, nb, na * 255];
};
