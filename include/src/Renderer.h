#include <SDL2/SDL.h>
#include <SDL2/g

#include "core.h"

class Renderer {
    public:
        Renderer();

        void Render();

        void UpdateKeys();

    private:   
        SDL_Window *window;
        SDL_Renderer *renderer;

        SDL_Rect rect = {.x = 10, .y=10, .w= 150, .h=100 };

        void redraw() {
            // black
            SDL_SetRenderDrawColor(renderer, 0x00, 0x00, 0x00, 0xFF);
            SDL_RenderClear(renderer);
            SDL_SetRenderDrawColor(renderer, 0x00, 0x80, 0x00, 0xFF);
            SDL_RenderFillRect(renderer, &rect);
            SDL_RenderPresent(renderer);
        }

        uint32_t ticksForNextKeyDown = 0;

        bool handle_events() {
            SDL_Event event;
            SDL_PollEvent(&event);
            if (event.type == SDL_KEYDOWN) {
                uint32_t ticksNow = SDL_GetTicks();
                if (SDL_TICKS_PASSED(ticksNow, ticksForNextKeyDown)) {
                    ticksForNextKeyDown = ticksNow + 10;
                    switch (event.key.keysym.sym) {
                        case SDLK_UP:
                            rect.y -= 1;
                            break;
                        case SDLK_DOWN:
                            rect.y += 1;
                            break;
                        case SDLK_RIGHT:
                            rect.x += 1;
                            break;
                        case SDLK_LEFT:
                            rect.x -= 1;
                            break; 
                    }
                    redraw();
                }
            }
            return true;
        }

        void run_main_loop() {
            #ifdef __EMSCRIPTEN__
                emscripten_set_main_loop([ ]() { handle_events(); }, 0, true);
            #else
                while (handle_events())
                ;
            #endif
        }
};