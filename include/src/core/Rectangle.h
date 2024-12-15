#pragma once
#include "core.h"

class Rectangle {
public:
  Rectangle(
    int x, int y, int w, int h,
    SDL_Color Color = {0, 0, 0, 255})
    : rect{x, y, w, h}, color{Color}{}

  void SetColor(SDL_Color C){ color = C; }

  bool IsWithinBounds(int x, int y) const{
    // Too far left
    if (x < rect.x) return false;
    // Too far right
    if (x > rect.x + rect.w) return false;
    // Too high
    if (y < rect.y) return false;
    // Too low
    if (y > rect.y + rect.h) return false;
    // Within bounds
    return true;
  }

  virtual void Render(SDL_Renderer* renderer){
    SDL_SetRenderDrawColor(renderer, color.r, color.g, color.b, color.a );
    SDL_RenderFillRect(renderer, &rect);
  }

private:
  SDL_Rect rect{0, 0, 0, 0};
  SDL_Color color{0, 0, 0, 0};
};