/**
 * Tests for Layer class
 */

import { Layer } from './Layer';

// Mock ImageData for tests
global.ImageData = class ImageData {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
  }
};

describe('Layer', () => {
  let layer;

  beforeEach(() => {
    layer = new Layer('Test Layer', 100, 200);
  });

  test('should create layer with correct properties', () => {
    expect(layer.name).toBe('Test Layer');
    expect(layer.width).toBe(100);
    expect(layer.height).toBe(200);
    expect(layer.visible).toBe(true);
    expect(layer.opacity).toBe(1.0);
    expect(layer.blendMode).toBe('normal');
    expect(layer.operations).toEqual([]);
  });

  test('should set and get image data', async () => {
    const imageData = new ImageData(100, 200);
    layer.setImageData(imageData);

    expect(layer.hasContent()).toBe(true);
    const processed = await layer.getProcessedImageData();
    expect(processed).toBeDefined();
    expect(processed.width).toBe(100);
    expect(processed.height).toBe(200);
  });

  test('should add and remove operations', () => {
    const operation = { operation: 'gegl:blur-gaussian', properties: { std_dev_x: 5.0 } };

    layer.addOperation(operation);
    expect(layer.operations).toHaveLength(1);
    expect(layer.operations[0]).toBe(operation);

    layer.removeOperation(0);
    expect(layer.operations).toHaveLength(0);
  });

  test('should update layer properties', () => {
    layer.setProperties({ visible: false, opacity: 0.5, name: 'Updated Layer' });

    expect(layer.visible).toBe(false);
    expect(layer.opacity).toBe(0.5);
    expect(layer.name).toBe('Updated Layer');
  });

  test('should export and import layer data', () => {
    const imageData = new ImageData(100, 200);
    layer.setImageData(imageData);
    layer.addOperation({ operation: 'gegl:blur-gaussian', properties: { std_dev_x: 2.0 } });

    const exported = layer.export();
    const imported = Layer.import(exported);

    expect(imported.name).toBe(layer.name);
    expect(imported.width).toBe(layer.width);
    expect(imported.height).toBe(layer.height);
    expect(imported.operations).toEqual(layer.operations);
  });

  test('should clone layer', () => {
    const imageData = new ImageData(100, 200);
    layer.setImageData(imageData);
    layer.addOperation({ operation: 'gegl:blur-gaussian', properties: { std_dev_x: 2.0 } });

    const cloned = layer.clone();

    expect(cloned.name).toBe('Test Layer Copy');
    expect(cloned.width).toBe(layer.width);
    expect(cloned.height).toBe(layer.height);
    expect(cloned.operations).toEqual(layer.operations);
  });
});