# GEGL.wasm

Fork of the GEGL image processing library targeting WebAssembly for browser and Node.js environments.

[![npm version](https://badge.fury.io/js/gegl-wasm.svg)](https://badge.fury.io/js/gegl-wasm)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

## Installation

### NPM

```bash
npm install gegl-wasm
```

### CDN

```html
<script src="https://cdn.jsdelivr.net/npm/gegl-wasm@0.4.63/dist/gegl-wasm.umd.min.js"></script>
```

### Building from Source

1. Install prerequisites: Emscripten SDK, Meson, Ninja
2. Clone: `git clone https://github.com/durableprogramming/gegl.wasm.git`
3. Activate Emscripten: `source /path/to/emsdk/emsdk_env.sh`
4. Build: `./build-wasm.sh prod`

## Quick Start

### Browser Usage

```html
<canvas id="canvas" width="400" height="300"></canvas>
<script src="dist/gegl-wasm.umd.min.js"></script>
<script>
Module.onRuntimeInitialized = async function() {
    const worker = new GeglWorker();
    await worker.init();

    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const operations = [{
        operation: 'gegl:blur-gaussian',
        properties: { std_dev_x: 5, std_dev_y: 5 }
    }];

    const result = await worker.process(imageData, operations);
    const resultImageData = new ImageData(
        new Uint8ClampedArray(result.data),
        result.width,
        result.height
    );
    ctx.putImageData(resultImageData, 0, 0);

    worker.cleanup();
};
</script>
```

### Node.js Usage

```javascript
const { GeglWorker } = require('gegl-wasm');

const worker = new GeglWorker();
await worker.init();

const operations = [
    { operation: 'gegl:brightness-contrast', properties: { brightness: 0.1, contrast: 1.2 } }
];

const result = await worker.process(imageData, operations);
worker.cleanup();
```

## Browser Requirements

- WebAssembly support
- Web Workers
- ES6+ JavaScript
- Supported browsers: Chrome 57+, Firefox 52+, Safari 11+, Edge 16+, Node.js 14+

## Documentation

- [API Documentation](docs/api.md) - Complete JavaScript API reference
- [Operation Reference](docs/operation-api.adoc) - Available operations
- [Examples](examples/) - Sample applications and demos

## Examples

Run examples: `npm install && npm run dev`

## Contributing

See [contributing guide](docs/contribute.adoc)

## License

GPL-3.0-or-later

## Credits

Based on [GEGL](https://www.gegl.org/) by Øyvind Kolås and contributors.
