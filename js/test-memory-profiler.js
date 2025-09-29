/**
 * Comprehensive tests for memory-profiler.js
 * Tests memory monitoring, leak detection, and profiling functionality
 */

// Mock browser environment for testing
if (typeof window === 'undefined') {
    console.log('This test is designed for browser environment');
    console.log('To run this test, load it in a browser with the GEGL WebAssembly module loaded');
    process.exit(0);
}

function testMemoryProfilerInitialization() {
    console.log('Testing MemoryProfiler initialization...');

    try {
        const profiler = new MemoryProfiler();

        // Check initial state
        if (!profiler.isProfiling) {
            console.log('✓ Profiler starts in non-profiling state');
        } else {
            console.error('✗ Profiler should start in non-profiling state');
        }

        if (profiler.snapshots.length === 0) {
            console.log('✓ No initial snapshots');
        } else {
            console.error('✗ Should have no initial snapshots');
        }

        if (profiler.allocationHistory.length === 0) {
            console.log('✓ No initial allocation history');
        } else {
            console.error('✗ Should have no initial allocation history');
        }

        // Check object counts are zero
        const expectedCounts = { buffers: 0, nodes: 0, processors: 0, colors: 0 };
        if (JSON.stringify(profiler.objectCounts) === JSON.stringify(expectedCounts)) {
            console.log('✓ Object counts initialized to zero');
        } else {
            console.error('✗ Object counts not initialized correctly');
        }

    } catch (error) {
        console.error('✗ MemoryProfiler initialization test failed:', error.message);
    }
}

function testMemoryProfilingStartStop() {
    console.log('Testing profiling start/stop functionality...');

    try {
        const profiler = new MemoryProfiler();

        // Start profiling
        profiler.start({ sampleInterval: 100 });
        if (profiler.isProfiling) {
            console.log('✓ Profiling started successfully');
        } else {
            console.error('✗ Profiling failed to start');
        }

        // Wait a bit for some snapshots
        setTimeout(() => {
            if (profiler.snapshots.length > 0) {
                console.log('✓ Snapshots are being taken');
            } else {
                console.error('✗ No snapshots taken');
            }

            // Stop profiling
            profiler.stop();
            if (!profiler.isProfiling) {
                console.log('✓ Profiling stopped successfully');
            } else {
                console.error('✗ Profiling failed to stop');
            }

            // Check final snapshot was taken
            const initialSnapshotCount = profiler.snapshots.length;
            setTimeout(() => {
                if (profiler.snapshots.length > initialSnapshotCount) {
                    console.log('✓ Final snapshot taken on stop');
                } else {
                    console.error('✗ Final snapshot not taken on stop');
                }
            }, 50);

        }, 250);

    } catch (error) {
        console.error('✗ Start/stop test failed:', error.message);
    }
}

function testMemorySnapshot() {
    console.log('Testing memory snapshot functionality...');

    try {
        const profiler = new MemoryProfiler();

        // Take a manual snapshot
        const snapshot = profiler._takeSnapshot();

        // Check snapshot structure
        const requiredFields = ['timestamp', 'elapsed', 'wasmMemory', 'jsMemory', 'objectCounts', 'allocationHistory'];
        const hasAllFields = requiredFields.every(field => snapshot.hasOwnProperty(field));

        if (hasAllFields) {
            console.log('✓ Snapshot has all required fields');
        } else {
            console.error('✗ Snapshot missing required fields');
        }

        // Check wasmMemory structure
        const wasmFields = ['heapSize', 'heapUsed', 'heapGrowth'];
        const hasWasmFields = wasmFields.every(field => snapshot.wasmMemory.hasOwnProperty(field));

        if (hasWasmFields) {
            console.log('✓ WASM memory info has required fields');
        } else {
            console.error('✗ WASM memory info missing fields');
        }

        // Check jsMemory structure (may be empty if not supported)
        if (typeof snapshot.jsMemory === 'object') {
            console.log('✓ JS memory info is an object');
        } else {
            console.error('✗ JS memory info should be an object');
        }

    } catch (error) {
        console.error('✗ Snapshot test failed:', error.message);
    }
}

