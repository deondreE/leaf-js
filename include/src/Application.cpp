#include "core/Rectangle.h"
#include "core/UI.h"

struct context {
  SDL_Renderer* renderer;
  int iteration;
};

void mainloop(void* arg) {
  context* ctx = static_cast<context*>(arg);
  SDL_Renderer* renderer = ctx->renderer;

  // example: draw a moving rectangle

  // red background
  SDL_SetRenderDrawColor(renderer, 255, 0, 0, 255);
  SDL_RenderClear(renderer);

  UI ui;
  SDL_Event event;
  while (SDL_PollEvent(&event)) {
    ui.HandleEvent(event);
  }

  ui.Render(ctx->renderer);

  SDL_RenderPresent(renderer);

  ctx->iteration++;
}

int main() {
  SDL_Init(SDL_INIT_VIDEO);
  SDL_Window* window;
  SDL_Renderer* renderer;
  SDL_CreateWindowAndRenderer(1000, 1000, 0, &window, &renderer);

  context ctx;
  ctx.renderer = renderer;
  ctx.iteration = 0;

  const int simulate_infinite_loop = 1;  // call the function repeatedly
  const int fps = -1;  // call the function as fast as the browser wants to
                       // render (typically 60fps)
  emscripten_set_main_loop_arg(mainloop, &ctx, fps, simulate_infinite_loop);

  SDL_DestroyRenderer(renderer);
  SDL_DestroyWindow(window);
  SDL_Quit();

  return EXIT_SUCCESS;
}