# GEGL.wasm Vue Example

This example demonstrates how to integrate GEGL.wasm into a Vue 3 application using the Composition API.

## Features

- Vue 3 with Composition API
- File input for image loading
- Apply Gaussian blur filter using GEGL operations
- Reset functionality to restore original image
- Reactive state management with loading indicators

## Usage

1. Install dependencies: `npm install`
2. Start the development server: `npm run dev`
3. Open the app in your browser (usually http://localhost:3000)
4. Click "Select Image" to load an image
5. Click "Apply Blur" to process the image with GEGL
6. Click "Reset" to restore the original image

## Requirements

- Node.js and npm
- A web browser with WebAssembly support
- The GEGL.wasm build must be available at `../../../build-wasm-prod/gegl.js`

## Code Structure

- `src/App.vue`: Main Vue component with GEGL integration
- `src/main.js`: Vue app entry point
- `index.html`: HTML template
- `public/gegl-worker-wrapper.js`: GEGL worker wrapper for browser usage
- `vite.config.js`: Vite configuration

## Key Concepts

- Uses Vue 3 Composition API with `ref` and lifecycle hooks
- Initializes GEGL worker in `onMounted`
- Handles file loading with canvas API
- Processes images asynchronously with GEGL operations
- Reactive UI updates based on processing state