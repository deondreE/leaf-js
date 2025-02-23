#pragma once

#ifdef __EMSCRIPTEN__
	#define	 IS_EMSCRIPTEN 1
#else 
	#define IS_EMSCRIPTEN 0
#endif