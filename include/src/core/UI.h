#include "Button.h"
#include "core.h"

class UI {
 public:
  void HandleEvent(const SDL_Event& e) { MyButton.HandleEvent(e); };

  void Render(SDL_Renderer* renderer) {
    MyButton.Render(renderer);
    test.Render(renderer);
    test.HandleResize(renderer);
  };

  Rectangle test{200, 200, 50, 50, SDL_Color{0, 0, 0}, true};
  Button MyButton{50, 50, 50, 50, false};
};