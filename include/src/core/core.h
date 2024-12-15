#include <vector>
#include <SDL2/SDL.h>

#ifdef __EMSCRIPTEN__
    #include <emscripten.h>
    #include <emscripten/bind.h>
    using namespace emscripten;
#endif