import subprocess

def build_wasm(): 
    exported_funcs = ["dispatch"]

    # per exported func add --export=funname
    export_flags = "".join([f"--export={func}" for func in exported_funcs]) 

    command = f"zig build-exe src/wasm_dispatcher.zig -target wasm32-freestanding -fno-entry {export_flags} -O ReleaseSmall"

    print("Running: {command}")
    result = subprocess.run(command, shell=True, capture_output=True, text=True)

    if result.returncode == 0:
        print("Build Worked")
    else:
        print("Build Broke!")
        print(result.stderr)
        
if __name__ == "__main__":
    build_wasm()