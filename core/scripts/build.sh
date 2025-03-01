#!/bin/bash

zig build-exe src/lib.zig -target wasm32-freestanding -fno-entry --export=add