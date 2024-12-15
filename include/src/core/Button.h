#include "Rectangle.h"
#include "core.h"

class Button : public Rectangle {
 public:
  Button(int x, int y, int w, int h, bool isEditable)
      : Rectangle{x, y, w, h, isEditable} {}

  void HandleEvent(const SDL_Event& e) {
    if (e.type == SDL_MOUSEMOTION) {
      HandleMouseMotion(e.motion);
    } else if (e.type == SDL_MOUSEBUTTONDOWN) {
      HandleMouseButton(e.button);
    }
  }

 protected:
  virtual void HandleLeftClick() {}
  virtual void HandleRightClick() {}

 private:
  void HandleMouseMotion(const SDL_MouseMotionEvent& e) {
    if (IsWithinBounds(e.x, e.y)) {
    } else {
    }
  }

  void HandleMouseButton(const SDL_MouseButtonEvent& e) {
    if (IsWithinBounds(e.x, e.y)) {
      const Uint8 Button{e.button};
      if (Button == SDL_BUTTON_LEFT) {
        HandleLeftClick();
      } else if (Button == SDL_BUTTON_RIGHT) {
        HandleRightClick();
      }
    }
  }
};