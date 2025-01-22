#include <stdio.h>
#include <stdint.h>
#include <stdlib.h> 
#include <string.h>

typedef struct {
    char *name;
    void *data;
    size_t size;
} Property;

typedef struct Node
{
    char *name;
    Property *properties;
    size_t property_count;
    struct Node *children;
    size_t child_count;
};
static uint8_t read_uint8(FILE *file) {
    uint8_t value;
    fread(&value, sizeof(uint8_t), 1, file);
    return value;
}

static uint32_t read_uint32(FILE *file) {
    uint32_t value;
    fread(&value, sizeof(uint32_t), 1, file);
    return value;
}

static int16_t read_int16(FILE *file) {
    int16_t value;
    fread(&value, sizeof(int16_t), 1, file);
    return value;
}

static char *read_string(FILE *file, size_t length) {
    char *str = (char *)malloc(length + 1);
    fread(str, sizeof(char), length, file);
    str[length] = '\0';
    return str;
}

static uint32_t parse_header(File *file) {
    char magic[23];
    fread(magic, sizeof(char), 23, file);
    if (strncmp(magic, "Kaydara, FBX Binary \0", 21) != 0) {
        fpritnf(stderr, "invalid FBX file.\n");
        exit(EXIT_FAILURE);
    }

     uint32_t version = read_uint32(file);
    printf("FBX Version: %u\n", version);
    return version;
}

static Property parse_property(FILE *file) {
    Property property = {0};
    char type_code = read_uint8(file);

    switch (type_code) {
        case 'Y': // 2-byte integer
            property.size = sizeof(int16_t);
            property.data = malloc(property.size);
            *((int16_t *)property.data) = read_int16(file);
            break;

        case 'C': // 1-byte boolean
            property.size = sizeof(uint8_t);
            property.data = malloc(property.size);
            *((uint8_t *)property.data) = read_uint8(file);
            break;

        case 'I': // 4-byte integer
            property.size = sizeof(int32_t);
            property.data = malloc(property.size);
            *((int32_t *)property.data) = read_uint32(file);
            break;

        case 'S': // String
        case 'R': { // Raw binary data
            uint32_t length = read_uint32(file);
            property.size = length;
            property.data = malloc(length);
            fread(property.data, sizeof(char), length, file);
            break;
        }

        default:
            fprintf(stderr, "Unsupported property type: %c\n", type_code);
            exit(EXIT_FAILURE);
    }

    return property;
}

static Node parse_node(FILE *file) {
    Node node = {0};

    uint32_t end_offset = read_uint32(file);
    uint32_t num_properties = read_uint32(file);
    uint32_t property_list_len = read_uint32(file);
    uint8_t name_len = read_uint8(file);

    node.name = read_string(file, name_len);

    // Parse properties
    node.property_count = num_properties;
    node.properties = (Property *)malloc(num_properties * sizeof(Property));
    for (uint32_t i = 0; i < num_properties; i++) {
        node.properties[i] = parse_property(file);
    }

    // Parse children
    size_t child_start = ftell(file);
    while (child_start < end_offset - 13) {
        node.child_count++;
        node.children = (Node *)realloc(node.children, node.child_count * sizeof(Node));
        node.children[node.child_count - 1] = parse_node(file);
        child_start = ftell(file);
    }

    // Validate null record
    uint8_t null_record[13];
    fread(null_record, sizeof(uint8_t), 13, file);
    for (int i = 0; i < 13; i++) {
        if (null_record[i] != 0) {
            fprintf(stderr, "Invalid null record.\n");
            exit(EXIT_FAILURE);
        }
    }

    return node;
}

int main(int argc, char **argv) {
    if (argc < 2) {
        fprintf(stderr, "Usage: %s <fbx-file>\n", argv[0]);
        return EXIT_FAILURE;
    }

    FILE *file = fopen(argv[1], "rb");
    if (!file) {
        perror("Failed to open file");
        return EXIT_FAILURE;
    }

    uint32_t version = parse_header(file);
    Node root = parse_node(file);

    printf("Root Node: %s\n", root.name);

    fclose(file);
    return EXIT_SUCCESS;
}

// CLEAN
static void free_property(Property *property) {
    free(property->data);
}

static void free_node(Node *node) {
    for (size_t i = 0; i < node->property_count; i++) {
        free_property(&node->properties[i]);
    }
    free(node->properties);

    for (size_t i = 0; i < node->child_count; i++) {
        free_node(&node->children[i]);
    }
    free(node->children);
    free(node->name);
}

