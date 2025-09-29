/**
 * WebAssembly Memory Profiler for GEGL
 * Monitors memory usage and detects potential leaks in browser environment
 */

class MemoryProfiler {
    constructor() {
        this.isProfiling = false;
        this.snapshots = [];
        this.objectCounts = {
            buffers: 0,
            nodes: 0,
            processors: 0,
            colors: 0
        };
        this.allocationHistory = [];
        this.startTime = null;
        this.intervalId = null;
        this.sampleInterval = 1000; // Sample every second

        // Setup destruction tracking using FinalizationRegistry if available
        this._setupDestructionTracking();

        // Hook into GEGL object creation/destruction
        this._setupObjectTracking();
    }

    /**
     * Setup destruction tracking using FinalizationRegistry
     * @private
     */
    _setupDestructionTracking() {
        if (typeof FinalizationRegistry === 'undefined') {
            console.warn('FinalizationRegistry not available - destruction tracking disabled');
            return;
        }

        this.finalizationRegistry = new FinalizationRegistry((heldValue) => {
            const { type, id, size, created } = heldValue;
            this.objectCounts[type + 's']--; // Decrement count (buffers, nodes, etc.)
            this.allocationHistory.push({
                type,
                id,
                size,
                timestamp: performance.now(),
                action: 'destroy',
                lifetime: performance.now() - created
            });
        });
    }

    /**
     * Start memory profiling
     * @param {Object} options - Profiling options
     * @param {number} options.sampleInterval - Sample interval in ms (default: 1000)
     * @param {boolean} options.trackObjects - Track GEGL object counts (default: true)
     */
    start(options = {}) {
        if (this.isProfiling) {
            console.warn('Memory profiling already running');
            return;
        }

        this.sampleInterval = options.sampleInterval || 1000;
        this.trackObjects = options.trackObjects !== false;
        this.isProfiling = true;
        this.startTime = performance.now();
        this.snapshots = [];
        this.allocationHistory = [];

        // Take initial snapshot
        this._takeSnapshot();

        // Start periodic sampling
        this.intervalId = setInterval(() => {
            this._takeSnapshot();
        }, this.sampleInterval);

        console.log('Memory profiling started');
    }

    /**
     * Stop memory profiling
     */
    stop() {
        if (!this.isProfiling) {
            console.warn('Memory profiling not running');
            return;
        }

        clearInterval(this.intervalId);
        this.isProfiling = false;
        this.intervalId = null;

        // Take final snapshot
        this._takeSnapshot();

        console.log('Memory profiling stopped');
    }

    /**
     * Get current memory usage report
     * @returns {Object} Memory report
     */
    getReport() {
        const currentSnapshot = this._takeSnapshot();
        const report = {
            current: currentSnapshot,
            history: this.snapshots,
            summary: this._generateSummary(),
            leaks: this._detectLeaks(),
            allocationStats: this.getAllocationStats()
        };

        return report;
    }

    /**
     * Take a memory snapshot
     * @private
     */
    _takeSnapshot() {
        const timestamp = performance.now();
        const elapsed = this.startTime ? timestamp - this.startTime : 0;

        // Get WebAssembly memory info
        const wasmMemory = this._getWasmMemoryInfo();

        // Get JavaScript memory info (if available)
        const jsMemory = this._getJsMemoryInfo();

        // Get GEGL object counts
        const objectCounts = { ...this.objectCounts };

        const snapshot = {
            timestamp,
            elapsed,
            wasmMemory,
            jsMemory,
            objectCounts,
            allocationHistory: [...this.allocationHistory]
        };

        this.snapshots.push(snapshot);
        return snapshot;
    }

    /**
     * Get WebAssembly memory information
     * @private
     */
    _getWasmMemoryInfo() {
        const info = {
            heapSize: 0,
            heapUsed: 0,
            heapGrowth: 0
        };

        try {
            if (typeof Module !== 'undefined' && Module.HEAPU8) {
                info.heapSize = Module.HEAPU8.length;
                // Estimate used memory (this is approximate)
                info.heapUsed = this._estimateWasmHeapUsage();
            }

            // Calculate heap growth from previous snapshot
            if (this.snapshots.length > 0) {
                const prev = this.snapshots[this.snapshots.length - 1];
                info.heapGrowth = info.heapSize - prev.wasmMemory.heapSize;
            }
        } catch (error) {
            console.warn('Failed to get WebAssembly memory info:', error);
        }

        return info;
    }

