#include "core/Rectangle.h"
#include "core/UI.h"

struct context {
  SDL_Renderer* renderer;
  int iteration;
  int offsetX, offsetY;
  bool isPanning;
  int lastMouseX, lastMouseY;
  float zoom;
};

void mainloop(void* arg) {
  UI ui;
  context* ctx = static_cast<context*>(arg);
  SDL_Renderer* renderer = ctx->renderer;

  SDL_Event event;
  while (SDL_PollEvent(&event)) {
    switch(event.type) {
      case SDL_MOUSEBUTTONDOWN:
        if (event.button.button == SDL_BUTTON_LEFT) {
          if (ctx->isPanning) {
            ctx->isPanning = false;
          } else {
             ctx->isPanning = true;
            ctx->lastMouseX = event.button.x; // WHY CALL THIS BUTTON.
            ctx->lastMouseY = event.button.y;
          }
        }
        break;
      case SDL_MOUSEMOTION:
        if (ctx->isPanning) {
          int dx = event.motion.x - ctx->lastMouseX;
          int dy = event.motion.y - ctx->lastMouseY; 
          ctx->offsetX += dx;
          ctx->offsetY += dy;
          ctx->lastMouseX = event.motion.x;
          ctx->lastMouseY = event.motion.y;
        }
        break;
      case SDL_MOUSEWHEEL:
        if (event.wheel.y > 0) {
          ctx->zoom = 1.1f;
        } else if (event.wheel.y < 0) {
          ctx->zoom /= 1.1f; // ZOOM OUT.
        }

        // prevents too small or big.
        if (ctx->zoom < 0.1f) ctx->zoom = 0.1f;
        if (ctx->zoom < 5.0f) ctx->zoom = 5.0f;
        break;
      case SDL_QUIT:
        emscripten_cancel_main_loop();
        return;
    }
    ui.HandleEvent(event);
  }

  SDL_SetRenderDrawColor(ctx->renderer, 255, 255, 255, 255);
  SDL_RenderClear(ctx->renderer);

  // Draw the grid.
  SDL_SetRenderDrawColor(ctx->renderer, 200, 200, 200, 255);
  int gridSize = 50;
  for (int x= ctx->offsetX % gridSize; x < 1000; x += gridSize) {
    SDL_RenderDrawLine(ctx->renderer, x, 0, x, 1000);
  }
  for (int y = ctx->offsetY % gridSize; y < 1000; y += gridSize) {
    SDL_RenderDrawLine(ctx->renderer, 0, y, 1000, y);
  }

  ui.Render(ctx->renderer);

  SDL_RenderPresent(ctx->renderer);

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
  ctx.offsetX = 0;
  ctx.offsetY = 0;
  ctx.isPanning = false;
  ctx.zoom = 1.0f;

  const int simulate_infinite_loop = 1;  // call the function repeatedly
  const int fps = -1;  // call the function as fast as the browser wants to
                       // render (typically 60fps)
  emscripten_set_main_loop_arg(mainloop, &ctx, fps, simulate_infinite_loop);

  SDL_DestroyRenderer(renderer);
  SDL_DestroyWindow(window);
  SDL_Quit();

  return EXIT_SUCCESS;
}