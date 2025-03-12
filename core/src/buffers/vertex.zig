const std = @import("std");
const ArrayList = std.ArrayList;
const testing = std.testing;

// This allows for the data to be held somewhere if it is chunked, then after it is used we remove the chunk.
pub fn create_vertex_chace(size: u8) !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    const allocator = gpa.allocator();
    defer {
        const deinit_status = gpa.deinit();
        if (deinit_status == .leak) testing.expect(false) catch @panic("BROKEN DEINIT");
    }

    // Puts a copy vertex data, into actual memory as "Cache".
    const bytes = try allocator.alloc(u8, size);
    defer allocator.free(bytes);
}

pub fn chunk_vertex(data: u8) !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    var list = ArrayList(u8).init(gpa.allocator());
    defer list.deinit();

    // converts traditional array to 'vertex' in zig. Then allowing for us to slice the vertex data.
    try list.append(data);
}
