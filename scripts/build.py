import os
import subprocess

def build_cpp_files(path):
    if not os.path.exists(path):
        print("wrong folder")
    
    for filename in os.listdir(path):
        if filename.endswith(".cpp"): 
            cpp_file_path = os.path.join(path, filename)
            
            output_name = os.path.splitext(filename)[0]
            js_output_file = os.path.join(f"{path}/bin", f"{output_name}.js")

            command = [
                "emcc",
                "-lembind",
                "-o", js_output_file,
                cpp_file_path
            ]

            try:
                print(f"Building....")
                result = subprocess.run(command, capture_output=True, text=True)

                if result.returncode == 0:
                    print(f"Sucessfull built {js_output_file}")
                else:
                    print(f"Error building {filename}:\n{result.stderr}") 
            except FileNotFoundError:
                print("Error not installed in path")
                return 

folder_path = f"{os.getcwd()}/include/src"
build_cpp_files(folder_path)