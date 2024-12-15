#pragma once
#include <algorithm>
#include <cassert>

#include "core.h"

class Rectangle {
 public:
  Rectangle(int x, int y, int w, int h, bool isEditable = false)
      : rect{x, y, w, h}, isEditable(isEditable) {}

  bool IsWithinBounds(int x, int y) const {
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

  void HandleEvents(SDL_Event* event, SDL_Renderer* renderer) {
    switch (event->type) {
      case SDL_MOUSEBUTTONDOWN:
        this->HandleResize(renderer);
        break;
      default:
        break;
    }
  }

  void HandleResize(SDL_Renderer* renderer) {
    if (!isEditable) return;

    // Get the current mouse state
    int mouseX, mouseY;
    Uint32 mouseState = SDL_GetMouseState(&mouseX, &mouseY);

    static bool resizing = false;
    static bool rectSelected = false;
    static SDL_Point resizeStartPoint;
    static SDL_Rect originalRect;
    static int resizeCorner =
        -1;  // 0: Top-left, 1: Top-right, 2: Bottom-right, 3: Bottom-left

    const int cornerSize = 10;  // Size of corner handles

    // Define corner points
    SDL_Point corners[4] = {
        {rect.x, rect.y},                    // Top-left
        {rect.x + rect.w, rect.y},           // Top-right
        {rect.x + rect.w, rect.y + rect.h},  // Bottom-right
        {rect.x, rect.y + rect.h}            // Bottom-left
    };

    // Check if the mouse button is pressed and not resizing
    if (mouseState & SDL_BUTTON(SDL_BUTTON_LEFT)) {
      if (!resizing && !rectSelected) {
        // Check if the mouse is within the rectangle
        if (mouseX >= rect.x && mouseX <= rect.x + rect.w && mouseY >= rect.y &&
            mouseY <= rect.y + rect.h) {
          rectSelected = true;
        }
      }

      if (rectSelected && !resizing) {
        // Check if the mouse is near any corner
        for (int i = 0; i < 4; ++i) {
          if (mouseX >= corners[i].x && mouseX <= corners[i].x &&
              mouseY >= corners[i].y && mouseY <= corners[i].y) {
            resizing = true;
            resizeCorner = i;
            resizeStartPoint = {mouseX, mouseY};
            originalRect = rect;
            break;
          }
        }
      }

      if (resizing) {
        // Calculate the new dimensions based on the selected corner
        assert(resizeStartPoint.x != 0);
        int deltaX = mouseX - resizeStartPoint.x;
        int deltaY = mouseY - resizeStartPoint.y;

        switch (resizeCorner) {
          case 0:  // Top-left
            rect.x = originalRect.x + deltaX;
            rect.y = originalRect.y + deltaY;
            rect.w = std::max(1, originalRect.w - deltaX);
            rect.h = std::max(1, originalRect.h - deltaY);
            break;
          case 1:  // Top-right
            rect.y = originalRect.y + deltaY;
            rect.w = std::max(1, originalRect.w + deltaX);
            rect.h = std::max(1, originalRect.h - deltaY);
            break;
          case 2:  // Bottom-right
            rect.w = std::max(1, originalRect.w + deltaX);
            rect.h = std::max(1, originalRect.h + deltaY);
            break;
          case 3:  // Bottom-left
            rect.x = originalRect.x + deltaX;
            rect.w = std::max(1, originalRect.w - deltaX);
            rect.h = std::max(1, originalRect.h + deltaY);
            break;
        }
      }
    } else {
      // Stop resizing when the mouse button is released
      resizing = false;
      resizeCorner = -1;
    }

    // Render corner points only if the rectangle is selected
    if (rectSelected) {
      for (int i = 0; i < 4; ++i) {
        SDL_Rect cornerRect = {corners[i].x - cornerSize / 2,
                               corners[i].y - cornerSize / 2, cornerSize,
                               cornerSize};
        SDL_SetRenderDrawColor(renderer, 0, 0, 255, 255);
        SDL_RenderFillRect(renderer, &cornerRect);
      }
    }
  }

  virtual void Render(SDL_Renderer* renderer) {
    SDL_SetRenderDrawColor(renderer, 0, 0, 100, 255);
    SDL_RenderFillRect(renderer, &rect);
  }

 private:
  bool isEditable;

  SDL_Rect rect{0, 0, 0, 0};
};
void Sdl_Color(int r, int g, int b, int a) {
  SDL_Color color{Uint8(r), Uint8(g), Uint8(b), Uint8(a)};
  // return color;
}

#ifdef __EMSCRIPTEN__
EMSCRIPTEN_BINDINGS(rectangle) {
  emscripten::class_<Rectangle>("Rectangle")
      .constructor<int, int, int, int, bool>();
  emscripten::function("SdlColor", &Sdl_Color);
}
#endif