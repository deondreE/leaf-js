#include <SDL2/SDL.h>

#include <vector>
#include <stdio.h>

#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#include <emscripten/bind.h>
using namespace emscripten;
#endif