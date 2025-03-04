extern fn print(u8) void;

/// Dispatchs functions based on numerical input, allowing for parsing to be done inside of zig, rather then inside of Typescript. Returns `void` takes `u8`.
export fn dispatch(callType: u8) void {
    switch (callType) {
        0 => print(u8),
    }
}
