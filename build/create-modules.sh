#!/bin/bash

# create-modules.sh - Generate separate WebAssembly modules for different operation sets
# Usage: ./create-modules.sh [dev|prod] [modules...]
#   dev: Development build with debug symbols
#   prod: Production build with high optimization
#   modules: Space-separated list of modules to build (default: all)
#     Available modules: core, filters, compositing, transforms, io, workshop, full

set -e

# Check if emcc is available
if ! command -v emcc &> /dev/null; then
    echo "Error: emcc (Emscripten compiler) not found in PATH"
    echo "Please install Emscripten and ensure it's in your PATH"
    exit 1
fi

# Parse arguments
MODE=${1:-prod}
shift
MODULES=${*:-"core filters compositing transforms io workshop full"}

if [[ "$MODE" != "dev" && "$MODE" != "prod" ]]; then
    echo "Error: Invalid mode '$MODE'. Use 'dev' or 'prod'"
    exit 1
fi

echo "Building GEGL WebAssembly modules in $MODE mode"
echo "Modules to build: $MODULES"

# Define module configurations
declare -A MODULE_CONFIGS=(
    ["core"]="-Dwasm-core=true"
    ["filters"]="-Dwasm-filters=true"
    ["compositing"]="-Dwasm-compositing=true"
    ["transforms"]="-Dwasm-transforms=true"
    ["io"]="-Dwasm-io=true"
    ["workshop"]="-Dwasm-workshop=true"
    ["full"]="-Dwasm-core=true -Dwasm-filters=true -Dwasm-compositing=true -Dwasm-transforms=true -Dwasm-io=true -Dwasm-workshop=true"
)

# Create modules directory
MODULES_DIR="modules"
mkdir -p "$MODULES_DIR"

# Common meson arguments
MESON_ARGS=(
    --cross-file=cross/emscripten.txt
    meson-wasm.build
)

# Mode-specific arguments
if [[ "$MODE" == "dev" ]]; then
    MESON_ARGS+=(
        --buildtype=debug
        --c-args="-O0 -g3 -s ASSERTIONS=1"
        --cpp-args="-O0 -g3 -s ASSERTIONS=1"
        --link-args="-O0 -g3 -s ASSERTIONS=1"
    )
elif [[ "$MODE" == "prod" ]]; then
    MESON_ARGS+=(
        --buildtype=release
        --c-args="-O3 -flto"
        --cpp-args="-O3 -flto"
        --link-args="-O3 -flto -s WASM_BIGINT"
    )
fi

# Build each requested module
for MODULE in $MODULES; do
    if [[ -z "${MODULE_CONFIGS[$MODULE]}" ]]; then
        echo "Warning: Unknown module '$MODULE', skipping"
        continue
    fi

    echo "Building module: $MODULE"

    BUILD_DIR="build-wasm-$MODULE-$MODE"

    # Create build directory
    mkdir -p "$BUILD_DIR"

    # Setup build with meson
    MODULE_MESON_ARGS=("${MESON_ARGS[@]}" "${MODULE_CONFIGS[$MODULE]}" "$BUILD_DIR")
    echo "Running: meson setup ${MODULE_MESON_ARGS[*]}"
    meson setup "${MODULE_MESON_ARGS[@]}"

    # Build with ninja
    echo "Building $MODULE with ninja..."
    cd "$BUILD_DIR"
    ninja
    cd ..

    # Copy built files to modules directory
    if [[ -f "$BUILD_DIR/gegl.wasm" ]]; then
        echo "Copying $MODULE WASM files..."
        cp "$BUILD_DIR/gegl.wasm" "$MODULES_DIR/gegl-$MODULE.wasm"
        cp "$BUILD_DIR/gegl.js" "$MODULES_DIR/gegl-$MODULE.js"
        cp "$BUILD_DIR/gegl.worker.js" "$MODULES_DIR/gegl-$MODULE.worker.js"
    else
        echo "Warning: WASM files not found for module $MODULE"
    fi

    echo "Module $MODULE completed"
    echo ""
done

echo "All requested modules built successfully!"
echo "Output files in $MODULES_DIR/:"
ls -la "$MODULES_DIR/" 2>/dev/null || echo "No files found"

echo ""
echo "Available modules:"
echo "  core        - Core operations (basic image processing)"
echo "  filters     - Filter operations (blur, sharpen, etc.)"
echo "  compositing - Compositing operations (blend modes, etc.)"
echo "  transforms  - Transform operations (rotate, scale, etc.)"
echo "  io          - Input/Output operations (load/save formats)"
echo "  workshop    - Experimental workshop operations"
echo "  full        - All operations combined"