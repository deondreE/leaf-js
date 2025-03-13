const std = @import("std");
const testing = std.testing;

/// reads the file and send all of the data inside a buffer of ptrs.
pub fn sendDataAsBytes(allocator: std.mem.Allocator, filename: []const u8) !std.ArrayList(u8) {
    var file = try std.fs.cwd().openFile(filename, .{});
    defer file.close();

    const file_stats = try file.stat();
    const size = file_stats.size;

    const buffer = try allocator.alloc(u8, size);
    defer allocator.free(buffer);

    _ = try file.readAll(buffer);

    var list = std.ArrayList(u8).init(allocator);
    try list.appendSlice(buffer);

    return list;
}

pub fn convertData(data: std.ArrayList(u8)) []const u8 {
    return data.items;
}

test "Test File buffer data" {
    const allocator = testing.allocator;

    var data = try sendDataAsBytes(allocator, "test.obj");
    defer data.deinit();

    std.debug.print("File contents: {any}\n", .{data.items});

    try testing.expect(data.items.len > 0);
}

test "Test the buffer conversion" {
    const allocator = testing.allocator;

    var data = try sendDataAsBytes(allocator, "test.obj");
    defer data.deinit();

    const converted_data = convertData(data);

    std.debug.print("Test: {s}", .{converted_data});
}
