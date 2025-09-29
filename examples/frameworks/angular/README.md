# GEGL.wasm Angular Example

This example demonstrates how to integrate GEGL.wasm into an Angular application.

## Features

- Angular component-based architecture
- File input for image loading with template reference variables
- Apply Gaussian blur filter using GEGL operations
- Reset functionality to restore original image
- Reactive UI with property binding and event handling

## Usage

1. Install dependencies: `npm install`
2. Start the development server: `ng serve`
3. Open the app in your browser (usually http://localhost:4200)
4. Click "Select Image" to load an image
5. Click "Apply Blur" to process the image with GEGL
6. Click "Reset" to restore the original image

## Requirements

- Node.js and npm
- Angular CLI (`npm install -g @angular/cli`)
- A web browser with WebAssembly support
- The GEGL.wasm build must be available at `../../../build-wasm-prod/gegl.js`

## Code Structure

- `src/app/app.component.ts`: Main Angular component with GEGL integration
- `src/app/app.component.html`: Component template with Angular directives
- `src/app/app.component.css`: Component-specific styles
- `src/index.html`: HTML template with GEGL worker script
- `src/assets/gegl-worker-wrapper.js`: GEGL worker wrapper for browser usage

## Key Concepts

- Uses Angular's component lifecycle hooks (`OnInit`, `OnDestroy`)
- Template reference variables (`#fileInput`, `#canvas`) for DOM access
- Property binding (`[disabled]`) and event binding (`(click)`)
- TypeScript with proper typing for GEGL worker
- Asynchronous operations with async/await