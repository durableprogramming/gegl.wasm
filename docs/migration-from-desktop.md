# Migrating from Desktop GEGL to GEGL.wasm

This guide explains the key differences between the desktop version of GEGL (Generic Graphics Library) and GEGL.wasm, the WebAssembly port, and provides guidance for porting applications.

## Overview

GEGL.wasm brings GEGL's powerful image processing capabilities to the web browser through WebAssembly compilation. While the core GEGL functionality remains the same, the web environment introduces several architectural differences that affect how applications are built and executed.

## Key Differences

### 1. Build System and Dependencies

#### Desktop GEGL
- Built with standard Meson build system
- Supports extensive optional dependencies (Cairo, Pango, GTK+, SDL, etc.)
- Can be built with GUI components, command-line tools, and documentation

#### GEGL.wasm
- Uses specialized `meson-wasm.build` configuration with Emscripten
- Most GUI-related dependencies are disabled (Cairo, Pango, GTK+, SDL, etc.)
- Focuses on core image processing operations only
- Optimized for size with `-Oz` and LTO (Link Time Optimization)

**Migration Note**: Review your application's dependencies. Many desktop GEGL operations that rely on GUI libraries (like text rendering with Pango or vector graphics with Cairo) are not available in GEGL.wasm.

### 2. API Architecture

#### Desktop GEGL (C API)
```c
#include <gegl.h>

int main(int argc, char **argv) {
    gegl_init(&argc, &argv);

    // Synchronous, blocking operations
    GeglNode *node = gegl_node_new();
    gegl_node_process(node);

    gegl_exit();
    return 0;
}
```

#### GEGL.wasm (JavaScript API)
```javascript
// Asynchronous, Promise-based API
import { Gegl, GeglWorker } from './gegl-wrapper.js';

// Initialize GEGL
await Gegl.init();

// Use Web Worker for processing
const worker = new GeglWorker('gegl.js');
await worker.init();

const result = await worker.process(imageData, operations);
```

**Migration Note**: Desktop synchronous operations become asynchronous in the web version. All image processing must be done through Web Workers to avoid blocking the main UI thread.

### 3. Memory and Resource Management

#### Desktop GEGL
- Direct memory allocation with `malloc()`/`free()`
- File I/O through standard C library functions
- GLib's GObject reference counting for resource management

#### GEGL.wasm
- Uses Emscripten's `emmalloc` allocator optimized for WebAssembly
- No direct file system access - works with browser APIs
- Memory constraints of web environment (typically 2GB limit)
- Automatic memory management through JavaScript garbage collection

**Migration Note**: Be mindful of memory usage. WebAssembly has stricter memory limits than desktop applications. Use `GeglBuffer` pooling and proper cleanup.

### 4. Initialization and Lifecycle

#### Desktop GEGL
```c
gegl_init(&argc, &argv);
// Application runs synchronously
gegl_exit();
```

#### GEGL.wasm
```javascript
// Initialize once
await Gegl.init();

// Create worker for processing
const worker = new GeglWorker();
await worker.init();

// Process images asynchronously
const result = await worker.process(imageData, operations);

// Cleanup when done
worker.cleanup();
```

**Migration Note**: Initialize GEGL once at application startup. Use Web Workers for image processing operations to maintain responsive UI.

### 5. Buffer and Image Handling

#### Desktop GEGL
```c
// Load from file
GeglBuffer *buffer = gegl_buffer_load("image.jpg");

// Direct pixel access
gegl_buffer_get_pixels(buffer, rect, format, data, rowstride);
```

#### GEGL.wasm
```javascript
// Convert from Canvas/ImageData
const buffer = CanvasUtils.imageDataToGeglBuffer(imageData);

// Asynchronous processing only
const result = await worker.process(imageData, operations);

// Convert back to Canvas
const outputImageData = CanvasUtils.geglBufferToImageData(resultBuffer);
```

**Migration Note**: Replace direct file loading with browser APIs. Use `CanvasUtils` for converting between browser image formats and GEGL buffers.

### 6. Node Graph Processing

#### Desktop GEGL
```c
// Create graph
GeglNode *graph = gegl_node_new();
GeglNode *blur = gegl_node_create_child(graph, "operation", "gegl:blur-gaussian");

// Synchronous processing
gegl_node_process(blur);
```

#### GEGL.wasm
```javascript
// Create graph
const graph = Gegl.createGraph();
const blur = graph.createNode('gegl:blur-gaussian');

// Asynchronous processing via worker
const operations = [{
    operation: 'gegl:blur-gaussian',
    properties: { std_dev_x: 5.0, std_dev_y: 5.0 }
}];

const result = await worker.process(imageData, operations);
```

**Migration Note**: Complex node graphs are simplified to operation arrays for worker processing. Some advanced graph features may not be available.

### 7. Error Handling

#### Desktop GEGL
```c
GError *error = NULL;
if (!gegl_buffer_save(buffer, "output.png", NULL, &error)) {
    g_printerr("Error: %s\n", error->message);
    g_error_free(error);
}
```

