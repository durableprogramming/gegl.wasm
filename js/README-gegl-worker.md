# GEGL Web Worker

The GEGL Web Worker enables off-main-thread image processing with progress reporting and cancellation support. This allows for smooth UI interactions during complex image processing operations.

## Features

- **Off-main-thread processing**: Image processing runs in a separate Web Worker thread
- **Progress reporting**: Real-time progress updates during processing
- **Cancellation support**: Ability to cancel long-running operations
- **Operation chaining**: Apply multiple GEGL operations in sequence
- **Promise-based API**: Easy-to-use asynchronous interface

## Files

- `gegl-worker.js` - The Web Worker implementation
- `gegl-worker-wrapper.js` - Main-thread wrapper class
- `test-gegl-worker.js` - Comprehensive tests and examples

## Usage

### Basic Setup

```javascript
// Create and initialize worker
const worker = new GeglWorker('path/to/gegl.js');
await worker.init();

// Create image data (from canvas, ImageData, etc.)
const imageData = canvasContext.getImageData(0, 0, width, height);

// Define operations
const operations = [
    {
        operation: 'gegl:blur-gaussian',
        properties: {
            std_dev_x: 5,
            std_dev_y: 5
        }
    },
    {
        operation: 'gegl:brightness-contrast',
        properties: {
            brightness: 0.1,
            contrast: 1.2
        }
    }
];

// Process image
const result = await worker.process(imageData, operations);

// Use result
const resultImageData = new ImageData(
    new Uint8ClampedArray(result.data),
    result.width,
    result.height
);

// Clean up when done
worker.cleanup();
```

### Progress Reporting

```javascript
// Set progress callback
worker.setProgressCallback((progress) => {
    console.log(`Processing: ${(progress * 100).toFixed(1)}%`);
    // Update UI progress bar
    progressBar.value = progress;
});

// Process with progress updates
const result = await worker.process(imageData, operations);
```

### Cancellation

```javascript
// Start processing
const processPromise = worker.process(imageData, operations);

// Cancel if needed (e.g., user clicks cancel button)
cancelButton.addEventListener('click', () => {
    worker.cancel();
});

// Handle cancellation
try {
    const result = await processPromise;
    // Process completed successfully
} catch (error) {
    if (error.code === 'CANCELLED') {
        console.log('Processing was cancelled');
    } else {
        console.error('Processing failed:', error);
    }
}
```

### Operation Examples

#### Blur and Sharpen
```javascript
const operations = [
    {
        operation: 'gegl:blur-gaussian',
        properties: { std_dev_x: 2, std_dev_y: 2 }
    },
    {
        operation: 'gegl:unsharp-mask',
        properties: { std_dev: 1, scale: 1.5 }
    }
];
```

#### Color Correction
```javascript
const operations = [
    {
        operation: 'gegl:brightness-contrast',
        properties: { brightness: 0.1, contrast: 1.2 }
    },
    {
        operation: 'gegl:saturation',
        properties: { scale: 1.1 }
    },
    {
        operation: 'gegl:color-balance',
        properties: {
            cyan_red: 0.05,
            magenta_green: -0.02,
            yellow_blue: 0.03
        }
    }
];
```

#### Artistic Effects
```javascript
const operations = [
    {
        operation: 'gegl:cartoon',
        properties: { mask_radius: 5 }
    },
    {
        operation: 'gegl:softglow',
        properties: { glow_radius: 10, brightness: 0.5, sharpness: 0.8 }
    }
];
```

## API Reference

### GeglWorker

#### Constructor
```javascript
new GeglWorker(wasmUrl?: string)
```

#### Methods

- `init(): Promise<void>` - Initialize the worker
- `process(imageData, operations, options?): Promise<GeglWorkerImageData>` - Process image
- `cancel(): void` - Cancel current processing
- `cleanup(): void` - Clean up worker resources
- `setProgressCallback(callback: (progress: number) => void): void` - Set progress callback

### Operation Format

```javascript
{
    operation: string,        // GEGL operation name (e.g., 'gegl:blur-gaussian')
    properties?: {           // Optional operation properties
        [key: string]: string | number | GeglColorInput
    }
}
```

## Error Handling

The worker throws `GeglWorkerError` instances with the following codes:

- `'CANCELLED'` - Operation was cancelled
- `null` - Other errors (check message for details)

## Performance Considerations

- Use transferable objects when possible for better performance
- Cancel long-running operations to free worker resources
- Clean up workers when no longer needed
- Consider image size - very large images may impact performance

## Browser Support

Requires browsers that support:

- Web Workers
- WebAssembly
- Transferable objects
- Modern Promise API

Supported in Chrome 57+, Firefox 52+, Safari 11+, Edge 16+.

## Testing

Load `test-gegl-worker.js` in a browser with the GEGL WebAssembly module loaded, then call:

```javascript
testGeglWorker();
```

This runs comprehensive tests including initialization, processing, progress reporting, cancellation, and error handling.