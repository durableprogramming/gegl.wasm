# Canvas Utilities for GEGL WebAssembly

This module provides efficient utilities for converting between HTML5 Canvas ImageData and GEGL buffers in WebAssembly environments.

## Features

- **Efficient pixel data transfer** between Canvas and GEGL buffers
- **Zero-copy conversions** where possible using typed arrays
- **Format handling** for RGBA u8 pixel data
- **Error handling** with descriptive error messages
- **Browser compatibility** with HTML5 Canvas API

## Functions

### Core Conversion Functions

#### `imageDataToGeglBuffer(imageData, buffer?)`
Converts Canvas ImageData to a GEGL buffer.

```javascript
const imageData = ctx.getImageData(0, 0, width, height);
const buffer = CanvasUtils.imageDataToGeglBuffer(imageData);
```

#### `geglBufferToImageData(buffer, rect?)`
Converts GEGL buffer to Canvas ImageData.

```javascript
const imageData = CanvasUtils.geglBufferToImageData(buffer);
ctx.putImageData(imageData, 0, 0);
```

#### `canvasToGeglBuffer(canvas, buffer?)`
Converts entire HTML Canvas to GEGL buffer.

```javascript
const buffer = CanvasUtils.canvasToGeglBuffer(canvas);
```

#### `geglBufferToCanvas(buffer, canvas, rect?)`
Renders GEGL buffer to HTML Canvas.

```javascript
CanvasUtils.geglBufferToCanvas(buffer, canvas);
```

### Utility Functions

#### `loadImageToGeglBuffer(url)`
Asynchronously loads image from URL and converts to GEGL buffer.

```javascript
const buffer = await CanvasUtils.loadImageToGeglBuffer('image.png');
```

#### `copyBufferPixels(srcBuffer, dstBuffer, srcRect?, dstRect?, format?)`
Efficiently copies pixels between GEGL buffers with optional format conversion.

```javascript
CanvasUtils.copyBufferPixels(srcBuffer, dstBuffer);
```

#### `copyGeglBuffer(buffer, format?)`
Creates a copy of a GEGL buffer.

```javascript
const copy = CanvasUtils.copyGeglBuffer(originalBuffer);
```

## Usage Example

```html
<!DOCTYPE html>
<html>
<head>
    <title>GEGL Canvas Example</title>
</head>
<body>
    <canvas id="canvas" width="400" height="300"></canvas>
    <script src="gegl-wrapper.js"></script>
    <script src="canvas-utils.js"></script>
    <script>
        async function main() {
            // Initialize GEGL
            Gegl.init();

            // Get canvas and load image
            const canvas = document.getElementById('canvas');
            const ctx = canvas.getContext('2d');

            // Load image into GEGL buffer
            const buffer = await CanvasUtils.loadImageToGeglBuffer('input.jpg');

            // Apply some processing (example: create a blur node)
            const graph = Gegl.createGraph();
            const loadNode = graph.createNode('gegl:load');
            loadNode.setProperty('path', 'input.jpg');

            const blurNode = graph.createNode('gegl:gaussian-blur');
            blurNode.setNumberProperty('std-dev-x', 5.0);
            blurNode.setNumberProperty('std-dev-y', 5.0);

            loadNode.connectTo(blurNode);

            // Process and render to canvas
            blurNode.process();
            CanvasUtils.geglBufferToCanvas(buffer, canvas);
        }

        main().catch(console.error);
    </script>
</body>
</html>
```

## Error Handling

All functions throw `CanvasUtilsError` for invalid inputs or conversion failures:

```javascript
try {
    const buffer = CanvasUtils.imageDataToGeglBuffer(imageData);
} catch (error) {
    if (error instanceof CanvasUtils.CanvasUtilsError) {
        console.error('Canvas conversion failed:', error.message);
    }
}
```

## Performance Notes

- Conversions use efficient typed array operations
- ImageData.data (Uint8ClampedArray) is converted to Uint8Array for GEGL
- GEGL pixel data is converted back to Uint8ClampedArray for Canvas
- Reuse buffers when possible to avoid allocation overhead
- For large images, consider processing in tiles

## Browser Support

Requires browsers with:
- HTML5 Canvas API
- WebAssembly support
- TypedArray support
- Modern JavaScript (ES6+)

## Dependencies

- GEGL WebAssembly module (gegl-wrapper.js)
- HTML5 Canvas API

## Testing

Run the test suite:

```javascript
// Load in browser console after loading GEGL and canvas-utils
testCanvasUtils();
```

See `test-canvas-utils.js` for example usage and tests.</content>
</xai:function_call/>
</xai:function_call name="list">
<parameter name="path">js