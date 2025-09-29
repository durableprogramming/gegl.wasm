#!/bin/bash

# create-distributions.sh - Generate ES6 modules, CommonJS, UMD, and standalone browser builds
# Usage: ./create-distributions.sh [dev|prod]
#   dev: Development build with sourcemaps
#   prod: Production build with minification

set -e

# Check if rollup is available
if ! command -v rollup &> /dev/null; then
    echo "Error: rollup not found. Please install it with: npm install --save-dev rollup"
    exit 1
fi

# Parse arguments
MODE=${1:-dev}

if [[ "$MODE" != "dev" && "$MODE" != "prod" ]]; then
    echo "Error: Invalid mode '$MODE'. Use 'dev' or 'prod'"
    exit 1
fi

echo "Building JavaScript distributions in $MODE mode"

# Create dist directory
mkdir -p dist

# Build with rollup
echo "Running rollup build..."
if [[ "$MODE" == "dev" ]]; then
    npx rollup -c rollup.config.js
elif [[ "$MODE" == "prod" ]]; then
    npx rollup -c rollup.config.js --environment BUILD:production
fi

# Copy WASM files if they exist
if [[ -f "build-wasm-prod/gegl.wasm" ]]; then
    echo "Copying WASM files to dist..."
    cp build-wasm-prod/gegl.wasm dist/
    cp build-wasm-prod/gegl.js dist/gegl-wasm-core.js
    cp build-wasm-prod/gegl.worker.js dist/
else
    echo "Warning: WASM files not found. Run './build-wasm.sh prod' first for complete build."
fi

echo "Build completed successfully!"
echo "Output files in dist/:"
ls -la dist/

if [[ "$MODE" == "prod" ]]; then
    echo ""
    echo "Production builds include minified versions (.min.js)"
fi