    /**
     * Estimate WebAssembly heap usage
     * @private
     */
    _estimateWasmHeapUsage() {
        // This is a rough estimate - in practice, you'd need more sophisticated
        // memory tracking integrated into the WebAssembly module
        let used = 0;

        try {
            // Count active GEGL objects (each has some memory overhead)
            used += this.objectCounts.buffers * 1024; // Rough estimate per buffer
            used += this.objectCounts.nodes * 256;     // Rough estimate per node
            used += this.objectCounts.processors * 512; // Rough estimate per processor
            used += this.objectCounts.colors * 64;      // Rough estimate per color

            // Add allocation history
            used += this.allocationHistory.reduce((sum, alloc) => sum + alloc.size, 0);
        } catch (error) {
            console.warn('Failed to estimate heap usage:', error);
        }

        return used;
    }

    /**
     * Get JavaScript memory information
     * @private
     */
    _getJsMemoryInfo() {
        const info = {
            usedJSHeapSize: 0,
            totalJSHeapSize: 0,
            jsHeapSizeLimit: 0
        };

        try {
            if (performance.memory) {
                info.usedJSHeapSize = performance.memory.usedJSHeapSize;
                info.totalJSHeapSize = performance.memory.totalJSHeapSize;
                info.jsHeapSizeLimit = performance.memory.jsHeapSizeLimit;
            }
        } catch (error) {
            // performance.memory not available in all browsers
        }

        return info;
    }

    /**
     * Setup tracking for GEGL object creation/destruction
     * @private
     */
    _setupObjectTracking() {
        if (!this.trackObjects) return;

        // Hook into GeglBuffer creation
        const originalBufferConstructor = Module.GeglBuffer;
        if (originalBufferConstructor) {
            Module.GeglBuffer = function(...args) {
                const result = new originalBufferConstructor(...args);

                // Add profiler metadata to the created object
                result._profilerId = Date.now() + Math.random();
                result._profilerType = 'buffer';
                result._profilerSize = 0; // Will be estimated
                result._profilerCreated = performance.now();

                // Estimate buffer size
                if (args.length >= 2) {
                    const extent = args[0];
                    const format = args[1];
                    if (extent && typeof extent === 'object') {
                        const bytesPerPixel = 4; // Rough estimate for RGBA
                        result._profilerSize = extent.width * extent.height * bytesPerPixel;
                    }
                }

                this.objectCounts.buffers++;
                this.allocationHistory.push({
                    type: 'buffer',
                    id: result._profilerId,
                    size: result._profilerSize,
                    timestamp: result._profilerCreated,
                    action: 'create'
                });

                // Register for destruction tracking
                if (this.finalizationRegistry) {
                    this.finalizationRegistry.register(result, {
                        type: 'buffer',
                        id: result._profilerId,
                        size: result._profilerSize,
                        created: result._profilerCreated
                    }, result); // Use object as token
                }

                return result;
            }.bind(this);
        }

        // Hook into GeglNode creation
        const originalNodeConstructor = Module.GeglNode;
        if (originalNodeConstructor) {
            Module.GeglNode = function(...args) {
                const result = new originalNodeConstructor(...args);

                // Add profiler metadata to the created object
                result._profilerId = Date.now() + Math.random();
                result._profilerType = 'node';
                result._profilerSize = 256; // Rough estimate
                result._profilerCreated = performance.now();

                this.objectCounts.nodes++;
                this.allocationHistory.push({
                    type: 'node',
                    id: result._profilerId,
                    size: result._profilerSize,
                    timestamp: result._profilerCreated,
                    action: 'create'
                });

                // Register for destruction tracking
                if (this.finalizationRegistry) {
                    this.finalizationRegistry.register(result, {
                        type: 'node',
                        id: result._profilerId,
                        size: result._profilerSize,
                        created: result._profilerCreated
                    }, result);
                }

                return result;
            }.bind(this);
        }

        // Hook into GeglProcessor creation
        const originalProcessorConstructor = Module.GeglProcessor;
        if (originalProcessorConstructor) {
            Module.GeglProcessor = function(...args) {
                const result = new originalProcessorConstructor(...args);

                // Add profiler metadata to the created object
                result._profilerId = Date.now() + Math.random();
                result._profilerType = 'processor';
                result._profilerSize = 512; // Rough estimate
                result._profilerCreated = performance.now();

                this.objectCounts.processors++;
                this.allocationHistory.push({
                    type: 'processor',
                    id: result._profilerId,
                    size: result._profilerSize,
                    timestamp: result._profilerCreated,
                    action: 'create'
                });

                // Register for destruction tracking
                if (this.finalizationRegistry) {
                    this.finalizationRegistry.register(result, {
                        type: 'processor',
                        id: result._profilerId,
                        size: result._profilerSize,
                        created: result._profilerCreated
                    }, result);
                }

                return result;
            }.bind(this);
        }

        // Hook into GeglColor creation
        const originalColorConstructor = Module.GeglColor;
        if (originalColorConstructor) {
            Module.GeglColor = function(...args) {
                const result = new originalColorConstructor(...args);

                // Add profiler metadata to the created object
                result._profilerId = Date.now() + Math.random();
                result._profilerType = 'color';
                result._profilerSize = 64; // Rough estimate
                result._profilerCreated = performance.now();

                this.objectCounts.colors++;
                this.allocationHistory.push({
                    type: 'color',
                    id: result._profilerId,
                    size: result._profilerSize,
                    timestamp: result._profilerCreated,
                    action: 'create'
                });

                // Register for destruction tracking
                if (this.finalizationRegistry) {
                    this.finalizationRegistry.register(result, {
                        type: 'color',
                        id: result._profilerId,
                        size: result._profilerSize,
                        created: result._profilerCreated
                    }, result);
                }

                return result;
            }.bind(this);
        }
    }

