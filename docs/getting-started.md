# Getting Started with GEGL.wasm

GEGL.wasm brings the power of the Generic Graphics Library (GEGL) to web browsers and Node.js environments through WebAssembly. This guide will walk you through installing GEGL.wasm and creating your first image processing application.

## What is GEGL.wasm?

GEGL.wasm is a WebAssembly port of GEGL, a powerful image processing library used by GIMP. It enables client-side image manipulation with professional-grade operations like blurring, color correction, compositing, and more—all running directly in the browser without server-side processing.

## Prerequisites

- Modern web browser with WebAssembly support (Chrome 57+, Firefox 52+, Safari 11+, Edge 16+)
- Node.js 14.0.0+ (for server-side usage)
- Basic knowledge of HTML, CSS, and JavaScript

## Step 1: Installation

### Option A: NPM Installation (Recommended)

For projects using a build system like Webpack, Rollup, or Vite:

```bash
npm install gegl-wasm
```

Then import in your JavaScript:

```javascript
import { GeglWorker, CanvasUtils } from 'gegl-wasm';
```

### Option B: CDN Installation

For quick prototyping or simple HTML pages:

```html
<!DOCTYPE html>
<html>
<head>
    <title>My GEGL.wasm App</title>
    <!-- Load GEGL.wasm from CDN -->
    <script src="https://cdn.jsdelivr.net/npm/gegl-wasm@0.4.63/dist/gegl-wasm.umd.min.js"></script>
</head>
<body>
    <!-- Your app content here -->
</body>
</html>
```

## Step 2: Browser Compatibility Check

Before initializing GEGL.wasm, check if the user's browser supports the required features:

```javascript
// Check for WebAssembly support
if (typeof WebAssembly === 'undefined') {
    alert('WebAssembly is not supported in this browser');
    return;
}

// Optional: Check for SharedArrayBuffer (improves performance)
if (typeof SharedArrayBuffer === 'undefined') {
    console.warn('SharedArrayBuffer not available - performance may be reduced');
}
```

## Step 3: Basic HTML Structure

