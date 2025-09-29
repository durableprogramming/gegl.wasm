/**
 * GEGL.wasm Performance Benchmark Suite
 *
 * Measures performance of common image processing operations comparing
 * GEGL WebAssembly implementations against pure JavaScript implementations.
 * Provides detailed timing and performance ratio analysis.
 */

// Benchmark configuration
const BENCHMARK_CONFIG = {
    iterations: 5,        // Number of iterations per test
    warmupIterations: 2,  // Warmup iterations before timing
    imageSizes: [
        { width: 256, height: 256, name: '256x256' },
        { width: 512, height: 512, name: '512x512' },
        { width: 1024, height: 1024, name: '1024x1024' }
    ],
    operations: [
        'blur-gaussian',
        'brightness-contrast',
        'invert',
        'grayscale',
        'box-blur',
        'color-temperature'
    ]
};

// Test image generators
function createTestImageData(width, height, type = 'gradient') {
    const data = new Uint8ClampedArray(width * height * 4);

    switch (type) {
        case 'gradient':
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const index = (y * width + x) * 4;
                    data[index] = Math.floor((x / width) * 255);     // R gradient
                    data[index + 1] = Math.floor((y / height) * 255); // G gradient
                    data[index + 2] = 128;                            // B constant
                    data[index + 3] = 255;                            // A
                }
            }
            break;

        case 'checkerboard':
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const index = (y * width + x) * 4;
                    const isBlack = ((x / 32) % 2) ^ ((y / 32) % 2);
                    data[index] = isBlack ? 0 : 255;
                    data[index + 1] = isBlack ? 0 : 255;
                    data[index + 2] = isBlack ? 0 : 255;
                    data[index + 3] = 255;
                }
            }
            break;

        case 'noise':
            for (let i = 0; i < data.length; i += 4) {
                data[i] = Math.floor(Math.random() * 255);     // R
                data[i + 1] = Math.floor(Math.random() * 255); // G
                data[i + 2] = Math.floor(Math.random() * 255); // B
                data[i + 3] = 255;                              // A
            }
            break;

        default:
            // Solid color
            for (let i = 0; i < data.length; i += 4) {
                data[i] = 128;     // R
                data[i + 1] = 128; // G
                data[i + 2] = 128; // B
                data[i + 3] = 255; // A
            }
    }

    return new ImageData(data, width, height);
}

// JavaScript implementations of image operations
const JS_OPERATIONS = {
    'blur-gaussian': function(imageData, params = {}) {
        const { stdDevX = 2.0, stdDevY = 2.0 } = params;
        const radius = Math.ceil(Math.max(stdDevX, stdDevY) * 3);
        return gaussianBlurJS(imageData, radius);
    },

    'brightness-contrast': function(imageData, params = {}) {
        const { brightness = 0.0, contrast = 0.0 } = params;
        return brightnessContrastJS(imageData, brightness, contrast);
    },

    'invert': function(imageData) {
        return invertJS(imageData);
    },

    'grayscale': function(imageData) {
        return grayscaleJS(imageData);
    },

    'box-blur': function(imageData, params = {}) {
        const { radius = 1 } = params;
        return boxBlurJS(imageData, radius);
    },

    'color-temperature': function(imageData, params = {}) {
        const { temperature = 6500 } = params;
        return colorTemperatureJS(imageData, temperature);
    }
};

// JavaScript operation implementations
function gaussianBlurJS(imageData, radius) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const output = new Uint8ClampedArray(data.length);

    // Simple box blur approximation for gaussian
    // In a real implementation, you'd use proper gaussian kernel
    return boxBlurJS(imageData, radius);
}

function boxBlurJS(imageData, radius) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const output = new Uint8ClampedArray(data.length);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0, a = 0, count = 0;

            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const nx = x + dx;
                    const ny = y + dy;

                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        const index = (ny * width + nx) * 4;
                        r += data[index];
                        g += data[index + 1];
                        b += data[index + 2];
                        a += data[index + 3];
                        count++;
                    }
                }
            }

            const index = (y * width + x) * 4;
            output[index] = r / count;
            output[index + 1] = g / count;
            output[index + 2] = b / count;
            output[index + 3] = a / count;
        }
    }

    return new ImageData(output, width, height);
}

