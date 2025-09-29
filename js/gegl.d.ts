/**
 * TypeScript definitions for GEGL WebAssembly bindings
 * Provides comprehensive type definitions for all exposed GEGL functionality
 * and browser integration APIs.
 */

declare global {
  /**
   * Emscripten Module interface for GEGL WebAssembly
   */
  interface EmscriptenModule {
    initializeGegl(): void;
    cleanupGegl(): void;
    gegl_node_new(): GeglNodeWrapper;

    GeglRectangle: {
      new(x?: number, y?: number, width?: number, height?: number): GeglRectangleWrapper;
    };

    GeglColor: {
      new(colorString?: string): GeglColorWrapper;
    };

    GeglBuffer: {
      new(extent: GeglRectangleWrapper, format: string): GeglBufferWrapper;
      new(path: string): GeglBufferWrapper;
    };

    GeglNode: {
      new(parent: GeglNodeWrapper | null, operation: string): GeglNodeWrapper;
    };

    GeglProcessor: {
      new(node: GeglNodeWrapper, rectangle: GeglRectangleWrapper): GeglProcessorWrapper;
    };
  }

  const Module: EmscriptenModule;
}

/**
 * Rectangle structure used throughout GEGL
 */
export interface GeglRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Color representation in GEGL
 */
export interface GeglColor {
  /** Red component (0.0 to 1.0) */
  r: number;
  /** Green component (0.0 to 1.0) */
  g: number;
  /** Blue component (0.0 to 1.0) */
  b: number;
  /** Alpha component (0.0 to 1.0) */
  a: number;
}

/**
 * Color input types accepted by GEGL
 */
export type GeglColorInput = string | GeglColor;

/**
 * Pixel format strings supported by GEGL
 */
export type GeglPixelFormat =
  | 'RGBA u8'
  | 'RGB u8'
  | 'RGBA float'
  | 'RGB float'
  | 'R u8'
  | 'R float'
  | 'YA u8'
  | 'YA float'
  | string; // Allow custom formats

/**
 * Abyss handling modes for buffer operations
 */
export enum GeglAbyssPolicy {
  NONE = 0,
  CLAMP = 1,
  LOOP = 2,
  BLACK = 3,
  WHITE = 4
}

/**
 * Error class for GEGL operations
 */
export declare class GeglError extends Error {
  constructor(message: string, code?: number | null);
  name: 'GeglError';
  code: number | null;
}

/**
 * GEGL Buffer class for raster data storage and manipulation
 */
export declare class GeglBuffer {
  /**
   * Create a new buffer
   * @param extent - Rectangle defining buffer dimensions {x, y, width, height}
   * @param format - Pixel format (e.g., 'RGBA u8', 'RGB u8')
   */
  constructor(extent: GeglRectangle, format?: GeglPixelFormat);

  /**
   * Create buffer from file
   * @param path - File path to load buffer from
   * @returns New GeglBuffer instance
   */
  static fromFile(path: string): GeglBuffer;

  /**
   * Set pixel data in the buffer
   * @param rect - Rectangle to set pixels in
   * @param format - Pixel format of the data
   * @param data - Pixel data as Uint8Array
   * @param rowstride - Row stride in bytes (0 for auto-calculation)
   */
  setPixels(rect: GeglRectangle, format: GeglPixelFormat, data: Uint8Array, rowstride?: number): void;

  /**
   * Get pixel data from the buffer
   * @param rect - Rectangle to get pixels from
   * @param format - Desired pixel format
   * @param rowstride - Row stride in bytes (0 for auto-calculation)
   * @returns Pixel data as Uint8Array
   */
  getPixels(rect: GeglRectangle, format: GeglPixelFormat, rowstride?: number): Uint8Array;

  /**
   * Get buffer extent (dimensions)
   * @returns Rectangle defining buffer bounds
   */
  getExtent(): GeglRectangle;

  /**
   * Get buffer pixel format
   * @returns Format name string
   */
  getFormat(): string;

  /**
   * Save buffer to file
   * @param path - File path to save to
   * @param roi - Region of interest to save (optional, defaults to full extent)
   */
  save(path: string, roi?: GeglRectangle): void;

  /**
   * Flush buffer changes to storage
   */
  flush(): void;

  /**
   * Get internal GeglBuffer reference (for advanced usage)
   * @returns Internal buffer object
   */
  getInternal(): any;
}

/**
 * GEGL Node class for image processing operations
 */
export declare class GeglNode {
  /**
   * Create a new processing node
   * @param parent - Parent node (null for root nodes)
   * @param operation - Operation name (e.g., 'gegl:over', 'gegl:blur')
   */
  constructor(parent: GeglNode | null, operation: string);

  /**
   * Set a string property on the node
   * @param name - Property name
   * @param value - String value
   */
  setProperty(name: string, value: string): void;

