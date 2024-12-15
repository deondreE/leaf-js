#include "core/MouseHandle.h"

namespace Leaf {
Cursor* const MouseHandle::getCursor() { return current_cursor; }

void MouseHandle::UpdateCursor(SDL_Event event) {
  if (event.type == SDL_MOUSEMOTION) {
    uint32_t ticksNow = SDL_GetTicks();
    if (SDL_TICKS_PASSED(ticksNow, lastMotion)) {
      lastMotion = ticksNow + 10;
      // renderer redraw
      current_cursor->x = event.motion.x;
      current_cursor->y = event.motion.y;
    }
  }
}
}  // namespace Leaf

// #ifdef __EMSCRIPTEN__
// EMSCRIPTEN_BINDINGS(mousehandle) {
//   class_<Leaf::MouseHandle>("MouseHandle")
//       .constructor<>()
//       .function("UpdateCursor", &Leaf::MouseHandle::UpdateCursor);
// }
// #endif
