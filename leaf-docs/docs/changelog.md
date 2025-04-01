## Changes

Version 0.1.0 -- Alpha
- Added the conecpts of importing models into the current session.
    - Supported types: .stl(ascii format), .obj, and .aseprite.
- Added the creation of dynamic scenes.
    - Only cubes are supported.
    - Particles are not supported.
    - Animation: 
        - Works predefined in the web.
    - Textures are rendering kind of.
- Dynmaic parsing -- exported file types: 
    - obj files are working in js only supports multiples of 4 faces.
    - stl file are working in js only supports ascii format. 
    - aesprite binary parsing working, not rendering using webgpu.