  /**
   * Set a numeric property on the node
   * @param name - Property name
   * @param value - Numeric value
   */
  setNumberProperty(name: string, value: number): void;

  /**
   * Set a color property on the node
   * @param name - Property name
   * @param color - Color value (string or RGBA object)
   */
  setColorProperty(name: string, color: GeglColorInput): void;

  /**
   * Connect this node to another node
   * @param sink - Target node to connect to
   * @param inputPad - Input pad name on sink (default: 'input')
   * @param outputPad - Output pad name on source (default: 'output')
   */
  connectTo(sink: GeglNode, inputPad?: string, outputPad?: string): void;

  /**
   * Link this node to another node (automatic connection)
   * @param sink - Target node to link to
   */
  link(sink: GeglNode): void;

  /**
   * Process this node
   */
  process(): void;

  /**
   * Get bounding box of this node's output
   * @returns Rectangle defining the bounding box
   */
  getBoundingBox(): GeglRectangle;

  /**
   * Blit node output to a buffer
   * @param buffer - Target buffer
   * @param roi - Region of interest
   * @param level - Mipmap level
   */
  blitToBuffer(buffer: GeglBuffer, roi: GeglRectangle, level?: number): void;

  /**
   * Get operation name
   * @returns Operation name string
   */
  getOperation(): string;

  /**
   * Get internal GeglNode reference (for advanced usage)
   * @returns Internal node object
   */
  getInternal(): any;
}

/**
 * GEGL Graph class for managing node collections
 */
export declare class GeglGraph {
  /**
   * Create a new graph
   */
  constructor();

  /**
   * Create a new node in this graph
   * @param operation - Operation name for the node
   * @returns New GeglNode instance
   */
  createNode(operation: string): GeglNode;

  /**
   * Get all nodes in the graph
   * @returns Array of nodes in the graph
   */
  getNodes(): GeglNode[];

  /**
   * Process the entire graph
   * @param outputNode - Specific node to process (optional, processes all if not specified)
   */
  process(outputNode?: GeglNode): void;

  /**
   * Get root node of the graph
   * @returns Root node object
   */
  getRoot(): any;

  /**
   * Clean up the graph and destroy all nodes
   */
  destroy(): void;
}

/**
 * Main GEGL management class
 */
export declare class Gegl {
  /**
   * Initialize GEGL
   * Must be called before using any GEGL functionality
   */
  static init(): void;

  /**
   * Clean up GEGL resources
   */
  static exit(): void;

  /**
   * Check if GEGL is initialized
   * @returns True if GEGL is initialized
   */
  static isInitialized(): boolean;

  /**
   * Create a new graph
   * @returns New GeglGraph instance
   */
  static createGraph(): GeglGraph;

  /**
   * Create a new buffer
   * @param extent - Rectangle defining buffer dimensions
   * @param format - Pixel format
   * @returns New GeglBuffer instance
   */
  static createBuffer(extent: GeglRectangle, format?: GeglPixelFormat): GeglBuffer;

  /**
   * Load buffer from file
   * @param path - File path
   * @returns New GeglBuffer instance
   */
  static loadBuffer(path: string): GeglBuffer;
}

/**
 * Internal wrapper classes (exposed through Module)
 * These are typically not used directly in user code
 */

export interface GeglRectangleWrapper {
  x: number;
  y: number;
  width: number;
  height: number;
  getX(): number;
  getY(): number;
  getWidth(): number;
  getHeight(): number;
  setX(x: number): void;
  setY(y: number): void;
  setWidth(width: number): void;
  setHeight(height: number): void;
  toString(): string;
}

export interface GeglColorWrapper {
  setRgba(r: number, g: number, b: number, a: number): void;
  getRgba(): number[];
  setPixel(format: string, pixelData: Uint8Array): void;
  getPixel(format: string): Uint8Array;
}

export interface GeglBufferWrapper {
  set(rect: GeglRectangleWrapper, format: string, data: Uint8Array, rowstride?: number): void;
  get(rect: GeglRectangleWrapper, format: string, rowstride?: number): Uint8Array;
  getExtent(): GeglRectangleWrapper;
  getFormat(): string;
  save(path: string, roi: GeglRectangleWrapper): void;
  flush(): void;
}

export interface GeglNodeWrapper {
  setProperty(name: string, value: string): void;
  setProperty(name: string, value: number): void;
  setProperty(name: string, color: GeglColorWrapper): void;
  connectTo(sink: GeglNodeWrapper, inputPad: string, outputPad: string): void;
  link(sink: GeglNodeWrapper): void;
  process(): void;
  getBoundingBox(): GeglRectangleWrapper;
  blitBuffer(dstBuffer: GeglBufferWrapper, roi: GeglRectangleWrapper, level?: number): void;
}

export interface GeglProcessorWrapper {
  work(progress: number[]): boolean;
  getBuffer(): GeglBufferWrapper;
}

