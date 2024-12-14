#include "Renderer.h"

Renderer::Renderer() {

}

void Renderer::Render()
{
    SDL_SetHint(SDL_HINT_RENDER_SCALE_QUALITY, "0");
    SDL_Init(SDL_INIT_VIDEO);
    window = SDL_CreateWindow("title", SDL_WINDOWPOS_UNDEFINED, SDL_WINDOWPOS_UNDEFINED, width, height, SDL_WINDOW_SHOWN);
    renderer = SDL_CreateRenderer(window, -1, SDL_RENDERER_ACCELERATED | SDL_RENDERER_PRESENTVSYNC);
    screen = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_RGBA8888, SDL_TEXTUREACCESS_TARGET, width, height);

    SDL_SetRenderDrawBlendMode(renderer, SDL_BLENDMODE_BLEND);

    SDL_SetRenderTarget(renderer, screen); 
    SDL_SetRenderDrawColor(renderer, 100, 100,100, 255);
    SDL_RenderClear(renderer);

    SDL_DestroyRenderer(renderer);
}

void Renderer::UpdateKeys( ) {
    keystates = SDL_GetKeyboardState(NULL);
    while (SDL_PollEvent(&event)) {
        if (event.type == SDL_QUIT) 
            running = false;
    }
    mousestate = SDL_GetMouseState(&mouse.x, &mouse.y);
}

EMSCRIPTEN_BINDINGS(renderer) {
    class_<Renderer>("Renderer")
        .constructor()
        .function("render", &Renderer::Render);
}