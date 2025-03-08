const std = @import("std");
const types = @import("../types.zig");

const FBX_HEADER = "Kaydara FBX Binary  ";
const FBX_VERSION = 7400; // Example version

const ChunkType = enum {
    Header,
    GlobalSettings,
    Node,
    Geometry,
    Material,
    Animation,
    Unknown,
};

const Chunk = struct {
    chunk_type: ChunkType,
    data: []u8,
};

fn readFile(path: types.String) ![]u8 {
    const allocator = std.heap.page_allocator;
    const file = try std.fs.File.reader(path);
    defer file.close();

    const file_size = try file.getEndPos();
    const buffer = try allocator.alloc(u8, file_size);
    try file.readAll(buffer);
    return buffer;
}

fn parseHeader(data: types.String) !void {
    if (data.len < 27) {
        return error.InvalidFormat;
    }

    const header = data[0..20];
    if (header != FBX_HEADER) {
        return error.InvalidFormat;
    }

    const version = @intFromPtr(data[20..24]);
    if (version != FBX_VERSION) {
        return error.UnsupportedVersion;
    }
}

fn parseChunk(data: types.String) !Chunk {
    const chunk_size = @intFromPtr(data[0..4]);
    const chunk_type = @intFromPtr(data[4..8]);

    const chunk_data = data[8 .. chunk_size + 8];

    return Chunk{
        .chunk_type = switch (chunk_type) {
            0x1 => ChunkType.GlobalSettings,
            0x2 => ChunkType.Node,
            0x3 => ChunkType.Geometry,
            0x4 => ChunkType.Animation,
            else => ChunkType.Unknown,
        },
        .data = chunk_data,
    };
}