    /**
     * Generate profiling summary
     * @private
     */
    _generateSummary() {
        if (this.snapshots.length < 2) {
            return { message: 'Not enough data for summary' };
        }

        const first = this.snapshots[0];
        const last = this.snapshots[this.snapshots.length - 1];

        const summary = {
            duration: last.elapsed - first.elapsed,
            totalSamples: this.snapshots.length,
            averageMemoryGrowth: 0,
            peakMemoryUsage: 0,
            totalAllocations: this.allocationHistory.length,
            objectCounts: { ...last.objectCounts }
        };

        // Calculate average memory growth
        let totalGrowth = 0;
        for (let i = 1; i < this.snapshots.length; i++) {
            const growth = this.snapshots[i].wasmMemory.heapSize - this.snapshots[i-1].wasmMemory.heapSize;
            totalGrowth += growth;
        }
        summary.averageMemoryGrowth = totalGrowth / (this.snapshots.length - 1);

        // Find peak memory usage
        summary.peakMemoryUsage = Math.max(...this.snapshots.map(s => s.wasmMemory.heapSize));

        return summary;
    }

    /**
     * Detect potential memory leaks
     * @private
     */
    _detectLeaks() {
        const leaks = [];

        if (this.snapshots.length < 5) {
            return leaks; // Need more data
        }

        const recent = this.snapshots.slice(-5);
        const first = recent[0];
        const last = recent[recent.length - 1];
        const allocStats = this.getAllocationStats();

        // Check for continuous memory growth
        const growthRate = (last.wasmMemory.heapSize - first.wasmMemory.heapSize) / recent.length;
        if (growthRate > 1024) { // Growing by more than 1KB per sample
            leaks.push({
                type: 'continuous_growth',
                severity: 'warning',
                message: `Memory growing continuously at ${growthRate.toFixed(2)} bytes per sample`,
                details: {
                    growthRate,
                    period: recent.length,
                    totalGrowth: last.wasmMemory.heapSize - first.wasmMemory.heapSize
                }
            });
        }

        // Check for increasing object counts without cleanup
        const objectGrowth = {
            buffers: last.objectCounts.buffers - first.objectCounts.buffers,
            nodes: last.objectCounts.nodes - first.objectCounts.nodes,
            processors: last.objectCounts.processors - first.objectCounts.processors,
            colors: last.objectCounts.colors - first.objectCounts.colors
        };

        Object.entries(objectGrowth).forEach(([type, growth]) => {
            if (growth > 0) {
                leaks.push({
                    type: 'object_leak',
                    severity: 'warning',
                    message: `${type} count increased by ${growth} without cleanup`,
                    details: {
                        objectType: type,
                        growth,
                        currentCount: last.objectCounts[type],
                        totalCreated: allocStats.totalCreated[type],
                        totalDestroyed: allocStats.totalDestroyed[type]
                    }
                });
            }
        });

        // Check for objects that are created but never destroyed
        Object.entries(allocStats.totalCreated).forEach(([type, created]) => {
            const destroyed = allocStats.totalDestroyed[type];
            const active = allocStats.activeObjects[type];
            const leaked = created - destroyed - active;

            if (leaked > 0) {
                leaks.push({
                    type: 'undestroyed_objects',
                    severity: 'error',
                    message: `${leaked} ${type} objects were created but never destroyed`,
                    details: {
                        objectType: type,
                        created,
                        destroyed,
                        active,
                        leaked
                    }
                });
            }
        });

        // Check for unusually long object lifetimes
        Object.entries(allocStats.averageLifetime).forEach(([type, avgLifetime]) => {
            if (avgLifetime > 30000) { // 30 seconds
                leaks.push({
                    type: 'long_lifetime',
                    severity: 'info',
                    message: `${type} objects have unusually long average lifetime: ${(avgLifetime / 1000).toFixed(1)}s`,
                    details: {
                        objectType: type,
                        averageLifetime: avgLifetime,
                        threshold: 30000
                    }
                });
            }
        });

        return leaks;
    }