function brightnessContrastJS(imageData, brightness, contrast) {
    const data = imageData.data;
    const output = new Uint8ClampedArray(data.length);

    // Convert to [-1, 1] range for calculations
    const b = brightness * 2;
    const c = contrast * 2;

    for (let i = 0; i < data.length; i += 4) {
        for (let j = 0; j < 3; j++) { // RGB only
            let value = data[i + j] / 255; // Normalize to [0, 1]
            value = (value - 0.5) * (1 + c) + 0.5 + b; // Apply contrast and brightness
            value = Math.max(0, Math.min(1, value)); // Clamp
            output[i + j] = Math.round(value * 255);
        }
        output[i + 3] = data[i + 3]; // Alpha unchanged
    }

    return new ImageData(output, imageData.width, imageData.height);
}

function invertJS(imageData) {
    const data = imageData.data;
    const output = new Uint8ClampedArray(data.length);

    for (let i = 0; i < data.length; i += 4) {
        output[i] = 255 - data[i];     // R
        output[i + 1] = 255 - data[i + 1]; // G
        output[i + 2] = 255 - data[i + 2]; // B
        output[i + 3] = data[i + 3];   // A unchanged
    }

    return new ImageData(output, imageData.width, imageData.height);
}

function grayscaleJS(imageData) {
    const data = imageData.data;
    const output = new Uint8ClampedArray(data.length);

    for (let i = 0; i < data.length; i += 4) {
        const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        output[i] = gray;     // R
        output[i + 1] = gray; // G
        output[i + 2] = gray; // B
        output[i + 3] = data[i + 3]; // A unchanged
    }

    return new ImageData(output, imageData.width, imageData.height);
}

function colorTemperatureJS(imageData, temperature) {
    const data = imageData.data;
    const output = new Uint8ClampedArray(data.length);

    // Simplified color temperature adjustment
    // In reality, this would use proper color science calculations
    const factor = (temperature - 6500) / 10000; // Normalize around 6500K

    for (let i = 0; i < data.length; i += 4) {
        let r = data[i] / 255;
        let g = data[i + 1] / 255;
        let b = data[i + 2] / 255;

        if (factor > 0) {
            // Warmer (more red/yellow)
            r = Math.min(1, r * (1 + factor * 0.3));
            g = Math.min(1, g * (1 + factor * 0.1));
            b = Math.max(0, b * (1 - factor * 0.2));
        } else {
            // Cooler (more blue)
            r = Math.max(0, r * (1 + factor * 0.2));
            g = Math.max(0, g * (1 + factor * 0.1));
            b = Math.min(1, b * (1 - factor * 0.3));
        }

        output[i] = Math.round(r * 255);
        output[i + 1] = Math.round(g * 255);
        output[i + 2] = Math.round(b * 255);
        output[i + 3] = data[i + 3];
    }

    return new ImageData(output, imageData.width, imageData.height);
}

// Benchmark runner
class BenchmarkRunner {
    constructor() {
        this.worker = null;
        this.results = {};
    }

    async init() {
        if (typeof GeglWorker === 'undefined') {
            throw new Error('GeglWorker not available');
        }

        console.log('Initializing GEGL worker for benchmarking...');
        this.worker = new GeglWorker();
        await this.worker.init();
        console.log('GEGL worker initialized successfully');
    }

    async runBenchmark(operation, imageSize, imageType = 'gradient') {
        const imageData = createTestImageData(imageSize.width, imageSize.height, imageType);
        const operationKey = `${operation}-${imageSize.name}-${imageType}`;

        console.log(`\n🧪 Benchmarking ${operation} on ${imageSize.name} ${imageType} image`);

        // Warmup
        console.log('  Warming up...');
        for (let i = 0; i < BENCHMARK_CONFIG.warmupIterations; i++) {
            await this.runGEGLTest(operation, imageData);
            this.runJSTest(operation, imageData);
        }

        // Benchmark GEGL
        console.log('  Running GEGL tests...');
        const geglTimes = [];
        for (let i = 0; i < BENCHMARK_CONFIG.iterations; i++) {
            const start = performance.now();
            await this.runGEGLTest(operation, imageData);
            const end = performance.now();
            geglTimes.push(end - start);
        }

        // Benchmark JavaScript
        console.log('  Running JavaScript tests...');
        const jsTimes = [];
        for (let i = 0; i < BENCHMARK_CONFIG.iterations; i++) {
            const start = performance.now();
            this.runJSTest(operation, imageData);
            const end = performance.now();
            jsTimes.push(end - start);
        }

        // Calculate statistics
        const geglStats = this.calculateStats(geglTimes);
        const jsStats = this.calculateStats(jsTimes);
        const speedup = jsStats.mean / geglStats.mean;

        const result = {
            operation,
            imageSize: imageSize.name,
            imageType,
            gegl: geglStats,
            javascript: jsStats,
            speedup,
            iterations: BENCHMARK_CONFIG.iterations
        };

        this.results[operationKey] = result;

        console.log(`  GEGL: ${geglStats.mean.toFixed(2)}ms ± ${geglStats.stdDev.toFixed(2)}ms`);
        console.log(`  JS:   ${jsStats.mean.toFixed(2)}ms ± ${jsStats.stdDev.toFixed(2)}ms`);
        console.log(`  Speedup: ${speedup.toFixed(2)}x ${speedup > 1 ? '(GEGL faster)' : '(JS faster)'}`);

        return result;
    }