Create an HTML file with a canvas for displaying images and controls for processing:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GEGL.wasm Image Processor</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .container {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        canvas {
            max-width: 100%;
            border: 1px solid #ddd;
            border-radius: 4px;
            margin: 10px 0;
        }
        .controls {
            margin: 20px 0;
            text-align: center;
        }
        button {
            background: #4CAF50;
            color: white;
            border: none;
            padding: 10px 20px;
            margin: 0 5px;
            border-radius: 4px;
            cursor: pointer;
        }
        button:hover {
            background: #45a049;
        }
        button:disabled {
            background: #cccccc;
            cursor: not-allowed;
        }
        .file-input {
            border: 2px dashed #ccc;
            padding: 20px;
            text-align: center;
            border-radius: 4px;
            margin: 20px 0;
            cursor: pointer;
        }
        .file-input:hover {
            border-color: #999;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>GEGL.wasm Image Processor</h1>

        <div class="file-input" id="fileDrop">
            <div>Click to select an image or drag and drop here</div>
            <input type="file" id="fileInput" accept="image/*" style="display: none;">
        </div>

        <canvas id="imageCanvas"></canvas>

        <div class="controls">
            <button id="blurBtn" disabled>Apply Blur</button>
            <button id="brightnessBtn" disabled>Adjust Brightness</button>
            <button id="resetBtn" disabled>Reset</button>
        </div>

        <div id="status">Ready to load an image</div>
    </div>

    <!-- Load GEGL.wasm -->
    <script src="https://cdn.jsdelivr.net/npm/gegl-wasm@0.4.63/dist/gegl-wasm.umd.min.js"></script>

    <script src="app.js"></script>
</body>
</html>
```

## Step 4: JavaScript Application Logic

Create `app.js` with the main application logic:

```javascript
class ImageProcessor {
    constructor() {
        this.canvas = document.getElementById('imageCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.fileDrop = document.getElementById('fileDrop');
        this.fileInput = document.getElementById('fileInput');
        this.blurBtn = document.getElementById('blurBtn');
        this.brightnessBtn = document.getElementById('brightnessBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.status = document.getElementById('status');

        this.originalImageData = null;
        this.worker = null;

        this.init();
    }

    async init() {
        try {
            this.updateStatus('Initializing GEGL.wasm...');

            // Initialize GEGL worker
            this.worker = new GeglWasm.GeglWorker();
            await this.worker.init();

            this.updateStatus('GEGL.wasm ready!');
            this.setupEventListeners();

        } catch (error) {
            console.error('Failed to initialize GEGL:', error);
            this.updateStatus('Failed to initialize GEGL.wasm');
        }
    }

    setupEventListeners() {
        // File input handling
        this.fileDrop.addEventListener('click', () => {
            this.fileInput.click();
        });

        this.fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.loadImage(file);
        });

        // Drag and drop
        this.fileDrop.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.fileDrop.style.borderColor = '#4CAF50';
        });

        this.fileDrop.addEventListener('dragleave', () => {
            this.fileDrop.style.borderColor = '#ccc';
        });

        this.fileDrop.addEventListener('drop', (e) => {
            e.preventDefault();
            this.fileDrop.style.borderColor = '#ccc';
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                this.loadImage(file);
            }
        });

        // Button handlers
        this.blurBtn.addEventListener('click', () => this.applyBlur());
        this.brightnessBtn.addEventListener('click', () => this.adjustBrightness());
        this.resetBtn.addEventListener('click', () => this.resetImage());
    }

    async loadImage(file) {
        try {
            this.updateStatus('Loading image...');

            const img = new Image();
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = URL.createObjectURL(file);
            });

            // Set canvas size and draw image
            this.canvas.width = img.width;
            this.canvas.height = img.height;
            this.ctx.drawImage(img, 0, 0);

            // Store original image data
            this.originalImageData = this.ctx.getImageData(0, 0, img.width, img.height);

            // Enable buttons
            this.blurBtn.disabled = false;
            this.brightnessBtn.disabled = false;
            this.resetBtn.disabled = false;

            this.updateStatus('Image loaded successfully!');

            // Clean up
            URL.revokeObjectURL(img.src);

        } catch (error) {
            console.error('Failed to load image:', error);
            this.updateStatus('Failed to load image');
        }
    }

    async applyBlur() {
        if (!this.originalImageData || !this.worker) return;

        try {
            this.updateStatus('Applying blur effect...');
            this.setButtonsDisabled(true);

            // Define blur operation
            const operations = [{
                operation: 'gegl:blur-gaussian',
                properties: {
                    std_dev_x: 5.0,
                    std_dev_y: 5.0
                }
            }];

            // Process image
            const result = await this.worker.process(this.originalImageData, operations);

            // Display result
            const resultImageData = new ImageData(
                new Uint8ClampedArray(result.data),
                result.width,
                result.height
            );
            this.ctx.putImageData(resultImageData, 0, 0);

            this.updateStatus('Blur effect applied!');

        } catch (error) {
            console.error('Blur processing failed:', error);
            this.updateStatus('Failed to apply blur effect');
        } finally {
            this.setButtonsDisabled(false);
        }
    }

    async adjustBrightness() {
        if (!this.originalImageData || !this.worker) return;

        try {
            this.updateStatus('Adjusting brightness...');
            this.setButtonsDisabled(true);

            // Define brightness/contrast operation
            const operations = [{
                operation: 'gegl:brightness-contrast',
                properties: {
                    brightness: 0.2,
                    contrast: 1.1
                }
            }];

            // Process image
            const result = await this.worker.process(this.originalImageData, operations);

            // Display result
            const resultImageData = new ImageData(
                new Uint8ClampedArray(result.data),
                result.width,
                result.height
            );
            this.ctx.putImageData(resultImageData, 0, 0);

            this.updateStatus('Brightness adjusted!');

        } catch (error) {
            console.error('Brightness processing failed:', error);
            this.updateStatus('Failed to adjust brightness');
        } finally {
            this.setButtonsDisabled(false);
        }
    }

    resetImage() {
        if (this.originalImageData) {
            this.ctx.putImageData(this.originalImageData, 0, 0);
            this.updateStatus('Image reset to original');
        }
    }

    setButtonsDisabled(disabled) {
        this.blurBtn.disabled = disabled;
        this.brightnessBtn.disabled = disabled;
        this.resetBtn.disabled = disabled;
    }

    updateStatus(message) {
        this.status.textContent = message;
    }

    cleanup() {
        if (this.worker) {
            this.worker.cleanup();
        }
    }
}

