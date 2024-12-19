#pragma once
#include <algorithm>
#include <cassert>

#include "core.h"

class Rectangle {
 public:
  Rectangle(int x, int y, int w, int h, bool isEditable = false)
      : rect{x, y, w, h},
        isEditable(isEditable),
        rectSelected(false),
        resizing(false),
        resizeCorner(-1) {}

  bool IsWithinBounds(int x, int y) const {
    return (x >= rect.x && x <= rect.x + rect.w && y >= rect.y &&
            y <= rect.y + rect.h);
  }

  bool HandleEvents(SDL_Event* event, SDL_Renderer* renderer) {
    switch (event->type) {
      case SDL_MOUSEBUTTONDOWN:
      case SDL_MOUSEMOTION:
      case SDL_MOUSEBUTTONUP:
        HandleResize(event, renderer);
        return true;
      default:
        return false;
    }
  }

  void HandleResize(SDL_Event* event, SDL_Renderer* renderer) {
    if (!isEditable) return;

    int mouseX, mouseY;
    Uint32 mouseState = SDL_GetMouseState(&mouseX, &mouseY);

    const int cornerSize = 10;  // Size of corner handles
    SDL_Point corners[4] = {
        {rect.x, rect.y},                    // Top-left
        {rect.x + rect.w, rect.y},           // Top-right
        {rect.x + rect.w, rect.y + rect.h},  // Bottom-right
        {rect.x, rect.y + rect.h}            // Bottom-left
    };

    if (event->type == SDL_MOUSEBUTTONDOWN &&
        (mouseState & SDL_BUTTON(SDL_BUTTON_LEFT))) {
      // Check if the mouse is within the rectangle
      SDL_Point point{mouseX, mouseY};
      SDL_Rect rectBounds = {rect.x, rect.y, rect.w, rect.h};
      if (SDL_PointInRect(&point, &rectBounds)) {
        rectSelected = true;

        // Check if clicking on any corner
        for (int i = 0; i < 4; ++i) {
          SDL_Rect cornerRect = {corners[i].x - cornerSize / 2,
                                 corners[i].y - cornerSize / 2, cornerSize,
                                 cornerSize};
          if (SDL_PointInRect(&point, &cornerRect)) {
            resizing = true;
            resizeCorner = i;
            resizeStartPoint = {mouseX, mouseY};
            originalRect = rect;
            break;
          }
        }
      }
    } else if (event->type == SDL_MOUSEMOTION && resizing) {
      // Resize logic
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
    } else if (event->type == SDL_MOUSEBUTTONUP) {
      // Stop resizing
      resizing = false;
      resizeCorner = -1;
    }

    // Render corner points if selected
    if (rectSelected) {
      SDL_SetRenderDrawColor(renderer, 0, 255, 255, 255);
      for (const auto& corner : corners) {
        SDL_Rect cornerRect = {corner.x - cornerSize / 2,
                               corner.y - cornerSize / 2, cornerSize,
                               cornerSize};
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

  // State variables for resizing
  bool rectSelected;
  bool resizing;
  SDL_Point resizeStartPoint{};
  SDL_Rect originalRect{};
  int resizeCorner;  // 0: Top-left, 1: Top-right, 2: Bottom-right, 3:
                     // Bottom-left
};

// Utility function for SDL_Color
SDL_Color Sdl_Color(int r, int g, int b, int a) {
  return SDL_Color{Uint8(r), Uint8(g), Uint8(b), Uint8(a)};
}

#ifdef __EMSCRIPTEN__
#include <emscripten/bind.h>

EMSCRIPTEN_BINDINGS(rectangle) {
  emscripten::class_<Rectangle>("Rectangle")
      .constructor<int, int, int, int, bool>();
}
#endif
