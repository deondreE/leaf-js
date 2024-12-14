INC_DIR := 
SRC_DIR := src
OBJ_DIR := obj

CC := g++ 
CPPFLAGS := -I$(INC_DIR) -MMD -MP
CXXFLAGS := -Wall
LDLIBS := -lSDL2

SOURCES := $(wildcard $(SRC_DIR)/*.cpp)
OBJS := $(SOURCES:$(SRC_DIR)/%.cpp=$(OBJ_DIR)/%.o)
DEPS := $(wildcard $(OBJ_DIR)/*.d)

.PHONY: clean

main: $(OBJS)
	$(CC) $(LDFLAGS) $^ $(LDLIBS) -o $@

$(OBJS): $(OBJ_DIR)/%.o: $(SRC_DIR)/%.cpp
	$(CXX) $(CXXFLAGS) $(CPPFLAGS) -c $(OUTPUT_OPTION) $<
