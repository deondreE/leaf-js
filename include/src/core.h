#include <stdio.h>

#ifdef LEXPORT 
#ifdef __EMSCRIPTEN__
    #define LAPI EMSCRIPTEN_BINDINGS // how to pass name here.
    #define LRUNTIME EMSCRIPTEN_KEEPALIVE // passname here.
    #include <emscripten.h>
#endif
#endif