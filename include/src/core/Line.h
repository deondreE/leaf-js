#include "Entity.h"
#include "core.h"

class Line : public Entity {
 public:
  Line(int x1, int y1, int x2, int y2, SDL_Color color)
      : x1(x1), y1(y1), x2(x2), y2(y2), color(color) {}

  void render(SDL_Renderer* renderer) const override {
    SDL_SetRenderDrawColor(renderer, color.r, color.g, color.b, color.a);

    SDL_RenderDrawLine(renderer, x1, y1, x2, y2);
  }

  void update(float deltaTime) override {}

  void handleEvents(SDL_Event* event) override {
    // Handle interactivity if needed (e.g., click detection)
    return;
  }

 private:
  int x1, y1;
  int x2, y2;
  SDL_Color color;
};