cmake_minimum_required(VERSION 3.14)
project(Leaf VERSION 1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(LIB_NAME Leaf)

# Add the library as static
add_library(${LIB_NAME} STATIC)

if (DEFINED EMSCRIPTEN)

    file(GLOB SOURCE_FILES
        src/*.cpp
        src/*.c
    )
    file(GLOB HEADER_FILES
        core/*.h
        core/*.hpp
    )
	add_executable(Leaf $(SOURCE_FILES) $(HEADER_FILES))
    set(CMAKE_EXECUTABLE_SUFFIX ".wasm")
        # sdl things
    find_package(SDL2 REQUIRED)
    include_directories(${SDL2_INCLUDE_DIRS})
    target_link_libraries(${LIB_NAME} PUBLIC ${SDL2_LIBRARIES})

	set_target_properties(Leaf PROPERTIES COMPILE_FLAGS "-Os -s SIDE_MODULE=1 ")
	set_target_properties(Leaf PROPERTIES LINK_FLAGS    "-Os -s WASM=1 -s SIDE_MODULE=1 -s STANDALONE_WASM --no-entry")
else()
	add_library(Leaf SHARED src/Application.cpp)
endif()
