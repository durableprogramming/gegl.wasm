# GEGL.wasm JavaScript API Documentation

GEGL.wasm provides a comprehensive JavaScript API for client-side image processing using the Generic Graphics Library (GEGL) compiled to WebAssembly. This documentation covers all classes, methods, and usage patterns for the JavaScript bindings.

## Table of Contents

- [Setup and Initialization](#setup-and-initialization)
- [Core Classes](#core-classes)
  - [Gegl](#gegl)
  - [GeglBuffer](#geglbuffer)
  - [GeglNode](#geglnode)
  - [GeglGraph](#geglgraph)
- [Worker API](#worker-api)
  - [GeglWorker](#geglworker)
- [Browser Integration](#browser-integration)
  - [CanvasUtils](#canvasutils)
- [Feature Detection](#feature-detection)
- [Error Handling](#error-handling)
- [Type Definitions](#type-definitions)
- [Examples](#examples)

## Setup and Initialization

Before using any GEGL functionality, you must initialize the library:

```javascript
// Load the GEGL WebAssembly module
importScripts('gegl.js'); // In worker context
// or
<script src="gegl.js"></script> // In main thread

// Initialize GEGL
Gegl.init();
```

For worker-based processing, use the GeglWorker class which handles initialization automatically.

## Core Classes

### Gegl

The main GEGL management class providing static methods for initialization and resource management.

#### Static Methods

##### `Gegl.init()`
Initialize GEGL. Must be called before using any GEGL functionality.
- **Throws**: `GeglError` if initialization fails

##### `Gegl.exit()`
Clean up GEGL resources.

##### `Gegl.isInitialized()`
Check if GEGL is initialized.
- **Returns**: `boolean`

##### `Gegl.createGraph()`
Create a new processing graph.
- **Returns**: `GeglGraph` instance
- **Throws**: `GeglError` if GEGL not initialized

##### `Gegl.createBuffer(extent, format?)`
Create a new buffer.
- **Parameters**:
  - `extent`: `GeglRectangle` - Rectangle defining buffer dimensions {x, y, width, height}
  - `format`: `GeglPixelFormat` - Pixel format (default: 'RGBA u8')
- **Returns**: `GeglBuffer` instance
- **Throws**: `GeglError` if GEGL not initialized

##### `Gegl.loadBuffer(path)`
Load buffer from file.
- **Parameters**:
  - `path`: `string` - File path
- **Returns**: `GeglBuffer` instance
- **Throws**: `GeglError` if GEGL not initialized or file loading fails

### GeglBuffer

Represents raster image data and provides methods for pixel manipulation.

#### Constructor

##### `new GeglBuffer(extent, format?)`
Create a new buffer.
- **Parameters**:
  - `extent`: `GeglRectangle` - Rectangle defining buffer dimensions
  - `format`: `GeglPixelFormat` - Pixel format (default: 'RGBA u8')
- **Throws**: `GeglError` if buffer creation fails

#### Static Methods

##### `GeglBuffer.fromFile(path)`
Create buffer from file.
- **Parameters**:
  - `path`: `string` - File path
- **Returns**: `GeglBuffer` instance
- **Throws**: `GeglError` if file loading fails

#### Instance Methods

##### `setPixels(rect, format, data, rowstride?)`
Set pixel data in the buffer.
- **Parameters**:
  - `rect`: `GeglRectangle` - Rectangle to set pixels in
  - `format`: `GeglPixelFormat` - Pixel format of the data
  - `data`: `Uint8Array` - Pixel data
  - `rowstride`: `number` - Row stride in bytes (default: 0 for auto-calculation)
- **Throws**: `GeglError` if operation fails

##### `getPixels(rect, format, rowstride?)`
Get pixel data from the buffer.
- **Parameters**:
  - `rect`: `GeglRectangle` - Rectangle to get pixels from
  - `format`: `GeglPixelFormat` - Desired pixel format
  - `rowstride`: `number` - Row stride in bytes (default: 0 for auto-calculation)
- **Returns**: `Uint8Array` - Pixel data
- **Throws**: `GeglError` if operation fails

##### `getExtent()`
Get buffer extent (dimensions).
- **Returns**: `GeglRectangle` - Rectangle defining buffer bounds

##### `getFormat()`
Get buffer pixel format.
- **Returns**: `string` - Format name

##### `save(path, roi?)`
Save buffer to file.
- **Parameters**:
  - `path`: `string` - File path to save to
  - `roi`: `GeglRectangle` - Region of interest to save (optional, defaults to full extent)
- **Throws**: `GeglError` if operation fails

##### `flush()`
Flush buffer changes to storage.
- **Throws**: `GeglError` if operation fails

##### `getInternal()`
Get internal GeglBuffer reference (for advanced usage).
- **Returns**: Internal buffer object

### GeglNode

Represents an image processing operation in a graph.

#### Constructor

##### `new GeglNode(parent, operation)`
Create a new processing node.
- **Parameters**:
  - `parent`: `GeglNode | null` - Parent node (null for root nodes)
  - `operation`: `string` - Operation name (e.g., 'gegl:over', 'gegl:blur-gaussian')
- **Throws**: `GeglError` if node creation fails

#### Instance Methods

##### `setProperty(name, value)`
Set a string property on the node.
- **Parameters**:
  - `name`: `string` - Property name
  - `value`: `string` - String value
- **Throws**: `GeglError` if operation fails

##### `setNumberProperty(name, value)`
Set a numeric property on the node.
- **Parameters**:
  - `name`: `string` - Property name
  - `value`: `number` - Numeric value
- **Throws**: `GeglError` if operation fails

##### `setColorProperty(name, color)`
Set a color property on the node.
- **Parameters**:
  - `name`: `string` - Property name
  - `color`: `GeglColorInput` - Color value (string or RGBA object)
- **Throws**: `GeglError` if operation fails

##### `connectTo(sink, inputPad?, outputPad?)`
Connect this node to another node.
- **Parameters**:
  - `sink`: `GeglNode` - Target node to connect to
  - `inputPad`: `string` - Input pad name on sink (default: 'input')
  - `outputPad`: `string` - Output pad name on source (default: 'output')
- **Throws**: `GeglError` if connection fails

##### `link(sink)`
Link this node to another node (automatic connection).
- **Parameters**:
  - `sink`: `GeglNode` - Target node to link to
- **Throws**: `GeglError` if linking fails

##### `process()`
Process this node.
- **Throws**: `GeglError` if processing fails

##### `getBoundingBox()`
Get bounding box of this node's output.
- **Returns**: `GeglRectangle` - Rectangle defining the bounding box
- **Throws**: `GeglError` if operation fails

##### `blitToBuffer(buffer, roi, level?)`
Blit node output to a buffer.
- **Parameters**:
  - `buffer`: `GeglBuffer` - Target buffer
  - `roi`: `GeglRectangle` - Region of interest
  - `level`: `number` - Mipmap level (default: 0)
- **Throws**: `GeglError` if operation fails

##### `getOperation()`
Get operation name.
- **Returns**: `string` - Operation name

##### `getInternal()`
Get internal GeglNode reference (for advanced usage).
- **Returns**: Internal node object

### GeglGraph

Manages collections of nodes for complex image processing pipelines.

#### Constructor

##### `new GeglGraph()`
Create a new graph.
- **Throws**: `GeglError` if graph creation fails

#### Instance Methods

##### `createNode(operation)`
Create a new node in this graph.
- **Parameters**:
  - `operation`: `string` - Operation name for the node
- **Returns**: `GeglNode` - New node instance

##### `getNodes()`
Get all nodes in the graph.
- **Returns**: `GeglNode[]` - Array of nodes in the graph

##### `process(outputNode?)`
Process the entire graph.
- **Parameters**:
  - `outputNode`: `GeglNode` - Specific node to process (optional, processes all if not specified)
- **Throws**: `GeglError` if processing fails

##### `getRoot()`
Get root node of the graph.
- **Returns**: Internal root node object

##### `destroy()`
Clean up the graph and destroy all nodes.
- **Throws**: `GeglError` if cleanup fails

## Worker API

For off-main-thread processing to avoid blocking the UI.

### GeglWorker

Provides Promise-based API for background image processing.

#### Constructor

##### `new GeglWorker(wasmUrl?)`
Create a new GEGL worker.
- **Parameters**:
  - `wasmUrl`: `string` - URL to the WebAssembly module (default: 'gegl.js')

#### Instance Methods

##### `init()`
Initialize the worker.
- **Returns**: `Promise<void>` - Promise that resolves when worker is ready
- **Throws**: `GeglWorkerError` if initialization fails

##### `process(imageData, operations, options?)`
Process an image with GEGL operations.
- **Parameters**:
  - `imageData`: `ImageData | GeglWorkerImageData` - Image data to process
  - `operations`: `GeglWorkerOperation[]` - Array of operations to apply
  - `options`: `GeglWorkerOptions` - Processing options
- **Returns**: `Promise<GeglWorkerImageData>` - Promise resolving to processed image data
- **Throws**: `GeglWorkerError` if processing fails

##### `cancel()`
Cancel current processing operation.

##### `cleanup()`
Clean up worker resources.

##### `setProgressCallback(callback)`
Set progress callback function.
- **Parameters**:
  - `callback`: `(progress: number) => void` - Function called with progress (0-1)

## Browser Integration

### CanvasUtils

Utilities for converting between Canvas API and GEGL buffers.

#### Functions

##### `imageDataToGeglBuffer(imageData, buffer?)`
Convert Canvas ImageData to GEGL buffer.
- **Parameters**:
  - `imageData`: `ImageData` - Canvas ImageData object
  - `buffer`: `GeglBuffer` - Optional existing buffer to reuse
- **Returns**: `GeglBuffer` - GEGL buffer containing the image data
- **Throws**: `CanvasUtilsError` if conversion fails

##### `geglBufferToImageData(buffer, rect?)`
Convert GEGL buffer to Canvas ImageData.
- **Parameters**:
  - `buffer`: `GeglBuffer` - GEGL buffer to convert
  - `rect`: `GeglRectangle` - Optional rectangle to extract
- **Returns**: `ImageData` - Canvas ImageData object
- **Throws**: `CanvasUtilsError` if conversion fails

##### `canvasToGeglBuffer(canvas, buffer?)`
Convert HTML Canvas element to GEGL buffer.
- **Parameters**:
  - `canvas`: `HTMLCanvasElement` - Canvas element to convert
  - `buffer`: `GeglBuffer` - Optional existing buffer to reuse
- **Returns**: `GeglBuffer` - GEGL buffer containing the canvas data
- **Throws**: `CanvasUtilsError` if conversion fails

##### `geglBufferToCanvas(buffer, canvas, rect?)`
Render GEGL buffer to HTML Canvas element.
- **Parameters**:
  - `buffer`: `GeglBuffer` - GEGL buffer to render
  - `canvas`: `HTMLCanvasElement` - Target canvas element
  - `rect`: `GeglRectangle` - Optional rectangle to render
- **Throws**: `CanvasUtilsError` if rendering fails

##### `loadImageToGeglBuffer(url)`
Create GEGL buffer from image URL (async).
- **Parameters**:
  - `url`: `string` - Image URL to load
- **Returns**: `Promise<GeglBuffer>` - Promise resolving to GEGL buffer
- **Throws**: `CanvasUtilsError` if loading fails

##### `copyBufferPixels(srcBuffer, dstBuffer, srcRect?, dstRect?, format?)`
Copy pixels between GEGL buffers with format conversion.
- **Parameters**:
  - `srcBuffer`: `GeglBuffer` - Source buffer
  - `dstBuffer`: `GeglBuffer` - Destination buffer
  - `srcRect`: `GeglRectangle` - Source rectangle
  - `dstRect`: `GeglRectangle` - Destination rectangle
  - `format`: `string` - Pixel format for transfer
- **Throws**: `CanvasUtilsError` if copy fails

##### `copyGeglBuffer(buffer, format?)`
Create a copy of a GEGL buffer.
- **Parameters**:
   - `buffer`: `GeglBuffer` - Buffer to copy
   - `format`: `string` - Optional format for the copy
- **Returns**: `GeglBuffer` - New buffer with copied data
- **Throws**: `CanvasUtilsError` if copy fails

## Feature Detection

For ensuring browser compatibility before using GEGL WebAssembly.

### FeatureSupport

Class containing results of feature detection.

#### Properties
- `webAssembly`: `boolean` - WebAssembly support
- `webAssemblySIMD`: `boolean` - WebAssembly SIMD support
- `webWorkers`: `boolean` - Web Workers support
- `sharedArrayBuffer`: `boolean` - SharedArrayBuffer support
- `atomics`: `boolean` - Atomics API support
- `canvas2d`: `boolean` - Canvas 2D API support
- `typedArrays`: `boolean` - Typed Arrays support
- `webGL`: `boolean` - WebGL support
- `bigInt`: `boolean` - BigInt support
- `asyncAwait`: `boolean` - Async/await support
- `promises`: `boolean` - Promises support
- `fallbacks`: `object` - Fallback strategies for missing features

#### Instance Methods

##### `isFullySupported()`
Check if all required features are supported.
- **Returns**: `boolean`

##### `hasBasicSupport()`
Check if basic WebAssembly support is available.
- **Returns**: `boolean`

##### `getMissingFeatures()`
Get list of missing features.
- **Returns**: `string[]` - Array of missing feature names

##### `getFallbackStrategy()`
Get recommended fallback strategy.
- **Returns**: `string` - Fallback strategy description

### GeglFeatureDetection

Namespace for feature detection utilities.

#### Functions

##### `detectFeatures()`
Run comprehensive feature detection.
- **Returns**: `Promise<FeatureSupport>` - Promise resolving to feature support results

##### `isGeglCompatible(options?)`
Check if the current environment can run GEGL WebAssembly.
- **Parameters**:
   - `options`: `object` - Detection options
     - `requireSIMD`: `boolean` - Require SIMD support (default: false)
     - `requireWebWorkers`: `boolean` - Require Web Workers (default: true)
     - `requireSharedArrayBuffer`: `boolean` - Require SharedArrayBuffer (default: false)
- **Returns**: `Promise<boolean>` - Promise resolving to compatibility boolean

##### `getCompatibilityError(support)`
Get user-friendly error message for missing features.
- **Parameters**:
   - `support`: `FeatureSupport` - Feature support results
- **Returns**: `string | null` - Error message or null if compatible

## Error Handling

### GeglError

Standard error class for GEGL operations.

#### Properties
- `name`: `'GeglError'`
- `message`: `string` - Error description
- `code`: `number | null` - Optional error code

### GeglWorkerError

Error class for worker operations.

#### Properties
- `name`: `'GeglWorkerError'`
- `message`: `string` - Error description
- `code`: `string | null` - Optional error code

### CanvasUtilsError

Error class for canvas utilities.

#### Properties
- `name`: `'CanvasUtilsError'`
- `message`: `string` - Error description

### FeatureDetectionError

Error class for feature detection operations.

#### Properties
- `name`: `'FeatureDetectionError'`
- `message`: `string` - Error description
- `feature`: `string | undefined` - Name of the feature that failed detection

## Type Definitions

### GeglRectangle
```typescript
interface GeglRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

### GeglColor
```typescript
interface GeglColor {
  r: number; // Red component (0.0 to 1.0)
  g: number; // Green component (0.0 to 1.0)
  b: number; // Blue component (0.0 to 1.0)
  a: number; // Alpha component (0.0 to 1.0)
}
```

### GeglColorInput
```typescript
type GeglColorInput = string | GeglColor;
```

### GeglPixelFormat
```typescript
type GeglPixelFormat =
  | 'RGBA u8'
  | 'RGB u8'
  | 'RGBA float'
  | 'RGB float'
  | 'R u8'
  | 'R float'
  | 'YA u8'
  | 'YA float'
  | string; // Allow custom formats
```

### GeglAbyssPolicy
```typescript
enum GeglAbyssPolicy {
  NONE = 0,
  CLAMP = 1,
  LOOP = 2,
  BLACK = 3,
  WHITE = 4
}
```

### GeglWorkerOperation
```typescript
interface GeglWorkerOperation {
  operation: string; // Operation name (e.g., 'gegl:blur-gaussian')
  properties?: Record<string, string | number | GeglColorInput>;
}
```

### GeglWorkerImageData
```typescript
interface GeglWorkerImageData {
  data: ArrayBuffer; // Pixel data as ArrayBuffer
  width: number;     // Image width
  height: number;    // Image height
}
```

### GeglWorkerOptions
```typescript
interface GeglWorkerOptions {
  format?: GeglPixelFormat; // Pixel format (defaults to 'RGBA u8')
}
```

## Examples

### Basic Buffer Operations

```javascript
// Initialize GEGL
Gegl.init();

// Create a buffer
const buffer = Gegl.createBuffer({x: 0, y: 0, width: 512, height: 512}, 'RGBA u8');

// Set pixel data
const pixels = new Uint8Array(512 * 512 * 4); // RGBA data
buffer.setPixels({x: 0, y: 0, width: 512, height: 512}, 'RGBA u8', pixels);

// Get pixel data
const retrievedPixels = buffer.getPixels({x: 0, y: 0, width: 512, height: 512}, 'RGBA u8');

// Save buffer
buffer.save('output.png');
```

### Node-Based Processing

```javascript
// Create a graph
const graph = Gegl.createGraph();

// Create nodes
const loadNode = graph.createNode('gegl:load');
loadNode.setProperty('path', 'input.jpg');

const blurNode = graph.createNode('gegl:blur-gaussian');
blurNode.setNumberProperty('std_dev_x', 5.0);
blurNode.setNumberProperty('std_dev_y', 5.0);

// Connect nodes
loadNode.connectTo(blurNode);

// Process
blurNode.process();

// Save result
const outputBuffer = Gegl.createBuffer({x: 0, y: 0, width: 512, height: 512}, 'RGBA u8');
blurNode.blitToBuffer(outputBuffer, {x: 0, y: 0, width: 512, height: 512});
outputBuffer.save('blurred.jpg');
```

### Worker-Based Processing

```javascript
// Create worker
const worker = new GeglWorker('gegl.js');

// Initialize
await worker.init();

// Set progress callback
worker.setProgressCallback((progress) => {
  console.log(`Processing: ${Math.round(progress * 100)}%`);
});

// Define operations
const operations = [
  {
    operation: 'gegl:blur-gaussian',
    properties: {
      std_dev_x: 5.0,
      std_dev_y: 5.0
    }
  }
];

// Process image
const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d');
const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

try {
  const result = await worker.process(imageData, operations);

  // Display result
  const resultImageData = new ImageData(
    new Uint8ClampedArray(result.data),
    result.width,
    result.height
  );
  ctx.putImageData(resultImageData, 0, 0);
} catch (error) {
  console.error('Processing failed:', error);
}

// Cleanup
worker.cleanup();
```

### Canvas Integration

```javascript
// Load image from URL to GEGL buffer
const buffer = await CanvasUtils.loadImageToGeglBuffer('image.jpg');

// Apply processing (using worker for async processing)
const worker = new GeglWorker();
await worker.init();

const operations = [
  { operation: 'gegl:brightness-contrast', properties: { brightness: 0.2 } }
];

const imageData = CanvasUtils.geglBufferToImageData(buffer);
const result = await worker.process(imageData, operations);

// Render back to canvas
const canvas = document.getElementById('output');
const resultImageData = new ImageData(
  new Uint8ClampedArray(result.data),
  result.width,
  result.height
);
const ctx = canvas.getContext('2d');
ctx.putImageData(resultImageData, 0, 0);

worker.cleanup();
```

### Feature Detection

```javascript
// Check browser compatibility before initializing GEGL
import { GeglFeatureDetection } from 'gegl-wasm';

try {
  // Run comprehensive feature detection
  const support = await GeglFeatureDetection.detectFeatures();

  if (support.isFullySupported()) {
    console.log('All features supported - initializing GEGL...');
    Gegl.init();
  } else {
    console.log('Some features missing:', support.getMissingFeatures());
    console.log('Fallback strategy:', support.getFallbackStrategy());
  }

  // Quick compatibility check
  const isCompatible = await GeglFeatureDetection.isGeglCompatible();
  if (!isCompatible) {
    const error = GeglFeatureDetection.getCompatibilityError(support);
    console.error('Browser not compatible:', error);
  }
} catch (error) {
  console.error('Feature detection failed:', error);
}
```

### Complex Graph Processing

```javascript
// Create a complex processing graph
const graph = Gegl.createGraph();

// Load image
const load = graph.createNode('gegl:load');
load.setProperty('path', 'input.jpg');

// Apply multiple effects
const brightness = graph.createNode('gegl:brightness-contrast');
brightness.setNumberProperty('brightness', 0.1);
brightness.setNumberProperty('contrast', 1.2);

const blur = graph.createNode('gegl:blur-gaussian');
blur.setNumberProperty('std_dev_x', 2.0);
blur.setNumberProperty('std_dev_y', 2.0);

const saturation = graph.createNode('gegl:hue-saturation');
saturation.setNumberProperty('saturation', 1.5);

// Connect the pipeline
load.connectTo(brightness);
brightness.connectTo(blur);
blur.connectTo(saturation);

// Process the graph
saturation.process();

// Save result
const extent = saturation.getBoundingBox();
const outputBuffer = Gegl.createBuffer(extent, 'RGBA u8');
saturation.blitToBuffer(outputBuffer, extent);
outputBuffer.save('processed.jpg');

// Cleanup
graph.destroy();
```