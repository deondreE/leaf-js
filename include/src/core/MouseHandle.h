#include <string>
#include "SDL2/SDL.h"

#include "core.h"

namespace Leaf {
    struct Cursor {
        int x;
        int y;
        std::string name;
    };
    class MouseHandle {
        public:
            Cursor* const getCursor();

            void UpdateCursor(SDL_Event event);
        private:
            Cursor *current_cursor;
            uint32_t lastMotion;
    };
}