/**
 * Canvas utilities for browser integration
 */

/**
 * Error class for canvas utilities
 */
export declare class CanvasUtilsError extends Error {
  constructor(message: string);
  name: 'CanvasUtilsError';
}

/**
 * Canvas utilities namespace
 */
export declare namespace CanvasUtils {
  /**
   * Convert Canvas ImageData to GEGL buffer
   * @param imageData - Canvas ImageData object
   * @param buffer - Optional existing buffer to reuse (must match dimensions)
   * @returns GEGL buffer containing the image data
   */
  function imageDataToGeglBuffer(imageData: ImageData, buffer?: GeglBuffer): GeglBuffer;

  /**
   * Convert GEGL buffer to Canvas ImageData
   * @param buffer - GEGL buffer to convert
   * @param rect - Optional rectangle to extract {x, y, width, height}
   * @returns Canvas ImageData object
   */
  function geglBufferToImageData(buffer: GeglBuffer, rect?: GeglRectangle): ImageData;

  /**
   * Convert HTML Canvas element to GEGL buffer
   * @param canvas - Canvas element to convert
   * @param buffer - Optional existing buffer to reuse
   * @returns GEGL buffer containing the canvas data
   */
  function canvasToGeglBuffer(canvas: HTMLCanvasElement, buffer?: GeglBuffer): GeglBuffer;

  /**
   * Render GEGL buffer to HTML Canvas element
   * @param buffer - GEGL buffer to render
   * @param canvas - Target canvas element
   * @param rect - Optional rectangle to render {x, y, width, height}
   */
  function geglBufferToCanvas(buffer: GeglBuffer, canvas: HTMLCanvasElement, rect?: GeglRectangle): void;

  /**
   * Create GEGL buffer from image URL (async)
   * @param url - Image URL to load
   * @returns Promise resolving to GEGL buffer
   */
  function loadImageToGeglBuffer(url: string): Promise<GeglBuffer>;

  /**
   * Copy pixels between GEGL buffers with format conversion
   * @param srcBuffer - Source buffer
   * @param dstBuffer - Destination buffer
   * @param srcRect - Source rectangle {x, y, width, height}
   * @param dstRect - Destination rectangle {x, y, width, height}
   * @param format - Pixel format for transfer (defaults to source format)
   */
  function copyBufferPixels(srcBuffer: GeglBuffer, dstBuffer: GeglBuffer, srcRect?: GeglRectangle, dstRect?: GeglRectangle, format?: GeglPixelFormat): void;

  /**
   * Create a copy of a GEGL buffer
   * @param buffer - Buffer to copy
   * @param format - Optional format for the copy (defaults to source format)
   * @returns New buffer with copied data
   */
  function copyGeglBuffer(buffer: GeglBuffer, format?: GeglPixelFormat): GeglBuffer;
}

/**
 * Feature detection utilities
 */

/**
 * Error class for feature detection
 */
export declare class FeatureDetectionError extends Error {
  constructor(message: string, feature?: string);
  name: 'FeatureDetectionError';
  feature: string | undefined;
}

/**
 * Feature support results
 */
export declare class FeatureSupport {
  constructor();

  webAssembly: boolean;
  webAssemblySIMD: boolean;
  webWorkers: boolean;
  sharedArrayBuffer: boolean;
  atomics: boolean;
  canvas2d: boolean;
  typedArrays: boolean;
  webGL: boolean;
  bigInt: boolean;
  asyncAwait: boolean;
  promises: boolean;

  fallbacks: {
    webAssembly: string | null;
    webWorkers: string | null;
    sharedArrayBuffer: string | null;
  };

  /**
   * Check if all required features are supported
   * @returns True if fully supported
   */
  isFullySupported(): boolean;

  /**
   * Check if basic WebAssembly support is available
   * @returns True if basic support available
   */
  hasBasicSupport(): boolean;

  /**
   * Get list of missing features
   * @returns Array of missing feature names
   */
  getMissingFeatures(): string[];

  /**
   * Get recommended fallback strategy
   * @returns Fallback strategy description
   */
  getFallbackStrategy(): string;
}

/**
 * Feature detection namespace
 */
export declare namespace GeglFeatureDetection {
  /**
   * Run comprehensive feature detection
   * @returns Promise resolving to FeatureSupport results
   */
  function detectFeatures(): Promise<FeatureSupport>;

  /**
   * Check if the current environment can run GEGL WebAssembly
   * @param options - Detection options
   * @returns Promise resolving to compatibility boolean
   */
  function isGeglCompatible(options?: {
    requireSIMD?: boolean;
    requireWebWorkers?: boolean;
    requireSharedArrayBuffer?: boolean;
  }): Promise<boolean>;

