/// Javascript package of leaf allowing for webgpu, to run more efficiently. Think of it more as a process handler.
extern fn print(i32) void;

export fn dispatch(a: i32, b: u8) void {
    print(a + b);
}
