#include "Button.h"
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

  void HandleEvent(const SDL_Event& e) { MyButton.HandleEvent(e); };

  void Render(SDL_Renderer* renderer) {
    MyButton.Render(renderer);
    test.Render(renderer);
    test.HandleResize(renderer);
  };

  Rectangle test{200, 200, 50, 50, true};
  Button MyButton{50, 50, 50, 50, false};

 private:
  Leaf::RenderState* currentState;
};