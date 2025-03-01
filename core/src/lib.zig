extern fn print(i32) void;

export fn dispatch(a: i32, b: u8) void {
    print(a + b);
}
