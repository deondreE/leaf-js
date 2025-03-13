const std = @import("std");
const testing = std.testing;
const scene = @import("./scene.zig");

const TokenType = enum {
    identifier,
    equals,
    string,
    number,
    boolean,
    l_bracket,
    r_bracket,
    double_l_bracket,
    double_r_bracket,
    comment,
    comma,
    eof,
};

const Token = struct {
    type: TokenType,
    value: []const u8,
};

const TomlTokenizer = struct {
    input: []const u8,
    index: usize,

    pub fn init(input: []const u8) TomlTokenizer {
        return TomlTokenizer{ .input = input, .index = 0 };
    }

    fn peek(self: *TomlTokenizer) ?u8 {
        if (self.index >= self.input.len) return null;
        return self.input[self.index];
    }

    fn advance(self: *TomlTokenizer) void {
        if (self.index < self.input.len) {
            self.index += 1;
        }
    }

    fn consumeWhile(self: *TomlTokenizer, comptime predicate: fn (u8) bool) []const u8 {
        const start = self.index;
        while (self.peek()) |c| {
            if (!predicate(c)) break;
            self.advance();
        }

        return self.input[start..self.index];
    }

    pub fn nextToken(self: *TomlTokenizer) Token {
        while (self.index < self.input.len) {
            const c = self.input[self.index];
            self.index += 1;

            switch (c) {
                ' ', '\t', '\n', '\r' => self.advance(), // Skip whitespace
                '=' => {
                    self.advance();
                    return Token{ .type = .equals, .value = "=" };
                },
                '[' => {
                    self.advance();
                    if (self.peek() == '[') {
                        self.advance();
                        return Token{ .type = .double_l_bracket, .value = "[[" };
                    }
                    return Token{ .type = .l_bracket, .value = "[" };
                },
                ']' => {
                    self.advance();
                    if (self.peek() == ']') {
                        self.advance();
                        return Token{ .type = .double_r_bracket, .value = "]]" };
                    }
                    return Token{ .type = .r_bracket, .value = "]" };
                },
                ',' => {
                    self.advance();
                    return Token{ .type = .comma, .value = "," };
                },
                '"' => {
                    self.advance();
                    const start = self.index;
                    while (self.peek()) |ch| {
                        if (ch == '"') {
                            const str_value = self.input[start..self.index];
                            self.advance();
                            return Token{ .type = .string, .value = str_value };
                        }
                        self.advance();
                    }
                },
                '0'...'9', '-', '.' => {
                    const num_value = self.consumeWhile(numericOrSign);
                    return Token{ .type = .number, .value = num_value };
                },
                'a'...'z', 'A'...'Z', '_' => {
                    const ident = self.consumeWhile(identifierChar);
                    if (std.mem.eql(u8, ident, "true") or std.mem.eql(u8, ident, "false")) {
                        return Token{ .type = .boolean, .value = ident };
                    }
                    return Token{ .type = .identifier, .value = ident };
                },
                else => {
                    std.debug.print("Unexpected character: {}\n", .{c});
                    self.advance();
                },
            }
        }

        return Token{ .type = .eof, .value = "" };
    }

    fn numericOrSign(c: u8) bool {
        return (c >= '0' and c <= '9') or c == '-' or c == '.';
    }

    fn identifierChar(c: u8) bool {
        return (c >= 'a' and c <= 'z') or (c >= 'A' and c <= 'Z') or c == '_';
    }

    fn tokenizeCommet(self: *TomlTokenizer) Token {
        const start = self.index - 1;
        while (self.index < self.input.len and self.input[self.index] != '\n') {
            self.index += 1;
        }

        return Token{ .type = .comment, .value = self.input[start..self.index] };
    }

    fn tokenizeString(self: *TomlTokenizer) Token {
        const start = self.index;
        while (self.index < self.input.len and self.input[self.index] != '"') {
            self.index += 1;
        }

        self.index += 1;
        return Token{ .type = .string, .value = self.input[start .. self.index - 1] };
    }

    fn tokenizeNumber(self: *TomlTokenizer) Token {
        const start = self.index - 1;
        while (self.index < self.input.len and std.ascii.isDigit(self.input[self.index])) {
            self.index += 1;
        }

        return Token{ .type = .number, .value = self.input[start..self.index] };
    }

    fn tokenizeIdentifier(self: *TomlTokenizer) Token {
        const start = self.index - 1;
        while (self.index < self.input.len and (std.ascii.isAlphabetic(self.input[self.index]) or self.input[self.index] == '_')) {
            self.index += 1;
        }
        const value = self.input[start..self.index];

        if (std.mem.eql(u8, value, "true") or std.mem.eql(u8, value, "false")) {
            return Token{ .type = .boolean, .value = value };
        }

        return Token{ .type = .key, .value = value };
    }
};

