
#include "Entity.h"
#include "core.h"

class Circle : public Entity {
 public:
  Circle(int x, int y, int radius, SDL_Color color)
      : centerX(x), centerY(y), radius(radius), color(color) {}

  void render(SDL_Renderer* renderer) const override {
    SDL_SetRenderDrawColor(renderer, color.r, color.g, color.b, color.a);

    int x = radius;
    int y = 0;
    int radiusError = 1 - x;

    // Use Midpoint Circle Algorithm to render the circle
    while (x >= y) {
      DrawHorizontalLine(renderer, centerX - x, centerX + x, centerY + y);
      DrawHorizontalLine(renderer, centerX - x, centerX + x, centerY - y);
      DrawHorizontalLine(renderer, centerX - y, centerX + y, centerY + x);
      DrawHorizontalLine(renderer, centerX - y, centerX + y, centerY - x);

      y++;
      if (radiusError < 0) {
        radiusError += 2 * y + 1;
      } else {
        x--;
        radiusError += 2 * (y - x) + 1;
      }
    }
  }

  void update(float deltaTime) override {}

  void handleEvents(SDL_Event* event) override {
    // Handle interactivity if needed (e.g., click detection)
    return;
  }

 private:
  int centerY, centerX;
  int radius;
  SDL_Color color;

  void DrawHorizontalLine(SDL_Renderer* renderer, int x1, int x2, int y) const {
    SDL_RenderDrawLine(renderer, x1, y, x2, y);
  }
};