function testLeakDetection() {
    console.log('Testing leak detection functionality...');

    try {
        const profiler = new MemoryProfiler();

        // Create some fake snapshots with memory growth
        profiler.snapshots = [
            {
                elapsed: 0,
                wasmMemory: { heapSize: 1000, heapUsed: 500, heapGrowth: 0 },
                objectCounts: { buffers: 0, nodes: 0, processors: 0, colors: 0 }
            },
            {
                elapsed: 1000,
                wasmMemory: { heapSize: 2000, heapUsed: 1000, heapGrowth: 1000 },
                objectCounts: { buffers: 1, nodes: 2, processors: 0, colors: 0 }
            },
            {
                elapsed: 2000,
                wasmMemory: { heapSize: 3000, heapUsed: 1500, heapGrowth: 1000 },
                objectCounts: { buffers: 2, nodes: 4, processors: 0, colors: 0 }
            },
            {
                elapsed: 3000,
                wasmMemory: { heapSize: 4000, heapUsed: 2000, heapGrowth: 1000 },
                objectCounts: { buffers: 3, nodes: 6, processors: 0, colors: 0 }
            },
            {
                elapsed: 4000,
                wasmMemory: { heapSize: 5000, heapUsed: 2500, heapGrowth: 1000 },
                objectCounts: { buffers: 4, nodes: 8, processors: 0, colors: 0 }
            }
        ];

        const leaks = profiler._detectLeaks();

        if (Array.isArray(leaks)) {
            console.log('✓ Leak detection returns an array');

            // Should detect continuous growth
            const growthLeak = leaks.find(l => l.type === 'continuous_growth');
            if (growthLeak) {
                console.log('✓ Detected continuous memory growth');
            } else {
                console.error('✗ Failed to detect continuous memory growth');
            }

            // Should detect object leaks
            const bufferLeak = leaks.find(l => l.type === 'object_leak' && l.details.objectType === 'buffers');
            const nodeLeak = leaks.find(l => l.type === 'object_leak' && l.details.objectType === 'nodes');

            if (bufferLeak && nodeLeak) {
                console.log('✓ Detected object leaks');
            } else {
                console.error('✗ Failed to detect object leaks');
            }

        } else {
            console.error('✗ Leak detection should return an array');
        }

    } catch (error) {
        console.error('✗ Leak detection test failed:', error.message);
    }
}

function testReportGeneration() {
    console.log('Testing report generation...');

    try {
        const profiler = new MemoryProfiler();

        // Add some test data
        profiler.snapshots = [
            {
                timestamp: 1000,
                elapsed: 0,
                wasmMemory: { heapSize: 1000 },
                jsMemory: {},
                objectCounts: { buffers: 0, nodes: 0, processors: 0, colors: 0 },
                allocationHistory: []
            },
            {
                timestamp: 2000,
                elapsed: 1000,
                wasmMemory: { heapSize: 1500 },
                jsMemory: {},
                objectCounts: { buffers: 1, nodes: 1, processors: 1, colors: 1 },
                allocationHistory: []
            }
        ];

        const report = profiler.getReport();

        // Check report structure
        const requiredReportFields = ['current', 'history', 'summary', 'leaks'];
        const hasReportFields = requiredReportFields.every(field => report.hasOwnProperty(field));

        if (hasReportFields) {
            console.log('✓ Report has all required fields');
        } else {
            console.error('✗ Report missing required fields');
        }

        // Check summary
        if (report.summary.duration === 1000) {
            console.log('✓ Summary duration calculated correctly');
        } else {
            console.error('✗ Summary duration incorrect');
        }

        if (report.summary.totalSamples === 2) {
            console.log('✓ Summary sample count correct');
        } else {
            console.error('✗ Summary sample count incorrect');
        }

    } catch (error) {
        console.error('✗ Report generation test failed:', error.message);
    }
}

