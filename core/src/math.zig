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

pub const Mat4 = struct {
    data: [4][4]f32 = .{.{0} ** 4} ** 4,

    pub fn create(self: *Mat4) [4][4]f32 {
        return self.data;
    }

    /// Multiplies two matricies into a given source obejct.
    pub fn multiply(self: *Mat4, m1: [4][4]f32, m2: [4][4]f32) [4][4]f32 {
        for (0..4) |row| {
            for (0..4) |col| {
                var sum: f32 = 0;
                for (0..4) |k| {
                    sum += m1[row][k] * m2[k][col];
                }
                self.data[row][col] = sum;
            }
        }

        return self.data;
    }
};

test "Matrix Multiplication" {
    const expect = std.testing.expect;

    const m1: [4][4]f32 = .{
        .{ 1, 2, 3, 4 },
        .{ 5, 6, 7, 8 },
        .{ 9, 10, 11, 12 },
        .{ 13, 14, 15, 16 },
    };

    const m2: [4][4]f32 = .{ .{ 17, 18, 19, 20 }, .{ 21, 22, 23, 24 }, .{ 25, 26, 27, 28 }, .{ 29, 30, 31, 32 } };

    const expected_result: [4][4]f32 = .{ .{ 250, 260, 270, 280 }, .{ 618, 644, 670, 696 }, .{ 986, 1028, 1070, 1112 }, .{ 1354, 1412, 1470, 1528 } };

    const result = Mat4.multiply(m1, m2);

    for (0..4) |i| {
        for (0..4) |j| {
            try expect(result[i][j] == expected_result[i][j]);
        }
    }
}
