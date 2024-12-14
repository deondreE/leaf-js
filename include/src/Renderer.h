#include <SDL2/SDL.h>

#include "core.h"

class Renderer {
    public:
        Renderer();

        void Render();

        void UpdateKeys();

    private:   
        bool running;
        int width, height;
        int frameCount, timerFPS, lastFrame, fps, lastTime;
        int setFPS = 60;

        SDL_Color bkg = {0, 255,255, 255};

        SDL_Event event;
        const Uint8 *keystates;
        Uint32 mousestate;
        SDL_Point mouse;
        SDL_Renderer* renderer;

        SDL_Texture *screen;
        SDL_Rect *screen_size;
        SDL_Window *window;
};