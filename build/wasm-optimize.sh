#!/bin/bash

# wasm-optimize.sh - Build GEGL for WebAssembly with advanced optimizations
# Includes SIMD, size optimization, and dead code elimination

set -e

# Check if emcc is available
if ! command -v emcc &> /dev/null; then
    echo "Error: emcc (Emscripten compiler) not found in PATH"
    echo "Please install Emscripten and ensure it's in your PATH"
    exit 1
fi

# Parse arguments
BUILD_DIR=${1:-build-wasm-optimized}

echo "Building GEGL for WebAssembly with optimizations"
echo "Build directory: $BUILD_DIR"

# Create build directory if it doesn't exist
mkdir -p "$BUILD_DIR"

# Meson arguments with optimization flags
MESON_ARGS=(
    --cross-file=cross/emscripten.txt
    meson-wasm.build
    "$BUILD_DIR"
    --buildtype=release
    --c-args="-Oz -flto -msimd128 -s DEAD_CODE_ELIMINATION=1 -s ASSERTIONS=0 -s MINIMAL_RUNTIME=1 -s EVAL_CTORS=1"
    --cpp-args="-Oz -flto -msimd128 -s DEAD_CODE_ELIMINATION=1 -s ASSERTIONS=0 -s MINIMAL_RUNTIME=1 -s EVAL_CTORS=1"
    --link-args="-Oz -flto -msimd128 -s DEAD_CODE_ELIMINATION=1 -s ASSERTIONS=0 -s MINIMAL_RUNTIME=1 -s EVAL_CTORS=1 --closure 1"
)

# Setup build with meson
echo "Running: meson setup ${MESON_ARGS[*]}"
meson setup "${MESON_ARGS[@]}"

# Build with ninja
echo "Building with ninja..."
cd "$BUILD_DIR"
ninja

echo "Optimized build completed successfully!"
echo "Output files are in: $BUILD_DIR"