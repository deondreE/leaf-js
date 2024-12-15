
#include "core/Renderer.h"


void Leaf::Renderer::EventLoop()
{
 SDL_Event event;
    SDL_PollEvent(&event);
    if (event.type == SDL_KEYDOWN) {
        uint32_t ticksNow = SDL_GetTicks();
        if (SDL_TICKS_PASSED(ticksNow, ticksForNextKeyDown)) {
            ticksForNextKeyDown = ticksNow + 10;
            switch (event.key.keysym.sym) {
                case SDLK_UP:
                    starting_rect.y -= 1;
                    break;
                case SDLK_DOWN:
                    starting_rect.y += 1;
                    break;
                case SDLK_RIGHT:
                    starting_rect.x += 1;
                    break;
                case SDLK_LEFT:
                    starting_rect.x -= 1;
                    break; 
            }
            Redraw();
        }
    }
}

void Leaf::Renderer::Redraw()
{
    SDL_SetRenderDrawColor(renderer, 0x00, 0x00, 0x00, 0xFF);
    SDL_RenderClear(renderer); 
    // green
    SDL_SetRenderDrawColor(renderer, 0x00, 0x80, 0x00, 0xFF);
    SDL_RenderFillRect(renderer, &starting_rect);
    SDL_RenderPresent(renderer);
}