    /**
     * Export profiling data as JSON
     * @returns {string} JSON string
     */
    exportData() {
        return JSON.stringify({
            snapshots: this.snapshots,
            summary: this._generateSummary(),
            leaks: this._detectLeaks(),
            allocationStats: this.getAllocationStats(),
            metadata: {
                startTime: this.startTime,
                isProfiling: this.isProfiling,
                sampleInterval: this.sampleInterval,
                finalizationRegistrySupported: typeof FinalizationRegistry !== 'undefined'
            }
        }, null, 2);
    }

    /**
     * Manually trigger garbage collection (for testing/debugging)
     * Note: This may not be available in all browsers
     */
    triggerGC() {
        if (typeof window !== 'undefined' && window.gc) {
            window.gc();
            console.log('Manual garbage collection triggered');
        } else {
            console.warn('Manual GC not available in this environment');
        }
    }

    /**
     * Get detailed allocation statistics
     * @returns {Object} Allocation statistics
     */
    getAllocationStats() {
        const stats = {
            totalCreated: {
                buffers: 0,
                nodes: 0,
                processors: 0,
                colors: 0
            },
            totalDestroyed: {
                buffers: 0,
                nodes: 0,
                processors: 0,
                colors: 0
            },
            averageLifetime: {
                buffers: 0,
                nodes: 0,
                processors: 0,
                colors: 0
            },
            activeObjects: { ...this.objectCounts }
        };

        // Calculate stats from allocation history
        const lifetimes = {
            buffers: [],
            nodes: [],
            processors: [],
            colors: []
        };

        this.allocationHistory.forEach(entry => {
            if (entry.action === 'create') {
                stats.totalCreated[entry.type + 's']++;
            } else if (entry.action === 'destroy') {
                stats.totalDestroyed[entry.type + 's']++;
                lifetimes[entry.type + 's'].push(entry.lifetime);
            }
        });

        // Calculate average lifetimes
        Object.keys(lifetimes).forEach(type => {
            const typeLifetimes = lifetimes[type];
            if (typeLifetimes.length > 0) {
                stats.averageLifetime[type] = typeLifetimes.reduce((sum, lt) => sum + lt, 0) / typeLifetimes.length;
            }
        });

        return stats;
    }

    /**
     * Clear all profiling data
     */
    clear() {
        this.snapshots = [];
        this.allocationHistory = [];
        this.objectCounts = {
            buffers: 0,
            nodes: 0,
            processors: 0,
            colors: 0
        };
        this.startTime = null;
    }
}

// Global instance
const memoryProfiler = new MemoryProfiler();

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MemoryProfiler, memoryProfiler };
} else if (typeof window !== 'undefined') {
    window.MemoryProfiler = MemoryProfiler;
    window.memoryProfiler = memoryProfiler;
}