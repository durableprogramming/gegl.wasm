# GEGL Image Editor Example

A multi-layer image editor built with React and GEGL.wasm, demonstrating real-time image processing capabilities.

## Features

- **Multi-layer editing**: Create and manage multiple image layers
- **Real-time previews**: See changes instantly as you edit with GEGL processing
- **Real brush drawing**: Draw directly on layers with customizable brushes that modify pixel data
- **Eraser tool**: Erase parts of layers with adjustable brush settings
- **GEGL-based compositing**: Professional multi-layer compositing using GEGL operations
- **Filter operations**: Apply blur, brightness, contrast, and saturation filters
- **Undo/Redo**: Full history support for all operations
- **Export functionality**: Save your edited images as PNG files
- **Layer management**: Control layer visibility, opacity, and reordering
- **Drag & drop**: Load images by dragging and dropping files

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- GEGL.wasm build (see main project README)

### Installation

1. Navigate to the image editor directory:
    ```bash
    cd examples/image-editor
    ```

2. Install dependencies:
    ```bash
    npm install
    ```

3. Make sure GEGL.wasm is built (optional - app works with fallback canvas compositing):
    ```bash
    # From the project root
    ./build-wasm.sh prod
    ./build/create-distributions.sh prod
    ```

### Running the Application

Start the development server:
```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Loading Images

- Click the folder icon (📁) to open a file dialog
- Drag and drop image files onto the toolbar area
- Supported formats: PNG, JPEG, GIF, WebP, etc.

### Working with Layers

- **Create new layer**: Click the plus icon (➕)
- **Select layer**: Click on a layer in the layers panel
- **Toggle visibility**: Click the eye icon next to a layer
- **Adjust opacity**: Use the slider next to each layer
- **Reorder layers**: Drag layers up or down in the layers panel
- **Delete layer**: Click the × button next to a layer

### Drawing Tools

- **Brush**: Select the brush tool and draw on the canvas
- **Eraser**: Select the eraser tool to remove parts of layers
- **Brush settings**: Adjust size, hardness, opacity, and color in the toolbar (applies to both brush and eraser)

### Applying Filters

Click the filter buttons in the toolbar to apply effects to the selected layer:
- **Blur** (🌫): Applies Gaussian blur
- **Brightness** (☀): Increases brightness
- **Contrast** (🌓): Increases contrast
- **Saturation** (🌈): Increases color saturation

### History and Export

- **Undo** (↶): Undo the last operation
- **Redo** (↷): Redo the previously undone operation
- **Export** (💾): Save the current canvas as a PNG image file

## Architecture

### Components

- **App**: Main application component managing state
- **Canvas**: Interactive canvas for drawing and displaying images
- **LayerPanel**: Layer management interface
- **ToolPanel**: Toolbar with tools and settings

### Utilities

- **Layer**: Class representing individual image layers
- **compositing**: Functions for creating GEGL operations and compositing layers

### GEGL Integration

The editor uses GEGL.wasm through a Web Worker for non-blocking image processing:

- `gegl-worker.js`: Web Worker for GEGL operations
- `gegl-worker-wrapper.js`: Promise-based API for the worker

## Development

### Running Tests

```bash
npm test
```

### Building for Production

```bash
npm run build
```

## Features

- **Real brush drawing**: Brush strokes actually modify layer pixel data with proper blending
- **GEGL-based compositing**: Multi-layer compositing using GEGL operations for professional results
- **Real-time previews**: See changes instantly as you edit with proper layer processing

## Limitations

- Limited filter options
- No advanced blend modes beyond basic compositing
- No layer masks or adjustment layers

## Future Enhancements

- More filter operations
- Advanced blend modes
- Layer masks and adjustment layers
- Shape tools and selections
- Text tool
- Advanced layer effects

## Contributing

This is an example application. For contributions to the main GEGL.wasm project, see the main project README.