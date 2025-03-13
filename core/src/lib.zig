const std = @import("std");
const toml = @import("toml.zig");

extern fn print([*]const u8) void;

export fn dispatch(string: [*]const u8, type_j: i8) void {
    if (type_j == 0) {
        // Do some function here for somewhere else.
    }
    print(string);
}

var buffer: [256]u8 = undefined;
export fn getBufferPtr() *[256]u8 {
    return &buffer;
}