// Initialize app when page loads
let processor;
window.addEventListener('load', () => {
    processor = new ImageProcessor();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (processor) {
        processor.cleanup();
    }
});
```

## Step 5: Testing Your Application

1. Open the HTML file in a modern web browser
2. Click the file input area or drag and drop an image file
3. Click "Apply Blur" to blur the image
4. Click "Adjust Brightness" to modify brightness and contrast
5. Click "Reset" to return to the original image

## Step 6: Understanding the Code

### Worker-Based Processing

GEGL.wasm uses Web Workers to perform image processing off the main thread, preventing UI blocking:

```javascript
// Create and initialize worker
this.worker = new GeglWasm.GeglWorker();
await this.worker.init();

// Process with operations
const result = await this.worker.process(imageData, operations);
```

### Operations

Operations are defined as objects with an operation name and properties:

```javascript
const operations = [{
    operation: 'gegl:blur-gaussian',  // Operation name
    properties: {
        std_dev_x: 5.0,               // Operation parameters
        std_dev_y: 5.0
    }
}];
```

### Canvas Integration

GEGL.wasm works seamlessly with HTML5 Canvas:

```javascript
// Get image data from canvas
const imageData = ctx.getImageData(0, 0, width, height);

// Process with GEGL
const result = await worker.process(imageData, operations);

// Display result back to canvas
const resultImageData = new ImageData(
    new Uint8ClampedArray(result.data),
    result.width,
    result.height
);
ctx.putImageData(resultImageData, 0, 0);
```

## Step 7: Node.js Usage

GEGL.wasm also works in Node.js environments:

```javascript
const { GeglWorker } = require('gegl-wasm');
const fs = require('fs');

async function processImage() {
    // Initialize worker
    const worker = new GeglWorker();
    await worker.init();

    // Load image data (you'd need to implement image loading)
    const imageData = loadImageDataFromFile('input.jpg');

    // Apply operations
    const operations = [{
        operation: 'gegl:brightness-contrast',
        properties: { brightness: 0.1, contrast: 1.2 }
    }];

    const result = await worker.process(imageData, operations);

    // Save result
    saveImageDataToFile('output.jpg', result);

    // Cleanup
    worker.cleanup();
}

processImage();
```

## Step 8: Advanced Operations

Try more complex operations by modifying the operations array:

```javascript
const operations = [
    // Multiple blur passes
    {
        operation: 'gegl:blur-gaussian',
        properties: { std_dev_x: 3.0, std_dev_y: 3.0 }
    },
    // Color adjustments
    {
        operation: 'gegl:brightness-contrast',
        properties: { brightness: 0.1, contrast: 1.3 }
    },
    // Hue/saturation
    {
        operation: 'gegl:hue-saturation',
        properties: { saturation: 1.5 }
    }
];
```

## Step 9: Error Handling

Always wrap GEGL operations in try-catch blocks:

```javascript
try {
    const result = await worker.process(imageData, operations);
    // Handle success
} catch (error) {
    console.error('Processing failed:', error);
    // Handle error (show user message, fallback, etc.)
}
```

## Step 10: Performance Optimization

- Use Web Workers (as shown) to avoid blocking the UI
- Reuse worker instances when possible
- Process images in smaller chunks for very large images
- Consider using `SharedArrayBuffer` when available for better performance

## Next Steps

- Explore the [API Documentation](api.md) for detailed class references
- Check out the [examples directory](../examples/) for more complex applications
- Learn about [available operations](operation-api.adoc) for different effects
- Read the [performance guide](performance.md) for optimization tips
- See the [migration guide](migration-from-desktop.md) if you're familiar with desktop GEGL

## Troubleshooting

### Common Issues

1. **"WebAssembly not supported"**
   - Update to a modern browser (Chrome 57+, Firefox 52+, etc.)

2. **"Failed to initialize GEGL"**
   - Check browser console for detailed error messages
   - Ensure the WebAssembly files are loading correctly

3. **Processing fails silently**
   - Check that operations are properly defined
   - Verify image data format (should be RGBA)

4. **Poor performance**
   - Use Web Workers for processing
   - Consider breaking large images into tiles
   - Check if SharedArrayBuffer is available

### Getting Help

- Check the [GitHub issues](https://github.com/durableprogramming/gegl.wasm/issues) for known problems
- Join the discussion in GitHub discussions
- Review the examples for working code patterns

Congratulations! You've created your first GEGL.wasm image processing application. The library offers hundreds of operations for professional-grade image manipulation—all running client-side in the browser.</content>
</xai:function_call/>
</xai:function_call name="run">
<parameter name="command">cd /mnt/data/projects/durable/durable-exterior-oss/repos/gegl.wasm && npm run build:dist