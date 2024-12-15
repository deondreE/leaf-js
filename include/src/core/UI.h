#include "Button.h"
#include "core.h"

class UI {
 public:
  void HandleEvent(const SDL_Event& E) { MyButton.HandleEvent(E); };

  void Render(SDL_Renderer* renderer) {
    MyButton.Render(renderer);
    test.Render(renderer);
  };

  Rectangle test{200, 200, 50, 50};
  Button MyButton{50, 50, 50, 50};
};