#include "Button.h"
#include "Circle.h"
#include "Line.h"
#include "Triangle.h"
#include "core.h"

namespace Leaf {

struct Widget {
  // @brief This could be your current `Rectangle` or `Button` defaults to
  // null.
  Rectangle* current;
  // @brief A Button / rectangle can have things inside of it when it comes
  // rendertime, button has text. There are ways that we translate these gui
  // 'Layers'.
  std::vector<Rectangle> Children;
};

struct Cursor {
  int x, y;
  // @brief this would be the current event that the mouse is triggering.
  SDL_Event* event;
};

struct RenderState {
  Cursor* Cursor;
  bool update;
  // @brief What there is to render. Is being used as a stack persay.
  std::vector<Widget> widgets;
};
}  // namespace Leaf

class UI {
 public:
  void GetState();

  bool HandleEvent(SDL_Event* e) {
    MyButton.HandleEvent(e);
    test.HandleResize(e, renderer);
  };

  void Render(SDL_Renderer* renderer) {
    MyButton.Render(renderer);
    test.Render(renderer);
    circle.Render(renderer);
    triangle.Render(renderer);
    line.Render(renderer);
    this->renderer = renderer;
  };

  Rectangle test{200, 200, 50, 50, true};
  Button MyButton{50, 50, 50, 50, false};
  Triangle triangle{100, 160, 150, 160, 200, 220, {255, 0, 0, 255}};
  Circle circle{400, 300, 100, {255, 0, 0, 255}};  // red circle.
  Line line{10, 120, 12, 12, {0, 0, 255, 255}};

 private:
  Leaf::RenderState* currentState;
  SDL_Renderer* renderer;
};