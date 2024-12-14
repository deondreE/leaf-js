# Leaf-js

3d / 2d rendering pipeline, for developers that want performent rendering on the web.

## Example usage

1. React

Problem: Issues currently you require acccess to some type of Module to be able to run the code inside of c++

Solution: Have a provider wrapper / runtime, that can have event loop based on the module the user wants to call at any given time. This provider will wrap the main app, and allows users to call functions that exist only in C++.

```typescript
```

### Folder Structure

-- Include: The c++ library itself called include beacuse it is included into react as a dependency.

-- SRC: Typescript source for any provider actions / translating to typescript.