    async runGEGLTest(operation, imageData) {
        const operations = [{
            operation: `gegl:${operation}`,
            properties: this.getOperationParams(operation)
        }];

        return await this.worker.process(imageData, operations);
    }

    runJSTest(operation, imageData) {
        const params = this.getOperationParams(operation);
        return JS_OPERATIONS[operation](imageData, params);
    }

    getOperationParams(operation) {
        switch (operation) {
            case 'blur-gaussian':
                return { 'std-dev-x': 2.0, 'std-dev-y': 2.0 };
            case 'brightness-contrast':
                return { brightness: 0.2, contrast: 0.5 };
            case 'box-blur':
                return { radius: 2 };
            case 'color-temperature':
                return { temperature: 8000 };
            default:
                return {};
        }
    }

    calculateStats(times) {
        const mean = times.reduce((a, b) => a + b, 0) / times.length;
        const variance = times.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / times.length;
        const stdDev = Math.sqrt(variance);

        return {
            mean,
            stdDev,
            min: Math.min(...times),
            max: Math.max(...times),
            median: this.calculateMedian(times)
        };
    }

    calculateMedian(times) {
        const sorted = [...times].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    }

    async runAllBenchmarks() {
        console.log('🚀 Starting GEGL.wasm Performance Benchmarks');
        console.log('=' .repeat(50));

        for (const imageSize of BENCHMARK_CONFIG.imageSizes) {
            for (const operation of BENCHMARK_CONFIG.operations) {
                for (const imageType of ['gradient', 'checkerboard', 'noise']) {
                    try {
                        await this.runBenchmark(operation, imageSize, imageType);
                    } catch (error) {
                        console.error(`❌ Benchmark failed for ${operation} on ${imageSize.name} ${imageType}:`, error.message);
                    }
                }
            }
        }

        this.printSummary();
    }

    printSummary() {
        console.log('\n' + '='.repeat(50));
        console.log('📊 BENCHMARK SUMMARY');
        console.log('='.repeat(50));

        // Group by operation
        const operationResults = {};
        for (const [key, result] of Object.entries(this.results)) {
            const operation = result.operation;
            if (!operationResults[operation]) {
                operationResults[operation] = [];
            }
            operationResults[operation].push(result);
        }

        for (const [operation, results] of Object.entries(operationResults)) {
            console.log(`\n${operation.toUpperCase()}:`);

            const avgSpeedup = results.reduce((sum, r) => sum + r.speedup, 0) / results.length;
            const geglFaster = results.filter(r => r.speedup > 1).length;
            const total = results.length;

            console.log(`  Average speedup: ${avgSpeedup.toFixed(2)}x`);
            console.log(`  GEGL faster in ${geglFaster}/${total} cases`);

            // Show best and worst cases
            const sortedBySpeedup = results.sort((a, b) => b.speedup - a.speedup);
            const best = sortedBySpeedup[0];
            const worst = sortedBySpeedup[sortedBySpeedup.length - 1];

            console.log(`  Best: ${best.speedup.toFixed(2)}x faster (${best.imageSize} ${best.imageType})`);
            console.log(`  Worst: ${worst.speedup.toFixed(2)}x ${worst.speedup > 1 ? 'faster' : 'slower'} (${worst.imageSize} ${worst.imageType})`);
        }

        console.log('\n✅ Benchmarking completed');
    }

    cleanup() {
        if (this.worker) {
            this.worker.cleanup();
        }
    }
}

// Export for browser testing
async function runBenchmarks() {
    const runner = new BenchmarkRunner();

    try {
        await runner.init();
        await runner.runAllBenchmarks();
    } catch (error) {
        console.error('❌ Benchmark failed:', error);
    } finally {
        runner.cleanup();
    }
}

// Export for manual testing
if (typeof window !== 'undefined') {
    window.runGeglBenchmarks = runBenchmarks;
    window.BenchmarkRunner = BenchmarkRunner;
    console.log('GEGL Benchmark suite loaded. Call runGeglBenchmarks() to start benchmarking.');
}