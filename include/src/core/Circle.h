
#include "core/core.h"

class Circle {
  public:
    Circle(int x, int y, int radius, SDL_Color color)
    : centerX(x), centerY(y), radius(radius), color(color) {}

    void Render();

  private:
    int centerX;
    int centerY;
    int radius;
    SDL_Color color;
};