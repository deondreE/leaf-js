const std = @import("std");
const math = @import("math.zig");

pub const Model = struct {
    model_type: []const u8,
    position: math.Vec3,
    scale: math.Vec3,
    color: math.Vec4,
};

pub const Scene = struct {
    models: Model,
};

pub const Project = struct {
    name: []const u8,
    scene: Scene,
};