pub const TomlParser = struct {
    tokenizer: TomlTokenizer,

    pub fn init(input: []const u8) TomlParser {
        return TomlParser{ .tokenizer = TomlTokenizer.init(input) };
    }

    pub fn parse(self: *TomlParser) scene.Project {
        var project = scene.Project{
            .name = "",
            .scene = scene.Scene{
                .models = scene.Model{
                    .model_type = "",
                    .position = scene.Vec3{ .x = 0, .y = 0, .z = 0 },
                    .scale = scene.Vec3{ .x = 1, .y = 1, .z = 1 },
                    .color = scene.Vec4{ .r = 1, .g = 1, .b = 1, .a = 1 },
                },
            },
        };
        var token = self.tokenizer.nextToken();
        var current_section: ?[]const u8 = null;

        while (token.type != .eof) {
            switch (token.type) {
                .l_bracket => {
                    const section_name = self.tokenizer.nextToken();
                    if (section_name.type != .identifier) {
                        std.debug.panic("Expected section name after [", .{});
                    }
                    _ = self.tokenizer.nextToken();
                    current_section = section_name.value;
                },
                .double_l_bracket => {
                    _ = self.tokenizer.nextToken();
                    _ = self.tokenizer.nextToken();
                    current_section = "scene";
                },
                .identifier => {
                    const key = token.value;
                    _ = self.tokenizer.nextToken(); // consume =
                    const value = self.tokenizer.nextToken();

                    if (std.mem.eql(u8, key, "name")) {
                        project.name = value.value;
                    } else if (std.mem.eql(u8, key, "type")) {
                        project.scene.models.model_type = value.value;
                    } else if (std.mem.eql(u8, key, "scale")) {
                        project.scene.models.position = parseVec3(value.value);
                    } else if (std.mem.eql(u8, key, "type")) {
                        project.scene.models.scale = parseVec3(value.value);
                    } else if (std.mem.eql(u8, key, "color")) {
                        project.scene.models.color = parseVec4(value.value);
                    }
                },
                else => {},
            }
            token = self.tokenizer.nextToken();
        }
        return project;
    }
};

fn parseVec3(input: []const u8) scene.Vec3 {
    var iter = std.mem.tokenize(u8, input, ", ");
    return scene.Vec3{
        .x = parseFloat(iter.next().?),
        .y = parseFloat(iter.next().?),
        .z = parseFloat(iter.next().?),
    };
}

fn parseVec4(input: []const u8) scene.Vec4 {
    var iter = std.mem.tokenize(u8, input, ", ");
    return scene.Vec4{
        .r = parseFloat(iter.next().?),
        .g = parseFloat(iter.next().?),
        .b = parseFloat(iter.next().?),
        .a = parseFloat(iter.next().?),
    };
}

fn parseFloat(value: []const u8) f32 {
    std.debug.print("Value: {s}", .{value});
    return std.fmt.parseFloat(f32, value) catch 0.0;
}

test "TOML Tokenizer Test" {
    const toml_test = "title = \"TOML Example\" enabled = true debug_mode = false [database] server = \"127.0.0.1\" [server] ip = \"192.168.1.1\" port = 8080 [[products]] name = \"Laptop\" price = 999.99 [[products]] name = \"Smartphone\" price = 699.99";

    var tokenizer = TomlTokenizer.init(toml_test);

    const start_time = std.time.nanoTimestamp(); // Start time tracking

    var token: Token = tokenizer.nextToken();
    while (token.type != .eof) {
        std.debug.print("Token: {s} -> \"{s}\"\n", .{ @tagName(token.type), token.value });
        token = tokenizer.nextToken();
    }

    const end_time = std.time.nanoTimestamp(); // End time tracking
    const elapsed_time = end_time - start_time;
    std.debug.print("Test execution time: {} ns\n", .{elapsed_time});
}

test "Parse TOML to Struct" {
    const toml_test = "title = \"TOML Example\" enabled = true debug_mode = false [database] server = \"127.0.0.1\" [server] ip = \"192.168.1.1\" port = 8080 [[products]] name = \"Laptop\" price = 999.99 [[products]] name = \"Smartphone\" price = 699.99";

    var parser = TomlParser.init(toml_test);
    const project = parser.parse();

    std.debug.print("Project name {s}", .{project.name});
}
