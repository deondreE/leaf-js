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
            
            void run_main_loop() {
                #ifdef __EMSCRIPTEN__
                    emscripten_set_main_loop([this]() { this->EventLoop(); }, 0, true);
                #else
                    while(true)
                    ;
                #endif
            }
        private:
            int main(void) {
                SDL_Init(SDL_INIT_VIDEO);
                SDL_CreateWindowAndRenderer(300, 300, 0, &window, &renderer);
                
                Redraw();
                run_main_loop();

                SDL_DestroyRenderer(renderer); 
                SDL_DestroyWindow(window);

                SDL_Quit();
            }

            std::vector<SDL_Rect> gui;        
            SDL_Rect starting_rect;

            SDL_Window *window;
            SDL_Renderer *renderer;

            uint32_t ticksForNextKeyDown = 0;
    };
}