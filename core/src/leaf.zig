const std = @import("std");
// see:https://docs.python.org/3/c-api/index.html#c-api-index
const c = @cImport("lPy.h");

pub const Leaf = struct {
    pub fn Configure(renderingAPI: []const u8) void {
        std.debug.print("{:s}", .{renderingAPI});
    }

    pub fn ExportScene() void {}

    pub fn Render() void {}
};
