# Leaf Code Style Guide

## 1. Writing Code

### JavaScript → TypeScript

To maintain consistency across the codebase, follow these conventions when writing TypeScript:

- Interfaces vs. Types: - Use interface only when extending object structures or defining contracts between systems. - Otherwise, prefer type for simpler definitions.
  > (Rule of thumb: if it won’t be extended, use a type.)
- File Endings: - Follow Unix-style EOF — all files must end with a single newline.
- Syntax Requirements: - Always terminate lines with a semicolon (;). - Always include commas in multi-line object or array declarations.
  - Variable Declarations:
    - Use single-line declarations whenever possible for readability and consistency.
    - Example: - `     const x = 1, y = 2, z = 3;
    `
  - Keyword Restrictions:
    - The `var` keyword is restricted. If absolutely necessary, ask for approval before using it.
  - Type Complexity:
    - Avoid deeply nested or overly complex types unless necessary for correctness or performance.
    - Simplify interfaces wherever possible.
  - Global Type Definitions:
    - Adding anything to `types.d.ts` (global types) requires approval — even if generated automatically.

## 2. General Standards

- API Changes: - Any modification to public or internal APIs requires review and approval by maintainers.
- File Extensions: - Do not use or introduce custom file extensions for returned or parsed files. - Stick to the standard formats handled by the parser system (e.g., .obj, .stl, .fbx, .yaml).
- Formatting: - Use Prettier with strict semicolons and trailing commas enabled. - Code must remain deterministic between developers and CI environments.

## 3. Issue Reporting Template

When opening an issue, please use the following standardized structure:

```txt
----- Heading -----
Short, simple definition of the problem.

----- Details -----
Main body of the issue:
- Description of what went wrong
- Steps to reproduce
- Attachments (screenshots, logs, console output)

----- Version -----
Leaf engine version, build number, and environment details.
```

---

Example

```txt
----- Heading -----
Renderer3D physics debug is not updating position

----- Details -----
The PhysicsDebugger buffer is not refreshed when objects move rapidly.
Observed on WebGPU backend. Screenshot attached.

----- Version -----
Leaf v0.4.12 — WebGPU build (macOS 14, Chrome 126)
```

## 4. Core Principles

- Consistency > Cleverness
  - Code should prioritize predictability and readability over shortcuts or “tricks.”
- Minimal Abstractions
  - Write only what’s necessary — avoid generic abstractions until a pattern is proven.

- Tasteful Comments
  - Use comments to clarify why something exists, not what it does.
