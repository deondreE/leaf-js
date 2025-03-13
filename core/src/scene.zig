const std = @import("std");

pub const Vec3 = struct {
    x: f32,
    y: f32,
    z: f32,
};

pub const Vec4 = struct {
    r: f32,
    g: f32,
    b: f32,
    a: f32,
};

pub const Model = struct {
    model_type: []const u8,
    position: Vec3,
    scale: Vec3,
    color: Vec4,
};

pub const Scene = struct {
    models: Model,
};

pub const Project = struct {
    name: []const u8,
    scene: Scene,
};
