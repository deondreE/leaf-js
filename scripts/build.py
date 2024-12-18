import os
import subprocess
import time
from termcolor import colored

def build_cpp_files(path):
    if not os.path.exists(path):
        print("wrong folder")

    object_files = []
    
    for filename in os.listdir(path):
        if filename.endswith(".cpp"): 
            cpp_file_path = os.path.join(path, filename)
            
            output_name = os.path.splitext(filename)[0]
            obj_file = os.path.join(f"{path}/bin", f"{output_name}.o")
 
            command_1 = [
                "emcc",
                "-O2",
                cpp_file_path,
                "-c", "-o",
                obj_file
            ]

            try:
                print(colored(f"Building {filename}...", "cyan"))
                result = subprocess.run(command_1, capture_output=True, text=True)

                if result.returncode == 0:
                    print(colored(f"Successfully built {obj_file}", "green"))
                    object_files.append(obj_file)  # Collect the generated object file
                else:
                    print(colored(f"Error building {filename}:\n{result.stderr}", "red"))
                    return
            except FileNotFoundError:
                print(colored("Error: emcc is not installed or not in PATH.", "red"))
                return
    if object_files:
        js_output_file = os.path.join(f"{path}/bin", "leaf.js")
        command_2 = [
            "emcc",
                      "-lembind",
            "-sUSE_SDL=2",
            "-O2",
            *object_files,  # Expand the list of .o files
            "-o",
            js_output_file,
            # "-s",
            # "MODULARIZE=1",
            # "-s",
            # "EXPORT_ES6=1"
        ]

        try:
            print(colored("Linking object files into leaf.js...", "cyan"))
            final_build = subprocess.run(command_2, capture_output=True, text=True)

            if final_build.returncode == 0:
                print(colored(f"Successfully created {js_output_file}", "green"))
            else:
                print(colored(f"Error linking object files:\n{final_build.stderr}", "red"))
        except FileNotFoundError:
            print(colored("Error: emcc is not installed or not in PATH.", "red"))

folder_path = f"{os.getcwd()}/include/src"
build_cpp_files(folder_path)
