# GEGL.wasm Framework Integration Examples

This directory contains examples showing how to integrate GEGL.wasm into popular JavaScript frameworks and vanilla JavaScript.

## Examples

### Vanilla JavaScript (`vanilla-js/`)
A simple, self-contained HTML file demonstrating basic GEGL integration without any framework dependencies.

- **File**: `index.html`
- **Features**: File upload, blur filter, reset functionality
- **Run**: Open `index.html` in a web browser

### React (`react/`)
A React application using hooks for state management and GEGL integration.

- **Setup**: `npm install && npm start`
- **Features**: React hooks, component-based UI, file handling
- **Run**: `npm start` (usually http://localhost:3000)

### Vue (`vue/`)
A Vue 3 application using the Composition API for reactive GEGL processing.

- **Setup**: `npm install && npm run dev`
- **Features**: Vue 3 Composition API, reactive state, Vite build system
- **Run**: `npm run dev` (usually http://localhost:3000)

### Angular (`angular/`)
An Angular application demonstrating component lifecycle integration with GEGL.

- **Setup**: `npm install && ng serve`
- **Features**: Angular components, TypeScript, template-driven forms
- **Run**: `ng serve` (usually http://localhost:4200)

## Requirements

- A web browser with WebAssembly support
- Node.js and npm (for framework examples)
- The GEGL.wasm build available at `../../../build-wasm-prod/gegl.js`

## Common Features

All examples demonstrate:
- Loading images via file input
- Applying GEGL operations (Gaussian blur)
- Displaying processed results on canvas
- Reset functionality to restore original images
- Error handling and status updates

## GEGL Operations

The examples use the `gegl:blur-gaussian` operation with configurable standard deviation parameters:

```javascript
const operations = [{
  operation: 'gegl:blur-gaussian',
  properties: {
    std_dev_x: 5.0,
    std_dev_y: 5.0
  }
}];
```

## Architecture

Each example follows these patterns:
1. Initialize GEGL worker on app/component startup
2. Load image files and convert to ImageData
3. Process images using GEGL operations asynchronously
4. Display results on HTML5 canvas
5. Clean up resources on app/component destruction

## Extending the Examples

To add more GEGL operations, modify the `operations` array with additional operation objects. Refer to the GEGL documentation for available operations and their properties.