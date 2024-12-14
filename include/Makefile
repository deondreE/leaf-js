# Directories
INC_DIR := core 
SRC_DIR := src
OBJ_DIR := obj

# Compiler and flags
CC := g++
CPPFLAGS := -I$(INC_DIR) -MMD -MP
CXXFLAGS := -Wall -O2
LDLIBS := -lSDL2

# Source and object files
SOURCES := $(wildcard $(SRC_DIR)/*.cpp)
OBJS := $(SOURCES:$(SRC_DIR)/%.cpp=$(OBJ_DIR)/%.o)
DEPS := $(OBJS:.o=.d)

# Target executable
.PHONY: all clean

all: main

main: $(OBJS)
	$(CC) $(CXXFLAGS) $(OBJS) $(LDLIBS) -o $@

# Rule to build object files
$(OBJ_DIR)/%.o: $(SRC_DIR)/%.cpp
	@mkdir -p $(OBJ_DIR)
	$(CC) $(CPPFLAGS) $(CXXFLAGS) -c $< -o $@

# Include dependency files
-include $(DEPS)

# Clean up
clean:
	rm -rf $(OBJ_DIR) main
