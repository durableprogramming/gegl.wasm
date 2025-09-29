#!/bin/bash

# build-wasm.sh - Build GEGL for WebAssembly using Emscripten
# Usage: ./build-wasm.sh [dev|prod] [build_dir]
#   dev: Development build with debug symbols and no optimization
#   prod: Production build with high optimization
#   build_dir: Optional build directory (default: build-wasm-dev or build-wasm-prod)

set -e

# Check if emcc is available
if ! command -v emcc &> /dev/null; then
    echo "Error: emcc (Emscripten compiler) not found in PATH"
    echo "Please install Emscripten and ensure it's in your PATH"
    exit 1
fi

# Parse arguments
MODE=${1:-dev}
BUILD_DIR=${2:-}

if [[ "$MODE" != "dev" && "$MODE" != "prod" ]]; then
    echo "Error: Invalid mode '$MODE'. Use 'dev' or 'prod'"
    exit 1
fi

# Set default build directory based on mode
if [[ -z "$BUILD_DIR" ]]; then
    BUILD_DIR="build-wasm-$MODE"
fi

echo "Building GEGL for WebAssembly in $MODE mode"
echo "Build directory: $BUILD_DIR"

# Create build directory if it doesn't exist
mkdir -p "$BUILD_DIR"

# Common meson arguments
MESON_ARGS=(
    --cross-file=cross/emscripten.txt
    .
    "$BUILD_DIR"
)

# Mode-specific arguments
if [[ "$MODE" == "dev" ]]; then
    MESON_ARGS+=(
        --buildtype=debug
        -Dc_args="-O0 -g3 -s ASSERTIONS=1 -msimd128"
        -Dcpp_args="-O0 -g3 -s ASSERTIONS=1 -msimd128"
        -Dc_link_args="-O0 -g3 -s ASSERTIONS=1 -msimd128"
        -Dcpp_link_args="-O0 -g3 -s ASSERTIONS=1 -msimd128"
    )
elif [[ "$MODE" == "prod" ]]; then
    MESON_ARGS+=(
        --buildtype=release
        -Dc_args="-O3 -flto -msimd128"
        -Dcpp_args="-O3 -flto -msimd128"
        -Dc_link_args="-O3 -flto -s WASM_BIGINT -msimd128"
        -Dcpp_link_args="-O3 -flto -s WASM_BIGINT -msimd128"
    )
fi

# Setup build with meson
echo "Running: meson setup ${MESON_ARGS[*]}"
meson setup "${MESON_ARGS[@]}"

# Build with ninja
echo "Building with ninja..."
cd "$BUILD_DIR"
ninja

echo "Build completed successfully!"
echo "Output files are in: $BUILD_DIR"