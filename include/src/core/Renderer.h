#include "core.h"

namespace Leaf {
    /// @brief Renderer is the main interface to react, everything is rooted inside of this context. 
    class Renderer {
        public:
            Renderer(int x, int y, int width, int height) 
            {
                this->starting_rect = {.x = x, .y = y, .w = width, .h = height };
            }

            void AddRect(int x, int y, int width, int height);

            void EventLoop();

            void Redraw();

            SDL_Window* GetWindow( ) { return window; }
            SDL_Renderer* GetRenderer() { return renderer; }
            
            
        private:
            std::vector<SDL_Rect> gui;        
            SDL_Rect starting_rect;

            SDL_Window *window;
            SDL_Renderer *renderer;

            uint32_t ticksForNextKeyDown = 0;
    };
}