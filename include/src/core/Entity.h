#pragma once
#include "core.h"

class Entity {
 public:
  virtual ~Entity() = default;

  virtual void update(float deltaTime) = 0;
  virtual void handleEvents(SDL_Event* event) = 0;
  virtual void render(SDL_Renderer* renderer) const = 0;
};