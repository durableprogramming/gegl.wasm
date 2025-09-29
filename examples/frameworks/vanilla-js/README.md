# GEGL.wasm Vanilla JavaScript Example

This example demonstrates how to integrate GEGL.wasm into a plain JavaScript application.

## Features

- Load images via file input
- Apply Gaussian blur filter using GEGL operations
- Reset image to original state
- Simple, self-contained HTML file

## Usage

1. Open `index.html` in a web browser
2. Click "Click to select an image" to load an image
3. Click "Apply Blur" to process the image with GEGL
4. Click "Reset" to restore the original image

## Requirements

- A web browser with WebAssembly support
- The GEGL.wasm build must be available at `../../../build-wasm-prod/gegl.js`

## Code Structure

- `index.html`: Complete example with inline JavaScript and CSS
- Uses `GeglWorker` class for off-main-thread processing
- Demonstrates basic image loading and GEGL operation application