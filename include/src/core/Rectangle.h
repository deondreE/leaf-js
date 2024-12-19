#pragma once
#include <SDL2/SDL.h>

#include <algorithm>
#include <cassert>

#include "Entity.h"
#include "core.h"

class Rectangle : public Entity {
 public:
  Rectangle(int x, int y, int w, int h, bool isEditable = false)
      : rect{x, y, w, h},
        isEditable(isEditable),
        rectSelected(false),
        resizing(false),
        resizeCorner(-1) {}

  void update(float deltaTime) override {
    // Rectangle-specific update logic (if any)
  }

  void render(SDL_Renderer* renderer) const override {
    // Draw the rectangle
    SDL_SetRenderDrawColor(renderer, 0, 0, 100, 255);
    SDL_RenderFillRect(renderer, &rect);

    // If selected, render resize handles
    if (rectSelected) {
      const int cornerSize = 10;
      SDL_Point corners[4] = {
          {rect.x, rect.y},                    // Top-left
          {rect.x + rect.w, rect.y},           // Top-right
          {rect.x + rect.w, rect.y + rect.h},  // Bottom-right
          {rect.x, rect.y + rect.h}            // Bottom-left
      };

      SDL_SetRenderDrawColor(renderer, 0, 255, 255, 255);
      for (const auto& corner : corners) {
        SDL_Rect cornerRect = {corner.x - cornerSize / 2,
                               corner.y - cornerSize / 2, cornerSize,
                               cornerSize};
        SDL_RenderFillRect(renderer, &cornerRect);
      }
    }
  }

  void handleEvents(SDL_Event* event) override {
    if (!isEditable) return;

    switch (event->type) {
      case SDL_MOUSEBUTTONDOWN:
      case SDL_MOUSEMOTION:
      case SDL_MOUSEBUTTONUP:
        HandleResize(event);
        break;
      default:
        break;
    }
  }

 private:
  SDL_Rect rect;
  bool isEditable;
  bool rectSelected;
  bool resizing;
  int resizeCorner;  // 0: Top-left, 1: Top-right, 2: Bottom-right, 3:
                     // Bottom-left
  SDL_Point resizeStartPoint{};
  SDL_Rect originalRect{};

  void HandleResize(SDL_Event* event) {
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
      SDL_Point point{mouseX, mouseY};
      SDL_Rect rectBounds = {rect.x, rect.y, rect.w, rect.h};
      if (SDL_PointInRect(&point, &rectBounds)) {
        rectSelected = true;

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
      resizing = false;
      resizeCorner = -1;
    }
  }
};