#### GEGL.wasm
```javascript
try {
    const result = await worker.process(imageData, operations);
    // Success
} catch (error) {
    if (error instanceof GeglWorkerError) {
        console.error('GEGL processing failed:', error.message);
    }
}
```

**Migration Note**: Replace GLib error handling with JavaScript try/catch blocks and custom error classes (`GeglError`, `GeglWorkerError`, `CanvasUtilsError`).

### 8. Available Operations

Many desktop GEGL operations are not available in GEGL.wasm due to missing dependencies:

**Disabled Operations:**
- Text rendering (`gegl:text`) - requires Pango
- Vector graphics (`gegl:svg-src`, `gegl:cairo`) - requires Cairo/RSVG
- GUI display (`gegl:display`) - requires GTK+
- Video processing - requires libavcodec
- Advanced file formats - requires various image libraries

**Available Operations:**
- Core image processing (blur, color adjustment, etc.)
- Basic file I/O for common formats (PNG, JPEG)
- Buffer operations and compositing

**Migration Note**: Test your operation pipeline against the WebAssembly build. Some operations may need to be replaced or implemented differently.

## Porting Strategy

### Step 1: Assess Dependencies
1. Identify which GEGL operations your application uses
2. Check if all required operations are available in GEGL.wasm
3. Plan alternatives for missing functionality

### Step 2: Restructure for Asynchronous Processing
1. Convert synchronous processing to async/await patterns
2. Implement Web Worker architecture for image processing
3. Update UI to handle asynchronous operations

### Step 3: Adapt Image I/O
1. Replace file system operations with browser APIs
2. Use `CanvasUtils` for image format conversion
3. Implement proper error handling for browser security restrictions

### Step 4: Memory Management
1. Monitor memory usage in browser dev tools
2. Implement buffer pooling for repeated operations
3. Clean up resources properly to prevent memory leaks

### Step 5: Testing and Optimization
1. Test with various image sizes and formats
2. Profile performance using browser dev tools
3. Optimize for WebAssembly constraints

## Example Migration

### Before (Desktop C)
```c
#include <gegl.h>

int main(int argc, char **argv) {
    gegl_init(&argc, &argv);

    GeglBuffer *input = gegl_buffer_load("input.jpg");
    GeglNode *blur = gegl_node_new_child(NULL, "operation", "gegl:blur-gaussian", NULL);
    gegl_node_set(blur, "std_dev_x", 5.0, "std_dev_y", 5.0, NULL);

    GeglBuffer *output = gegl_buffer_new_same_type(input, 0, 0, gegl_buffer_get_width(input), gegl_buffer_get_height(input));
    gegl_node_blit(blur, 1.0, gegl_buffer_get_extent(input), output, gegl_buffer_get_extent(output), GEGL_BLIT_DEFAULT);

    gegl_buffer_save(output, "output.jpg", NULL, NULL);

    g_object_unref(output);
    g_object_unref(blur);
    g_object_unref(input);
    gegl_exit();
    return 0;
}
```

### After (Web JavaScript)
```javascript
import { GeglWorker, CanvasUtils } from './gegl-wrapper.js';

async function processImage(imageFile) {
    // Initialize worker
    const worker = new GeglWorker('gegl.js');
    await worker.init();

    try {
        // Load image
        const img = new Image();
        await new Promise(resolve => {
            img.onload = resolve;
            img.src = URL.createObjectURL(imageFile);
        });

        // Convert to ImageData
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);

        // Process with GEGL
        const operations = [{
            operation: 'gegl:blur-gaussian',
            properties: {
                std_dev_x: 5.0,
                std_dev_y: 5.0
            }
        }];

        const result = await worker.process(imageData, operations);

        // Display result
        const outputCanvas = document.getElementById('output');
        const outputCtx = outputCanvas.getContext('2d');
        const resultImageData = new ImageData(
            new Uint8ClampedArray(result.data),
            result.width,
            result.height
        );
        outputCtx.putImageData(resultImageData, 0, 0);

    } finally {
        worker.cleanup();
    }
}
```

## Performance Considerations

1. **WebAssembly Startup**: Initial loading and compilation takes time
2. **Worker Communication**: Data transfer between main thread and worker has overhead
3. **Memory Limits**: WebAssembly is limited to browser memory constraints
4. **Single Threading**: Heavy processing should always use Web Workers

## Browser Compatibility

GEGL.wasm requires:
- WebAssembly support
- Web Workers
- TypedArray/ArrayBuffer
- Modern JavaScript (ES2017+)

Supported browsers: Chrome 57+, Firefox 52+, Safari 11+, Edge 16+

## Getting Help

- Check the [GEGL.wasm API Documentation](api.md)
- Review example applications in the `examples/` directory
- Test with the browser-based test runner in `tests/test-runner.html`
- Report issues on the GEGL project repository

## Conclusion

Migrating from desktop GEGL to GEGL.wasm involves adapting to the asynchronous, browser-based environment while maintaining the powerful image processing capabilities of GEGL. The key is understanding the architectural differences and designing your application around Web Workers and browser APIs from the start.