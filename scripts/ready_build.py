import os
import shutil

def ready_build():
    """
    Takes the wasm file from the zig build, copies it then copies the style file as well. 
    """
    src_file_paths = ["./core/lib.wasm", "./src/style.css"]
    dist_dir = "dist"

    os.makedirs(dist_dir, exist_ok=True)

    for file in src_file_paths:
        if os.path.exists(file):
            shutil.copy(file, dist_dir)
            print(f"Copied {file} to {dist_dir}")
        else:
            print(f"Warning: {file} not found.")

if __name__ == "__main__":
    ready_build()
