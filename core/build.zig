const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});

    const optimize = b.standardOptimizeOption(.{});

    const registry = b.dependency("vulkan_headers", .{}).path("registry/vk.xml");
    const lib = b.addStaticLibrary(.{
        .name = "core",
        .root_source_file = b.path("src/root.zig"),
        .target = target,
        .optimize = optimize,
    });
    b.installArtifact(lib);

    const exe = b.addExecutable(.{ .name = "core", .root_source_file = b.path("src/main.zig"), .target = target, .optimize = optimize, .link_libc = true });

    const zglfw = b.dependency("zglfw", .{});
    const zgl = b.dependency("zgl", .{
        .target = target,
        .optimize = optimize,
    });

    exe.root_module.addImport("zglfw", zglfw.module("root"));
    exe.root_module.addImport("zgl", zgl.module("zgl"));
    exe.linkLibrary(zglfw.artifact("glfw"));

    b.installArtifact(exe);

    const vk_gen = b.dependency("vulkan", .{}).artifact("vulkan-zig-generator");
    const vk_generate_command = b.addRunArtifact(vk_gen);
    vk_generate_command.addFileArg(registry);

    const run_cmd = b.addRunArtifact(exe);

    run_cmd.step.dependOn(b.getInstallStep());
    if (b.args) |args| {
        run_cmd.addArgs(args);
    }
    const run_step = b.step("run", "Run the app");
    run_step.dependOn(&run_cmd.step);
    const lib_unit_tests = b.addTest(.{
        .root_source_file = b.path("src/root.zig"),
        .target = target,
        .optimize = optimize,
    });

    const run_lib_unit_tests = b.addRunArtifact(lib_unit_tests);

    const exe_unit_tests = b.addTest(.{
        .root_source_file = b.path("src/main.zig"),
        .target = target,
        .optimize = optimize,
    });

    const run_exe_unit_tests = b.addRunArtifact(exe_unit_tests);
    const test_step = b.step("test", "Run unit tests");
    test_step.dependOn(&run_lib_unit_tests.step);
    test_step.dependOn(&run_exe_unit_tests.step);
}
