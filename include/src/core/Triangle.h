#include "core.h"

class Triangle {
 public:
  Triangle(int x1, int y1, int x2, int y2, int x3, int y3, SDL_Color color)
      : x1(x1), y1(y1), x2(x2), y2(y2), x3(x3), y3(y3), color(color) {}

  void Render(SDL_Renderer* renderer) {
    SDL_SetRenderDrawColor(renderer, color.r, color.g, color.b, color.a);

    SDL_RenderDrawLine(renderer, x1, y1, x2, y2);  // Edge 1
    SDL_RenderDrawLine(renderer, x2, y2, x3, y3);  // Edge 2
    SDL_RenderDrawLine(renderer, x3, y3, x1, y1);  // Edge 3
  }

 private:
  int x1, y1;       // Vertex 1
  int x2, y2;       // Vertex 2
  int x3, y3;       // Vertex 3
  SDL_Color color;  // Triangle color
};