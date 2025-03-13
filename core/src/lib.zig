const std = @import("std");
const toml = @import("toml.zig");

extern fn print(u8) void;

/// Dispatchs functions based on numerical input, allowing for parsing to be done inside of zig, rather then inside of Typescript. Returns `void` takes `u8`.
export fn dispatch(string: u8) void {
    print(string);
}