function testDataExport() {
    console.log('Testing data export functionality...');

    try {
        const profiler = new MemoryProfiler();

        // Add some test data
        profiler.snapshots = [{
            timestamp: 1000,
            elapsed: 0,
            wasmMemory: { heapSize: 1000 },
            jsMemory: {},
            objectCounts: { buffers: 0, nodes: 0, processors: 0, colors: 0 },
            allocationHistory: []
        }];

        profiler.startTime = 1000;
        profiler.sampleInterval = 1000;

        const exportedData = profiler.exportData();

        // Should be valid JSON
        try {
            const parsed = JSON.parse(exportedData);
            console.log('✓ Export produces valid JSON');

            // Check exported structure
            const requiredExportFields = ['snapshots', 'summary', 'leaks', 'metadata'];
            const hasExportFields = requiredExportFields.every(field => parsed.hasOwnProperty(field));

            if (hasExportFields) {
                console.log('✓ Exported data has required fields');
            } else {
                console.error('✗ Exported data missing fields');
            }

        } catch (jsonError) {
            console.error('✗ Export does not produce valid JSON');
        }

    } catch (error) {
        console.error('✗ Data export test failed:', error.message);
    }
}

function testClearFunctionality() {
    console.log('Testing clear functionality...');

    try {
        const profiler = new MemoryProfiler();

        // Add some test data
        profiler.snapshots = [{ test: 'data' }];
        profiler.allocationHistory = [{ test: 'allocation' }];
        profiler.objectCounts = { buffers: 1, nodes: 2, processors: 3, colors: 4 };
        profiler.startTime = 12345;

        // Clear data
        profiler.clear();

        if (profiler.snapshots.length === 0) {
            console.log('✓ Snapshots cleared');
        } else {
            console.error('✗ Snapshots not cleared');
        }

        if (profiler.allocationHistory.length === 0) {
            console.log('✓ Allocation history cleared');
        } else {
            console.error('✗ Allocation history not cleared');
        }

        const expectedCounts = { buffers: 0, nodes: 0, processors: 0, colors: 0 };
        if (JSON.stringify(profiler.objectCounts) === JSON.stringify(expectedCounts)) {
            console.log('✓ Object counts reset');
        } else {
            console.error('✗ Object counts not reset');
        }

        if (profiler.startTime === null) {
            console.log('✓ Start time cleared');
        } else {
            console.error('✗ Start time not cleared');
        }

    } catch (error) {
        console.error('✗ Clear functionality test failed:', error.message);
    }
}

function testGlobalInstance() {
    console.log('Testing global memoryProfiler instance...');

    try {
        if (typeof window !== 'undefined' && window.memoryProfiler) {
            if (window.memoryProfiler instanceof MemoryProfiler) {
                console.log('✓ Global memoryProfiler instance available');
            } else {
                console.error('✗ Global instance is not a MemoryProfiler');
            }
        } else {
            console.log('✓ Global instance not available (expected in some environments)');
        }

    } catch (error) {
        console.error('✗ Global instance test failed:', error.message);
    }
}

// Run all tests
function runTests() {
    if (typeof MemoryProfiler === 'undefined') {
        console.error('MemoryProfiler not loaded. Make sure to load memory-profiler.js first.');
        return;
    }

    console.log('Running Memory Profiler Tests...');
    console.log('==============================');

    testMemoryProfilerInitialization();
    testMemorySnapshot();
    testLeakDetection();
    testReportGeneration();
    testDataExport();
    testClearFunctionality();
    testGlobalInstance();

    // Async tests
    setTimeout(() => {
        testMemoryProfilingStartStop();

        setTimeout(() => {
            console.log('==============================');
            console.log('Memory Profiler tests completed');
        }, 500);
    }, 100);
}

// Export for manual testing
if (typeof window !== 'undefined') {
    window.testMemoryProfiler = runTests;
    console.log('Memory profiler test loaded. Call testMemoryProfiler() to run tests.');
}