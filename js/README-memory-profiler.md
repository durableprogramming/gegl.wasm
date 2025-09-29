# GEGL WebAssembly Memory Profiler

A utility for monitoring WebAssembly memory usage and detecting potential memory leaks in GEGL WebAssembly applications running in the browser.

## Features

- **Real-time Memory Monitoring**: Tracks WebAssembly heap size and JavaScript memory usage
- **Object Tracking**: Monitors creation and destruction of GEGL objects (buffers, nodes, processors, colors)
- **Leak Detection**: Identifies potential memory leaks through continuous growth analysis
- **Profiling Reports**: Generates detailed reports with memory usage statistics
- **Browser Integration**: Works seamlessly in browser environments with WebAssembly

## Usage

### Basic Usage

```javascript
// Start profiling
memoryProfiler.start();

// Your GEGL code here...
const buffer = Gegl.createBuffer({ width: 1000, height: 1000 });
const node = graph.createNode('gegl:blur');
// ... process images ...

// Get a report
const report = memoryProfiler.getReport();
console.log('Memory usage:', report);

// Stop profiling
memoryProfiler.stop();
```

### Advanced Usage

```javascript
// Start with custom options
memoryProfiler.start({
    sampleInterval: 500,    // Sample every 500ms
    trackObjects: true      // Track GEGL object counts
});

// Create and process many objects
for (let i = 0; i < 100; i++) {
    const buffer = Gegl.createBuffer({ width: 100, height: 100 });
    // Process buffer...
}

// Get detailed report
const report = memoryProfiler.getReport();
console.log('Current memory:', report.current);
console.log('Memory history:', report.history);
console.log('Summary:', report.summary);
console.log('Detected leaks:', report.leaks);

// Export data for analysis
const jsonData = memoryProfiler.exportData();
```

### Report Structure

The profiler generates reports with the following structure:

```javascript
{
    current: {
        timestamp: 1234567890,
        elapsed: 5000,        // Time since profiling started (ms)
        wasmMemory: {
            heapSize: 1048576,    // WebAssembly heap size (bytes)
            heapUsed: 524288,     // Estimated used memory (bytes)
            heapGrowth: 1024       // Growth since last sample (bytes)
        },
        jsMemory: {
            usedJSHeapSize: 8388608,     // JavaScript heap usage
            totalJSHeapSize: 16777216,
            jsHeapSizeLimit: 2147483648
        },
        objectCounts: {
            buffers: 5,
            nodes: 10,
            processors: 2,
            colors: 3
        }
    },
    history: [ /* Array of all snapshots */ ],
    summary: {
        duration: 5000,
        totalSamples: 6,
        averageMemoryGrowth: 512,
        peakMemoryUsage: 1048576,
        totalAllocations: 20,
        objectCounts: { /* Final counts */ }
    },
    leaks: [
        {
            type: 'continuous_growth',
            severity: 'warning',
            message: 'Memory growing continuously at 1024.00 bytes per sample',
            details: { /* Additional info */ }
        }
    ]
}
```

## API Reference

### MemoryProfiler Class

#### Methods

- `start(options)`: Start memory profiling
  - `options.sampleInterval`: Sample interval in milliseconds (default: 1000)
  - `options.trackObjects`: Enable GEGL object tracking (default: true)

- `stop()`: Stop memory profiling

- `getReport()`: Get current memory report

- `exportData()`: Export all profiling data as JSON string

- `clear()`: Clear all profiling data

#### Properties

- `isProfiling`: Boolean indicating if profiling is active
- `snapshots`: Array of memory snapshots
- `objectCounts`: Current count of tracked objects

### Global Instance

A global `memoryProfiler` instance is available for convenience:

```javascript
// Available in browser as window.memoryProfiler
memoryProfiler.start();
```

## Leak Detection

The profiler automatically detects potential memory leaks by:

1. **Continuous Growth**: Monitors if memory usage is steadily increasing over time
2. **Object Accumulation**: Tracks if GEGL objects are being created without cleanup
3. **Growth Rate Analysis**: Calculates memory growth rates to identify abnormal patterns

Leak reports include severity levels and detailed information for debugging.

## Integration

### Browser

Include the memory profiler in your HTML:

```html
<script src="gegl.js"></script>
<script src="js/memory-profiler.js"></script>
<script src="js/gegl-wrapper.js"></script>
```

### Node.js

```javascript
const { MemoryProfiler } = require('./js/memory-profiler.js');
const profiler = new MemoryProfiler();
```

## Testing

Run the test script to see the profiler in action:

```javascript
// In browser console
testMemoryProfiler();
```

The test creates various GEGL objects, monitors memory usage, and demonstrates leak detection.

## Performance Impact

- Memory profiling has minimal performance impact when sampling at default intervals
- Object tracking adds small overhead to GEGL object creation
- For production use, consider conditional profiling based on environment

## Limitations

- Memory usage estimates are approximate due to WebAssembly limitations
- JavaScript memory info may not be available in all browsers
- Object tracking relies on hooking constructors (may miss direct API calls)
- Leak detection is heuristic-based and may produce false positives

## Troubleshooting

### No Memory Data

- Ensure WebAssembly module is loaded before starting profiler
- Check browser compatibility for `performance.memory`

### Missing Object Tracking

- Start profiling before creating GEGL objects
- Ensure `trackObjects` option is enabled

### High Memory Usage

- Reduce sample interval for less frequent monitoring
- Clear profiling data periodically with `clear()`