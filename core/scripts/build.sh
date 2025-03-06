#!/bin/bash

zig build-exe src/wasm_dispatcher.zig -target wasm32-freestanding -fno-entry --export=add