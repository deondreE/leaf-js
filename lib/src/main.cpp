#include <iostream>
#include <thread>
#include <chrono>
#include <fstream>
#include <string>
#include <vector>
#include <map>
#include <coroutine>
#include <functional>

#include "platform.h"
#if IS_EMSCRIPTEN
#include <emscripten.h>
#endif

#include <nlohmann/json.hpp> 
using json = nlohmann::json;


/// <summary>
/// 
/// SCENE PROBLEM: if there is no scene there is no pipeline,
/// SOLUTION: Call `Awake` sequentially in C++ create that default before js knows what its doing, no errors. 
/// </summary>
struct awaiter {
	std::chrono::milliseconds delay;

	bool await_ready() const noexcept {
		return delay.count() <= 0;
	}

	// FIXME: Emcc does not have direct access to the systems threads.
	// TODO: support emscripten, so that this can be called inside of webbased applications.
	void await_suspend(std::coroutine_handle<> handle) const {
		#if IS_EMSCRIPTEN
				emscripten_async_call([](void* arg) {
					std::coroutine_handle<>::from_address(arg).resume();
					}, handle.address(), delay.count());
		#else
				std::thread([handle, this] {
					std::this_thread::sleep_for(delay);
					handle.resume();
				}).detach();
		#endif
	}

	void await_resume() const noexcept {}
};

struct task {
	struct promise_type {
		task get_return_object() {
			return { std::coroutine_handle<promise_type>::from_promise(*this) };
		}
		std::suspend_never initial_suspend() { return {}; }
		std::suspend_never final_suspend() noexcept { return {}; }
		void return_void() {}
		void unhandled_exception() {}
	};

	std::coroutine_handle<promise_type> handle_;
};


template <typename Func>
task async_wait(std::chrono::milliseconds delay, Func&& func) {
	std::cout << "Coroutine is about to suspend for" << delay.count() << std::endl;
	co_await awaiter{ delay };
	func();
	std::cout << "Coroutine has resumed!" << std::endl;
	co_return;
}

namespace Leaf {

	enum class ModelType {
		TRIANGLE,
		QUAD,
		CUBE,
		CAPSULE
	};

	struct Model {
		std::map<ModelType, std::string> type;
		std::string name;
		struct Size {
			float w, h;
		} size;
		std::vector<float> verticies;
		std::vector<float> transforms;
		std::optional < std::string> sourceFile;

		Model(const std::string& name, const Size& size, const std::vector<float>& verticies,
			const std::vector<float>& transforms, std::optional<std::string> sourceFile = std::nullopt)
			: name(name), size(size), verticies(verticies), transforms(transforms), sourceFile(sourceFile) {
		}
	};

	struct scene_data {		
		std::string name;	
		std::vector<Model> children;
	};

	// Fixme: Write json_read.
	void json_write(const scene_data& data) {
		json json_file;
		json_file["scene_name"] = data.name;

		// Serialize models
		for (const auto& model : data.children) {
			json model_json;
			model_json["name"] = model.name;
			model_json["size"] = { {"w", model.size.w}, {"h", model.size.h} };
			model_json["verticies"] = model.verticies;
			model_json["transforms"] = model.transforms;
			if (model.sourceFile) {
				model_json["sourceFile"] = *model.sourceFile;
			}
			// Add model to children list in JSON
			json_file["children"].push_back(model_json);
		}

		try {
			std::ofstream file("scene.json");
			if (!file.is_open()) {
				throw std::ios_base::failure("Failed to open file for writing.");
			}
			file << json_file.dump(2);
			file.close();
		}
		catch (const std::exception& e) {
			std::cerr << "Error writing to file: " << e.what() << std::endl;
		}
	}
}

// If you want emscripten test env.
#if IS_EMSCRIPTEN
	void emscripten_main_loop() {
		async_wait(std::chrono::milliseconds(1000), [] {
			std::cout << "Executing this func." << std::endl;
		});
	}
	
	int main() {
		emscripten_set_main_loop(emscripten_main_loop, 0, 0);
		return 0;
	}
#endif


int main() {
	// Create sample model data
	Leaf::Model::Size size1 = { 10.0f, 20.0f };
	std::vector<float> verticies1 = { 1.0f, 2.0f, 3.0f };
	std::vector<float> transforms1 = { 0.0f, 0.0f, 1.0f };
	Leaf::Model model1("Model1", size1, verticies1, transforms1, "model1_source.obj");

	Leaf::Model::Size size2 = { 15.0f, 25.0f };
	std::vector<float> verticies2 = { 4.0f, 5.0f, 6.0f };
	std::vector<float> transforms2 = { 0.0f, 1.0f, 0.0f };
	Leaf::Model model2("Model2", size2, verticies2, transforms2);

	// Create scene and add models
	Leaf::scene_data scene;
	scene.name = "Example Scene";
	scene.children.push_back(model1);
	scene.children.push_back(model2);

	// Write to JSON
	Leaf::json_write(scene);
	std::cout << "Scene data written to scene.json" << std::endl;

	// async func call.
	std::cout << "Main start" << std::endl;
	auto my_task = async_wait(std::chrono::seconds(2), [] {
		std::cout << "Executing some funciton..." << std::endl;
	});
	std::cout << "Main continues while coroutine is suspended." << std::endl;
	std::this_thread::sleep_for(std::chrono::seconds(2));
	std::cout << "Main end!" << std::endl;

	return 0;
}