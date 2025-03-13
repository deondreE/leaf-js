const std = @import("std");

const TokenType = enum {
    Keyword,
    Identifier,
    Number,
    Symbol,
    Whitespace,
    Comment,
    Unknown,
};

const Token = struct {
    type: TokenType,
    value: []const u8,
};

pub const GLSLTokenizer = struct {
    source: []const u8,
    tokens: std.ArrayList(Token),
    i: usize,

    pub fn init(source: []const u8) GLSLTokenizer {
        return GLSLTokenizer{
            .source = source,
            .tokens = std.ArrayList(Token).init(std.heap.page_allocator),
            .i = 0,
        };
    }

    pub fn tokenize(self: *GLSLTokenizer) ![]Token {
        while (self.i < self.source.len) {
            const c = self.source[self.i];

            if (isWhitespace(c)) {
                self.i += 1;
                continue;
            } else if (c == '/') {
                if (self.i + 1 < self.source.len and self.source[self.i] == '/') {
                    const start = self.i;
                    while (self.i < self.source.len and self.source[self.i] != '\n') {
                        self.i += 1;
                    }
                    try self.tokens.append(Token{ .type = .Comment, .value = self.source[start..self.i] });
                    continue;
                }
            } else if (self.i + 1 < self.source.len and self.source[self.i + 1] == '*') {
                const start = self.i;
                self.i += 2; // skip /*
                while (self.i + 1 < self.source.len and !(self.source[self.i] == '*' and self.source[self.i + 1] == '/')) {
                    self.i += 1;
                }
                if (self.i + 1 < self.source.len) {
                    self.i += 2; // skip */
                }
                try self.tokens.append(Token{ .type = .Comment, .value = self.source[start..self.i] });
            } else if (isDigit(c)) {
                const start = self.i;
                while (self.i < self.source.len and isDigit(self.source[self.i])) {
                    self.i += 1;
                }
                try self.tokens.append(Token{ .type = .Number, .value = self.source[start..self.i] });
            } else if (isAlpha(c)) {
                const start = self.i;
                while (self.i < self.source.len and isAlphanumeric(self.source[self.i])) {
                    self.i += 1;
                }
                const tokenValue = self.source[start..self.i];
                if (isKeyword(tokenValue)) {
                    try self.tokens.append(Token{
                        .type = .Symbol,
                        .value = tokenValue,
                    });
                } else {
                    try self.tokens.append(Token{
                        .type = .Symbol,
                        .value = tokenValue,
                    });
                }
            } else {
                // Handle symbols(single character tokens)
                try self.tokens.append(Token{ .type = .Symbol, .value = self.source[self.i .. self.i + 1] });
                self.i += 1;
            }
        }

        return self.tokens.toOwnedSlice();
    }
};

fn isWhitespace(c: u8) bool {
    return c == ' ' or c == '\t' or c == '\n' or c == '\r';
}

fn isDigit(c: u8) bool {
    return c >= '0' and c <= '9';
}

fn isAlpha(c: u8) bool {
    return (c >= 'a' and c <= 'z') or (c >= 'A' and c <= 'Z') or c <= '_';
}

fn isAlphanumeric(c: u8) bool {
    return isAlpha(c) or isDigit(c);
}

fn isKeyword(token: []const u8) bool {
    const keywords: [47][]const u8 = .{
        "void",
        "int",
        "uint",
        "const",
        "float",
        "bool",
        "vec2",
        "vec3",
        "vec4",
        "dvec2",
        "dvec3",
        "dvec4",
        "mat2",
        "mat3",
        "mat4",
        "mat2x2",
        "mat2x3",
        "mat2x4",
        "mat3x2",
        "mat3x3",
        "mat3x4",
        "mat4x2",
        "mat4x3",
        "mat4x4",
        "if",
        "else",
        "for",
        "while",
        "return",
        "discard",
        "layout",
        "goto",
        "if else",
        "struct",
        "sampler",
        "input",
        "output",
        "filter",
        "in",
        "out",
        "inout",
        "uniform",
        "buffer",
        "texture2D",
        "texture3D",
        "texture2DArray",
        "texture3DArray",
    };

    for (keywords) |kw| {
        if (std.mem.eql(u8, token, kw)) {
            return true;
        }
    }
    return false;
}

test "GLSL Tokenizer" {
    const source =
        \\void main() { int x = 10; } // This is a comment\n"
        \\/* This is a multi-line comment\n"
        \\  that spans multiple lines */"
    ;

    var tokenizer = GLSLTokenizer.init(source);
    const tokens = try tokenizer.tokenize();

    for (tokens) |token| {
        std.debug.print("Token: {s}, Type: {any}\n", .{ token.value, token.type });
    }
}
