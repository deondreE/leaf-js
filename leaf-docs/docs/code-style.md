# Code Style
TODO: prebuild script -- "Take all class files, and put them into created dirs".

## Ai use policy

Go to the docs first -> Ai use is fine to illustrate prof of context. -> NO USE OF AI.

## Code Style

I tend to lean twoards the way google writes cpp.
[CPP](https://google.github.io/styleguide/cppguide.html)

CPP->Zig:
 - Snake case unless it is a class. `typedef`, `struct`  
 - Classes are camel case. 
 - 2 space indendting.
 - I hate documentation comments. Write a readme file if needed.
 - Zig -> private methods lowercase.

Javascript->Typescript:
 - There are spcicfic usagee for `interfaces`, use them sparilly and as needed otherwise use a `type`.
 - Stick to unix standards EOF.
 - Semicolon is required! Commas also are required.
 - Singleline variable declaration when possible.
 - var -> restricted ask first.
 - Complex types will be thrown out. Unless they are needed.
 - Global types `types.d.ts` -- ask first, even with generation...

General:
 - Api changes require approval.
 - No custom exetensions for returned files.
 - Don't use school accounts.