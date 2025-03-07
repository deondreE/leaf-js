workspace "PlatformLib"
    configurations { "Release" }
    architecture "x86_64"
    location "build"

project "Platform"
    kind "SharedLib"
    language "C"
    cdialect "C99"
    targetdir "build/%{cfg.system}"
    objdir "build/obj/%{cfg.system}"

    files { "src/**.c", "src/**.h" }

    filter "system:linux"
        defines { "PLATFORM_LINUX" }
    
    filter "system:macosx"
        defines { "PLATFORM_MACOS" }
    
    filter "system:windows"
        defines { "PLATFORM_WINDOWS" }
    
    filter "system:bsd"
        defines { "PLATFORM_BSD" }

    filter "configurations:Release"
        optimize "On"
        warnings "Extra"

newaction {
    trigger = "clean",
    description = "Remove all build files",
    execute = function()
        os.rmdir("build")
    end
}
