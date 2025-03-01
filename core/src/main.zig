const std = @import("std");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    const allocator = gpa.allocator();

    const wasm_file_path = "lib.wasm";
    const text_file_path = "output.txt";

    const wasm_file = try std.fs.cwd().openFile(wasm_file_path, .{ .mode = .read_only });
    defer wasm_file.close();

    const wasm_file_size = (try wasm_file.stat()).size;
    const wasm_buffer = try allocator.alloc(u8, wasm_file_size);
    defer allocator.free(wasm_buffer);

    _ = try wasm_file.reader().readAll(wasm_buffer);
    const text_file = try std.fs.cwd().createFile(
        text_file_path,
        .{ .truncate = true },
    );
    defer text_file.close();

    const writer = text_file.writer();
    try writer.writeAll(wasm_buffer);

    std.debug.print("Wrote WASM data to {any}\n", .{text_file_path});
}
