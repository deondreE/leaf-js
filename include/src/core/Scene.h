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

  const std::string& getName() const { return name; }
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

  //  void removeEntity(const std::string& name) {
  //   entities.erase(
  //       std::remove_if(entities.begin(), entities.end(),
  //                      [&name](const std::shared_ptr<Entity>& entity) {
  //                        auto sprite =
  //                        std::dynamic_pointer_cast<Sprite>(entity); return
  //                        sprite && sprite->getName() == name;
  //                      }),
  //       entities.end());
  // }

  void clear() { entities.clear(); }
};

#ifdef __EMSCRIPTEN__
EMSCRIPTEN_BINDINGS(scene_bindings) {
  emscripten::class_<Entity>("Entity")
      .function("update", &Entity::update)
      .function("render", &Entity::render);

  emscripten::class_<Sprite, emscripten::base<Entity>>("Sprite")
      .constructor<std::string>()
      .function("getName", &Sprite::getName);

  emscripten::class_<Scene>("Scene")
      .constructor<>()
      .function(
          "addEntity",
          emscripten::select_overload<void(const std::shared_ptr<Entity>&)>(
              &Scene::addEntity))
      .function("removeEntity", &Scene::removeEntity)
      .function("update", &Scene::update)
      .function("render", &Scene::render)
      .function("clear", &Scene::clear);
}
#endif