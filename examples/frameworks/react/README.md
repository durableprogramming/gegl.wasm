# GEGL.wasm React Example

This example demonstrates how to integrate GEGL.wasm into a React application.

## Features

- React-based UI with hooks
- File input for image loading
- Apply Gaussian blur filter using GEGL operations
- Reset functionality to restore original image
- Loading states and error handling

## Usage

1. Install dependencies: `npm install`
2. Start the development server: `npm start`
3. Open the app in your browser
4. Click "Select Image" to load an image
5. Click "Apply Blur" to process the image with GEGL
6. Click "Reset" to restore the original image

## Requirements

- Node.js and npm
- A web browser with WebAssembly support
- The GEGL.wasm build must be available at `../../../build-wasm-prod/gegl.js`

## Code Structure

- `src/App.js`: Main React component with GEGL integration
- `src/App.css`: Styling for the application
- `public/index.html`: HTML template
- `public/gegl-worker-wrapper.js`: GEGL worker wrapper for browser usage

## Key Concepts

- Uses `useState` and `useRef` for state management
- Initializes GEGL worker in `useEffect`
- Handles file loading with canvas API
- Processes images asynchronously with GEGL operations