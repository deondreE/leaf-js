#!/bin/bash 

check_premake() {	
	if command -v premake5 >/dev/null/ 2>&1; then
		echo "premake is already installed"
	else
		echo "Premake is not installed. Installing with homebew..."
		brew install premake
	fi
}

update_submodules() {
	echo "Updating git submodules..."
	git submodule update --init --recursive
}

if ! command -v brew >/dev/null 2>&1; then
	echo "Homebrew is not installed. Please install hombrew first."
	exit 1
fi

check_premake
update_submodules

echo "setup complete!" 
