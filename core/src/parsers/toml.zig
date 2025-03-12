const std = @import("std");
const types = @import("../types.zig");

const TokenType = enum {
    KEY,
    STRING,
    NUMBER,
    BOOL,
    EQUALS,
    NEWLINE,
    EOF,
};

const Token = struct {
    type: TokenType,
    start: []const u8,
};

const ConfigType = enum { JSON, TOML };

const TomlTokenizer = struct {
    input: []const u8,
    position: usize,

    pub fn init(input: []const u8) TomlTokenizer {
        return TomlTokenizer{ .input = input, .position = 0 };
    }

    pub fn nextToken(self: *TomlTokenizer) Token {
        while (self.position < self.input.len) {
            const c = self.input[self.position];
            self.position += 1;

            switch (c) {
                '=' => return Token{ .type = .EQUALS, .start = "=" },
                '\n' => return Token{ .type = .NEWLINE, .start = "/n" },
                else => if (std.ascii.isWhitespace(c)) {
                    continue;
                } else {
                    return Token{ .type = .KEY, .start = self.input[self.position - 1 .. self.position] };
                },
            }
        }
        return Token{ .type = .EOF, .start = "" };
    }

    /// Converts a JSON to toml, and TOML to json.
    fn convert(file_path: types.String, to: ConfigType) !void {
        var file = std.fs.cwd().openFile(file_path, .{ .read = true });
        defer file.close();

        // reads where the config is going to and responds.
        switch (to) {
            ConfigType.JSON => {
                var buffer: [100]u8 = undefined;
                // var fba = std.heap.FixedBufferAllocator.init(&buffer);
                try file.seekTo(0);
                try file.readAll(&buffer);
            },
            ConfigType.TOML => {},
        }
    }
};

test "Parser Test" {
    const toml = "name = \"example\"\nversion = 1.0\nenabled = true";
    var tokenizer = TomlTokenizer.init(toml);

    var token: Token = tokenizer.nextToken();
    while (token.type != .EOF) {
        std.debug.print("Token: {:?}\n", .{token.type});
        token = tokenizer.nextToken();
    }
}
