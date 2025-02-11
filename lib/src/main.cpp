#include <iostream>
#include <fstream>
#include <string>
#include <vector>
#include <map>

#include <nlohmann/json.hpp> 
using json = nlohmann::json;

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

	return 0;
}