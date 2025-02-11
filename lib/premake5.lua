workspace "LeafLib"
   configurations { "Debug", "Release" }

project "Lib"
   kind "ConsoleApp"
   language "C++"
   targetdir "bin/%{cfg.buildcfg}"
   cppdialect "C++20"

   -- Include directories
   includedirs {
      "vendor/json/single_include/"
   }

   -- Source files
   files {
      "src/**.cpp",
      "src/**.h"
   }

   -- Configuration settings
   filter "configurations:Debug"
      defines { "DEBUG" }
      symbols "On"

   filter "configurations:Release"
      defines { "NDEBUG" }
      optimize "On"
