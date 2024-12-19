#include <memory>

#include "Circle.h"
#include "Rectangle.h"
#include "Scene.h"
#include "Triangle.h"
#include "core.h"

class UI {
 public:
  UI() {
    scene.addEntity(
        std::make_shared<Circle>(400, 300, 50, SDL_Color{255, 0, 0, 255}));
    scene.addEntity(std::make_shared<Rectangle>(200, 200, 100, 50, true));
    scene.addEntity(std::make_shared<Triangle>(100, 100, 150, 150, 200, 100,
                                               SDL_Color{0, 122, 0, 255}));
  }

  void GetState() {
    // Example: Retrieve and process the current state of the scene or entities
    // Implement as needed
  }

  bool HandleEvent(SDL_Event* e) {
    // Delegate event handling to the scene
    // return scene.handleEvent(e);
  }

  void Render(SDL_Renderer* renderer) {
    // Delegate rendering to the scene
    scene.render(renderer);
  }

 private:
  Scene scene;
  SDL_Renderer* renderer;
};