  /**
   * Get user-friendly error message for missing features
   * @param support - Feature support results
   * @returns Error message string
   */
  function getCompatibilityError(support: FeatureSupport): string | null;

  // Individual detector functions
  function detectWebAssembly(): boolean;
  function detectWebAssemblySIMD(): boolean;
  function detectWebWorkers(): boolean;
  function detectSharedArrayBuffer(): boolean;
  function detectAtomics(): boolean;
  function detectCanvas2D(): boolean;
  function detectTypedArrays(): boolean;
  function detectWebGL(): boolean;
  function detectBigInt(): boolean;
  function detectAsyncAwait(): boolean;
  function detectPromises(): boolean;
}

/**
 * GEGL Web Worker API for off-main-thread processing
 */

/**
 * Worker message types
 */
export declare const enum GeglWorkerMessageType {
  INIT = 'init',
  PROCESS = 'process',
  CANCEL = 'cancel',
  CLEANUP = 'cleanup'
}

/**
 * Worker response types
 */
export declare const enum GeglWorkerResponseType {
  READY = 'ready',
  PROGRESS = 'progress',
  RESULT = 'result',
  ERROR = 'error',
  CANCELLED = 'cancelled'
}

/**
 * Operation definition for worker processing
 */
export interface GeglWorkerOperation {
  /** Operation name (e.g., 'gegl:blur-gaussian') */
  operation: string;
  /** Operation properties */
  properties?: Record<string, string | number | GeglColorInput>;
}

/**
 * Image data format for worker communication
 */
export interface GeglWorkerImageData {
  /** Pixel data as ArrayBuffer */
  data: ArrayBuffer;
  /** Image width */
  width: number;
  /** Image height */
  height: number;
}

/**
 * Processing options for worker
 */
export interface GeglWorkerOptions {
  /** Pixel format (defaults to 'RGBA u8') */
  format?: GeglPixelFormat;
}

/**
 * Error class for worker operations
 */
export declare class GeglWorkerError extends Error {
  constructor(message: string, code?: string | null);
  name: 'GeglWorkerError';
  code: string | null;
}

/**
 * Web Worker wrapper for GEGL processing
 */
export declare class GeglWorker {
  /**
   * Create a new GEGL worker
   * @param wasmUrl - URL to the WebAssembly module (defaults to 'gegl.js')
   */
  constructor(wasmUrl?: string);

  /**
   * Initialize the worker
   * @returns Promise that resolves when worker is ready
   */
  init(): Promise<void>;

  /**
   * Process an image with GEGL operations
   * @param imageData - Image data to process
   * @param operations - Array of operations to apply
   * @param options - Processing options
   * @returns Promise resolving to processed image data
   */
  process(imageData: ImageData | GeglWorkerImageData, operations: GeglWorkerOperation[], options?: GeglWorkerOptions): Promise<GeglWorkerImageData>;

  /**
   * Cancel current processing operation
   */
  cancel(): void;

  /**
   * Clean up worker resources
   */
  cleanup(): void;

  /**
   * Set progress callback function
   * @param callback - Function called with progress (0-1)
   */
  setProgressCallback(callback: (progress: number) => void): void;
}

/**
 * Browser-specific extensions and utilities
 */
export interface GeglBrowserExtensions {
  /**
   * Load image from URL and create GEGL buffer
   * @param url - Image URL
   * @returns Promise resolving to GeglBuffer
   */
  loadImageFromUrl(url: string): Promise<GeglBuffer>;

  /**
   * Create buffer from ImageData
   * @param imageData - Browser ImageData object
   * @returns GeglBuffer
   */
  createBufferFromImageData(imageData: ImageData): GeglBuffer;

  /**
   * Convert buffer to ImageData
   * @param buffer - GEGL buffer
   * @param rect - Rectangle to convert (optional)
   * @returns Browser ImageData object
   */
  bufferToImageData(buffer: GeglBuffer, rect?: GeglRectangle): ImageData;

  /**
   * Create buffer from HTML Canvas
   * @param canvas - HTML Canvas element
   * @returns GeglBuffer
   */
  createBufferFromCanvas(canvas: HTMLCanvasElement): GeglBuffer;

  /**
   * Render buffer to HTML Canvas
   * @param buffer - GEGL buffer
   * @param canvas - Target canvas
   * @param rect - Rectangle to render (optional)
   */
  renderBufferToCanvas(buffer: GeglBuffer, canvas: HTMLCanvasElement, rect?: GeglRectangle): void;
}

/**
 * Extended GEGL class with browser integration
 */
export interface GeglExtended extends Gegl {
  browser: GeglBrowserExtensions;
}

/**
 * Export declarations for different module systems
 */
export { Gegl, GeglGraph, GeglNode, GeglBuffer, GeglError, GeglWorker, GeglWorkerError, CanvasUtilsError, FeatureDetectionError, FeatureSupport };
export default Gegl;