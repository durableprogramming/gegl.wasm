# GEGL.wasm Performance Guide

This document provides best practices for optimizing performance, memory management, and browser-specific considerations when using GEGL.wasm for client-side image processing.

## Table of Contents

- [Memory Management](#memory-management)
  - [Buffer Lifecycle](#buffer-lifecycle)
  - [Memory Pool Usage](#memory-pool-usage)
  - [Avoiding Memory Leaks](#avoiding-memory-leaks)
- [Performance Optimizations](#performance-optimizations)
  - [Minimizing JS-WASM Boundary Crossings](#minimizing-js-wasm-boundary-crossings)
  - [Worker Thread Usage](#worker-thread-usage)
  - [Operation Batching](#operation-batching)
  - [SIMD Acceleration](#simd-acceleration)
- [Browser-Specific Optimizations](#browser-specific-optimizations)
  - [WebAssembly Feature Detection](#webassembly-feature-detection)
  - [Memory Limits and Garbage Collection](#memory-limits-and-garbage-collection)
  - [Canvas Rendering Optimizations](#canvas-rendering-optimizations)
- [Profiling and Debugging](#profiling-and-debugging)
  - [Performance Monitoring](#performance-monitoring)
  - [Memory Profiling](#memory-profiling)
  - [Common Bottlenecks](#common-bottlenecks)

## Memory Management

WebAssembly has limited memory compared to native applications. Proper memory management is crucial for stable performance.

### Buffer Lifecycle

Always properly manage the lifecycle of GEGL buffers to prevent memory leaks:

```javascript
// Good: Proper buffer lifecycle
const buffer = Gegl.createBuffer({x: 0, y: 0, width: 1024, height: 1024}, 'RGBA u8');

// Use buffer...
const result = buffer.getPixels({x: 0, y: 0, width: 1024, height: 1024}, 'RGBA u8');

// Clean up when done
buffer.destroy(); // Explicit cleanup
```

```javascript
// Bad: Buffer not cleaned up
function processImage() {
  const buffer = Gegl.createBuffer({x: 0, y: 0, width: 1024, height: 1024}, 'RGBA u8');
  // Process...
  return buffer; // Buffer remains in memory
}
```

### Memory Pool Usage

Reuse buffers when possible to reduce allocation overhead:

```javascript
// Create a pool of reusable buffers
class BufferPool {
  constructor(size = 5) {
    this.pool = [];
    this.size = size;
  }

  get(width, height, format = 'RGBA u8') {
    const key = `${width}x${height}:${format}`;
    if (this.pool[key] && this.pool[key].length > 0) {
      return this.pool[key].pop();
    }
    return Gegl.createBuffer({x: 0, y: 0, width, height}, format);
  }

  release(buffer) {
    const extent = buffer.getExtent();
    const format = buffer.getFormat();
    const key = `${extent.width}x${extent.height}:${format}`;

    if (!this.pool[key]) {
      this.pool[key] = [];
    }

    if (this.pool[key].length < this.size) {
      // Clear buffer contents
      const pixels = new Uint8Array(extent.width * extent.height * 4);
      buffer.setPixels(extent, format, pixels);
      this.pool[key].push(buffer);
    } else {
      buffer.destroy();
    }
  }
}

const bufferPool = new BufferPool();

// Usage
const buffer = bufferPool.get(512, 512);
try {
  // Use buffer...
} finally {
  bufferPool.release(buffer);
}
```

### Avoiding Memory Leaks

- Always call `destroy()` on buffers when they're no longer needed
- Use try/finally blocks for buffer cleanup
- Avoid keeping references to large buffers in closures
- Monitor memory usage with browser dev tools

## Performance Optimizations

### Minimizing JS-WASM Boundary Crossings

Each call between JavaScript and WebAssembly has overhead. Minimize crossings:

```javascript
// Good: Batch operations
const graph = Gegl.createGraph();
const loadNode = graph.createNode('gegl:load');
loadNode.setProperty('path', 'input.jpg');

const blurNode = graph.createNode('gegl:blur-gaussian');
blurNode.setNumberProperty('std_dev_x', 5.0);
blurNode.setNumberProperty('std_dev_y', 5.0);

loadNode.connectTo(blurNode);
blurNode.process(); // Single WASM call for entire pipeline

// Bad: Multiple individual calls
const buffer = Gegl.loadBuffer('input.jpg');
const blurred = Gegl.createBuffer(buffer.getExtent(), buffer.getFormat());
blurNode.process(); // Separate call
```

### Worker Thread Usage

Use Web Workers for CPU-intensive operations to avoid blocking the main thread:

```javascript
// main.js
const worker = new GeglWorker('gegl.js');

async function processImage(imageData) {
  await worker.init();

  const operations = [
    { operation: 'gegl:blur-gaussian', properties: { std_dev_x: 5.0 } },
    { operation: 'gegl:brightness-contrast', properties: { brightness: 0.2 } }
  ];

  const result = await worker.process(imageData, operations);
  worker.cleanup();

  return result;
}

// worker.js (separate file)
importScripts('gegl.js');

// Worker handles processing off-main-thread
```

### Operation Batching

Combine multiple operations into single processing calls:

```javascript
// Good: Batch operations
const operations = [
  { operation: 'gegl:blur-gaussian', properties: { std_dev_x: 2.0 } },
  { operation: 'gegl:brightness-contrast', properties: { contrast: 1.2 } },
  { operation: 'gegl:hue-saturation', properties: { saturation: 1.5 } }
];

const result = await worker.process(imageData, operations);

// Bad: Sequential processing
let result = imageData;
result = await worker.process(result, [{ operation: 'gegl:blur-gaussian' }]);
result = await worker.process(result, [{ operation: 'gegl:brightness-contrast' }]);
result = await worker.process(result, [{ operation: 'gegl:hue-saturation' }]);
```

### SIMD Acceleration

GEGL.wasm includes SIMD optimizations. Ensure your build supports SIMD:

```javascript
// Check SIMD support
const supportsSIMD = await GeglFeatureDetection.detectFeatures()
  .then(features => features.webAssemblySIMD);

// Use SIMD-optimized operations when available
if (supportsSIMD) {
  // SIMD operations will be automatically used
  const result = await worker.process(imageData, operations);
}
```

## Browser-Specific Optimizations

### WebAssembly Feature Detection

Always check for WebAssembly support before initialization:

```javascript
import { GeglFeatureDetection } from 'gegl-wasm';

async function initializeGEGL() {
  const support = await GeglFeatureDetection.detectFeatures();

  if (!support.isFullySupported()) {
    const missing = support.getMissingFeatures();
    console.warn('Missing features:', missing);

    // Provide fallback or graceful degradation
    if (!support.webAssembly) {
      throw new Error('WebAssembly not supported');
    }
  }

  // Safe to initialize
  Gegl.init();
}
```

### Memory Limits and Garbage Collection

Different browsers have different memory limits and GC behaviors:

```javascript
// Monitor memory usage
function getMemoryUsage() {
  if (performance.memory) {
    return {
      used: performance.memory.usedJSHeapSize,
      total: performance.memory.totalJSHeapSize,
      limit: performance.memory.jsHeapSizeLimit
    };
  }
  return null;
}

// Process large images in chunks
async function processLargeImage(imageData, chunkSize = 1024) {
  const chunks = [];
  const width = imageData.width;
  const height = imageData.height;

  for (let y = 0; y < height; y += chunkSize) {
    for (let x = 0; x < width; x += chunkSize) {
      const chunkWidth = Math.min(chunkSize, width - x);
      const chunkHeight = Math.min(chunkSize, height - y);

      // Extract chunk
      const chunkCanvas = document.createElement('canvas');
      chunkCanvas.width = chunkWidth;
      chunkCanvas.height = chunkHeight;
      const ctx = chunkCanvas.getContext('2d');
      ctx.drawImage(imageData, -x, -y);

      // Process chunk
      const chunkData = ctx.getImageData(0, 0, chunkWidth, chunkHeight);
      const processed = await worker.process(chunkData, operations);

      chunks.push({ x, y, data: processed });
    }
  }

  // Reassemble chunks
  return reassembleChunks(chunks, width, height);
}
```

### Canvas Rendering Optimizations

Optimize canvas operations for better performance:

```javascript
// Use OffscreenCanvas when available
async function renderToCanvas(buffer, canvas) {
  const extent = buffer.getExtent();

  if (canvas.transferControlToOffscreen) {
    // OffscreenCanvas available
    const offscreen = canvas.transferControlToOffscreen();
    const ctx = offscreen.getContext('2d');

    // Direct rendering without main thread blocking
    const imageData = await CanvasUtils.geglBufferToImageData(buffer);
    ctx.putImageData(imageData, 0, 0);
  } else {
    // Fallback to main thread rendering
    const ctx = canvas.getContext('2d');
    const imageData = CanvasUtils.geglBufferToImageData(buffer);
    ctx.putImageData(imageData, 0, 0);
  }
}

// Optimize canvas settings
function optimizeCanvas(canvas) {
  const ctx = canvas.getContext('2d');

  // Disable image smoothing for pixel-perfect operations
  ctx.imageSmoothingEnabled = false;

  // Use appropriate composite operations
  ctx.globalCompositeOperation = 'source-over';
}
```

## Profiling and Debugging

### Performance Monitoring

Use browser performance APIs to monitor GEGL operations:

```javascript
class PerformanceMonitor {
  constructor() {
    this.metrics = [];
  }

  start(operation) {
    this.metrics[operation] = {
      start: performance.now(),
      memoryStart: performance.memory?.usedJSHeapSize
    };
  }

  end(operation) {
    const metric = this.metrics[operation];
    if (!metric) return;

    const duration = performance.now() - metric.start;
    const memoryDelta = performance.memory ?
      performance.memory.usedJSHeapSize - metric.memoryStart : 0;

    console.log(`${operation}: ${duration.toFixed(2)}ms, Memory: ${memoryDelta} bytes`);

    delete this.metrics[operation];
  }
}

const monitor = new PerformanceMonitor();

// Usage
monitor.start('blur-operation');
await worker.process(imageData, [{ operation: 'gegl:blur-gaussian' }]);
monitor.end('blur-operation');
```

### Memory Profiling

Monitor memory usage patterns:

```javascript
// Track buffer allocations
class MemoryTracker {
  constructor() {
    this.buffers = new Set();
    this.peakMemory = 0;
  }

  track(buffer) {
    this.buffers.add(buffer);
    this.updatePeak();
  }

  release(buffer) {
    this.buffers.delete(buffer);
  }

  updatePeak() {
    const currentMemory = Array.from(this.buffers)
      .reduce((total, buffer) => {
        const extent = buffer.getExtent();
        return total + (extent.width * extent.height * 4); // Rough RGBA estimate
      }, 0);

    this.peakMemory = Math.max(this.peakMemory, currentMemory);
  }

  getStats() {
    return {
      activeBuffers: this.buffers.size,
      peakMemory: this.peakMemory
    };
  }
}
```

### Common Bottlenecks

Identify and address common performance issues:

1. **Large Buffer Allocations**: Break large images into tiles
2. **Frequent JS-WASM Calls**: Batch operations and use workers
3. **Memory Leaks**: Always clean up buffers and monitor usage
4. **Inefficient Formats**: Use appropriate pixel formats for operations
5. **Blocking Operations**: Use Web Workers for CPU-intensive tasks

```javascript
// Example: Optimized large image processing
async function processLargeImageOptimized(imageData) {
  const TILE_SIZE = 512;
  const tiles = tileImage(imageData, TILE_SIZE);

  const promises = tiles.map(async (tile) => {
    const worker = new GeglWorker();
    await worker.init();

    try {
      return await worker.process(tile.data, operations);
    } finally {
      worker.cleanup();
    }
  });

  const processedTiles = await Promise.all(promises);
  return reassembleTiles(processedTiles, imageData.width, imageData.height);
}
```

## Additional Resources

- [WebAssembly Performance Best Practices](https://webassembly.org/docs/performance/)
- [Emscripten Optimization Guidelines](https://emscripten.org/docs/optimizing/Optimizing-Code.html)
- [Browser Memory Management](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Memory_Management)</content>
</xai:function_call name="bash">
<parameter name="command">cd /mnt/data/projects/durable/durable-exterior-oss/repos/gegl.wasm && npm run lint 2>/dev/null || echo "No lint script found"