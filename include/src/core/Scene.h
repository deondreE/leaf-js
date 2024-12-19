#include <iostream>
#include <memory>
#include <string>
#include <vector>

#include "Entity.h"

class Sprite : public Entity {
  std::string name;

 public:
  explicit Sprite(const std::string& spriteName) : name(spriteName) {}

  void update(float deltaTime) override {
    std::cout << "Updating sprite: " << name << " with deltaTime: " << deltaTime
              << "\n";
  }

  void render(SDL_Renderer* renderer) const override {
    std::cout << "Rendering sprite: " << name << "\n";
  }
};

class Scene {
  std::vector<std::shared_ptr<Entity>> entities;

 public:
  void addEntity(const std::shared_ptr<Entity>& entity) {
    entities.push_back(entity);
  }

  void update(float deltaTime) {
    for (const auto& entity : entities) {
      entity->update(deltaTime);
    }
  }

  void render(SDL_Renderer* renderer) const {
    for (const auto& entity : entities) {
      entity->render(renderer);
    }
  }

  void clear() { entities.clear(); }
};