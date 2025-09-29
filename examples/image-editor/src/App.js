import React, { useState, useRef, useEffect, useCallback } from 'react';
import Canvas from './components/Canvas';
import LayerPanel from './components/LayerPanel';
import ToolPanel from './components/ToolPanel';
import { Layer } from './utils/Layer';
import { createCompositeOperations, createBlurOperation, createBrightnessContrastOperation, createHueSaturationOperation, createLevelsOperation } from './utils/compositing';

function App() {
  const [layers, setLayers] = useState([]);
  const [selectedLayerId, setSelectedLayerId] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [currentTool, setCurrentTool] = useState('brush');
  const [brushSettings, setBrushSettings] = useState({
    size: 10,
    hardness: 1.0,
    opacity: 1.0,
    color: '#000000'
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Ready');

  // History for undo/redo
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [maxHistorySize] = useState(50);

  const canvasRef = useRef(null);
  const geglWorkerRef = useRef(null);

  // Initialize GEGL worker
  useEffect(() => {
    const initWorker = async () => {
      try {
        setStatusMessage('Initializing GEGL...');
         geglWorkerRef.current = new window.GeglWorker('../../dist/gegl-wasm-core.js');
        await geglWorkerRef.current.init();
        setStatusMessage('GEGL initialized successfully');
      } catch (error) {
        console.error('Failed to initialize GEGL:', error);
        setStatusMessage('Failed to initialize GEGL');
      }
    };

    if (window.GeglWorker) {
      initWorker();
    } else {
      setStatusMessage('GEGL worker not loaded');
    }

    return () => {
      if (geglWorkerRef.current) {
        geglWorkerRef.current.cleanup();
      }
    };
  }, []);

  // Create new layer
  const createNewLayer = useCallback((name = 'New Layer') => {
    const newLayer = new Layer(name, canvasSize.width, canvasSize.height);
    setLayers(prev => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
    return newLayer;
  }, [canvasSize]);

  // Load image as new layer
  const loadImageAsLayer = useCallback(async (file) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const layer = new Layer(file.name, img.width, img.height);
        layer.setImageData(imageData);

        setLayers(prev => [...prev, layer]);
        setSelectedLayerId(layer.id);
        setCanvasSize({ width: img.width, height: img.height });

        resolve(layer);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }, []);

  // Update canvas with composited layers
  const updateCanvas = useCallback(async () => {
    if (!canvasRef.current || layers.length === 0) return;

    setIsProcessing(true);
    setStatusMessage('Compositing layers...');

    try {
      const visibleLayers = layers.filter(layer => layer.visible && layer.hasContent());

      if (visibleLayers.length === 0) {
        // Clear canvas
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
        setStatusMessage('No visible layers');
        return;
      }

      if (!geglWorkerRef.current) {
        // Fallback to simple compositing if GEGL not available
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

        for (const layer of visibleLayers) {
          const imageData = await layer.getProcessedImageData();
          if (imageData) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = imageData.width;
            tempCanvas.height = imageData.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.putImageData(imageData, 0, 0);

            ctx.globalAlpha = layer.opacity;
            ctx.drawImage(tempCanvas, 0, 0);
            ctx.globalAlpha = 1.0;
          }
        }
        setStatusMessage('Canvas updated (fallback mode)');
        return;
      }

      // Use GEGL for proper compositing
      const compositeOperations = [];

      // Start with transparent background
      compositeOperations.push({
        operation: 'gegl:color',
        properties: {
          value: { r: 0, g: 0, b: 0, a: 0 }
        }
      });

      // Add each visible layer
      for (const layer of visibleLayers) {
        const processedData = await layer.getProcessedImageData(geglWorkerRef.current);
        if (processedData) {
          // Create buffer source for this layer
          compositeOperations.push({
            operation: 'gegl:buffer-source',
            properties: {
              buffer: processedData
            }
          });

          // Apply opacity if not 1.0
          if (layer.opacity < 1.0) {
            compositeOperations.push({
              operation: 'gegl:opacity',
              properties: {
                value: layer.opacity
              }
            });
          }

          // Apply blend mode (default to over for now)
          compositeOperations.push({
            operation: 'gegl:over'
          });
        }
      }

      // Process the composite
      const result = await geglWorkerRef.current.process(
        { width: canvasSize.width, height: canvasSize.height, data: new Uint8ClampedArray(canvasSize.width * canvasSize.height * 4) },
        compositeOperations
      );

      // Draw result to canvas
      const ctx = canvasRef.current.getContext('2d');
      const resultImageData = new ImageData(result.data, result.width, result.height);
      ctx.putImageData(resultImageData, 0, 0);

      setStatusMessage('Canvas updated with GEGL compositing');
    } catch (error) {
      console.error('Failed to update canvas:', error);
      setStatusMessage('Failed to update canvas');
    } finally {
      setIsProcessing(false);
    }
  }, [layers, canvasSize]);

  // History management
  const saveToHistory = useCallback(() => {
    const state = {
      layers: layers.map(layer => layer.export()),
      canvasSize
    };

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(state);

    if (newHistory.length > maxHistorySize) {
      newHistory.shift();
    } else {
      setHistoryIndex(historyIndex + 1);
    }

    setHistory(newHistory);
  }, [layers, canvasSize, history, historyIndex, maxHistorySize]);

  // Initialize history with empty state
  useEffect(() => {
    if (history.length === 0) {
      saveToHistory();
    }
  }, [saveToHistory, history.length]);

  // Update canvas when layers change
  useEffect(() => {
    updateCanvas();
  }, [updateCanvas]);

  // Handle layer selection
  const selectLayer = useCallback((layerId) => {
    setSelectedLayerId(layerId);
  }, []);

  // Handle layer property changes
  const updateLayerProperties = useCallback((layerId, properties) => {
    setLayers(prev => prev.map(layer => {
      if (layer.id === layerId) {
        layer.setProperties(properties);
        return layer;
      }
      return layer;
    }));
    saveToHistory();
  }, [saveToHistory]);

  // Handle layer reordering
  const reorderLayers = useCallback((fromIndex, toIndex) => {
    setLayers(prev => {
      const newLayers = [...prev];
      const [moved] = newLayers.splice(fromIndex, 1);
      newLayers.splice(toIndex, 0, moved);
      return newLayers;
    });
    saveToHistory();
  }, [saveToHistory]);

  // Handle layer deletion
  const deleteLayer = useCallback((layerId) => {
    setLayers(prev => {
      const newLayers = prev.filter(layer => layer.id !== layerId);
      if (selectedLayerId === layerId) {
        setSelectedLayerId(newLayers.length > 0 ? newLayers[0].id : null);
      }
      return newLayers;
    });
    saveToHistory();
  }, [selectedLayerId, saveToHistory]);

  // Handle canvas drawing (brush and eraser tools)
  const handleCanvasDraw = useCallback((x, y, pressure = 1.0) => {
    if (!selectedLayerId || (currentTool !== 'brush' && currentTool !== 'eraser')) return;

    const selectedLayer = layers.find(layer => layer.id === selectedLayerId);
    if (!selectedLayer) return;

    // Draw on the layer
    const color = currentTool === 'eraser' ? '#00000000' : brushSettings.color; // Transparent for eraser
    selectedLayer.drawBrush(
      x, y,
      brushSettings.size,
      brushSettings.hardness,
      brushSettings.opacity * pressure,
      color
    );

    // Trigger canvas update
    setLayers([...layers]);
    saveToHistory();
  }, [selectedLayerId, currentTool, layers, brushSettings, saveToHistory]);

  // Handle filter application
  const handleApplyFilter = useCallback((filterType) => {
    if (!selectedLayerId) return;

    const selectedLayer = layers.find(layer => layer.id === selectedLayerId);
    if (!selectedLayer || !selectedLayer.hasContent()) return;

    let operation;
    switch (filterType) {
      case 'blur':
        operation = createBlurOperation(3.0);
        break;
      case 'brightness':
        operation = createBrightnessContrastOperation(0.2, 0.0);
        break;
      case 'contrast':
        operation = createBrightnessContrastOperation(0.0, 0.2);
        break;
      case 'saturation':
        operation = createHueSaturationOperation(0.0, 0.2, 0.0);
        break;
      case 'hue':
        operation = createHueSaturationOperation(0.2, 0.0, 0.0);
        break;
      case 'levels':
        operation = createLevelsOperation(0.1, 0.9, 0.0, 1.0);
        break;
      case 'sharpen':
        operation = {
          operation: 'gegl:unsharp-mask',
          properties: {
            std_dev: 1.0,
            scale: 1.0
          }
        };
        break;
      default:
        return;
    }

    selectedLayer.addOperation(operation);
    setLayers([...layers]); // Trigger re-render
    saveToHistory();
  }, [selectedLayerId, layers]);

  const restoreFromHistory = useCallback((state) => {
    const restoredLayers = state.layers.map(layerData => Layer.import(layerData));
    setLayers(restoredLayers);
    setCanvasSize(state.canvasSize);

    // Update selected layer if it still exists
    if (selectedLayerId && !restoredLayers.find(l => l.id === selectedLayerId)) {
      setSelectedLayerId(restoredLayers.length > 0 ? restoredLayers[0].id : null);
    }
  }, [selectedLayerId]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      restoreFromHistory(history[newIndex]);
      setStatusMessage('Undid last action');
    }
  }, [history, historyIndex, restoreFromHistory]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      restoreFromHistory(history[newIndex]);
      setStatusMessage('Redid last action');
    }
  }, [history, historyIndex, restoreFromHistory]);

  // Export functionality
  const exportImage = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = 'gegl-image-editor-export.png';
    link.href = canvas.toDataURL('image/png');
    link.click();

    setStatusMessage('Image exported successfully');
  }, []);

  // Handle file drop
  const handleFileDrop = useCallback(async (files) => {
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        try {
          setStatusMessage(`Loading ${file.name}...`);
          await loadImageAsLayer(file);
          saveToHistory();
          setStatusMessage('Image loaded successfully');
        } catch (error) {
          console.error('Failed to load image:', error);
          setStatusMessage('Failed to load image');
        }
      }
    }
  }, [loadImageAsLayer, saveToHistory]);

  return (
    <div className="app">
      <ToolPanel
        currentTool={currentTool}
        onToolChange={setCurrentTool}
        brushSettings={brushSettings}
        onBrushSettingsChange={setBrushSettings}
        onNewLayer={createNewLayer}
        onFileDrop={handleFileDrop}
        onApplyFilter={handleApplyFilter}
        onUndo={undo}
        onRedo={redo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onExport={exportImage}
      />

      <div className="main-content">
        <Canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          onDraw={handleCanvasDraw}
          tool={currentTool}
          brushSettings={brushSettings}
        />

        <div className="properties-panel">
          {/* Properties panel content would go here */}
          <div>Selected Tool: {currentTool}</div>
          <div>Canvas: {canvasSize.width} × {canvasSize.height}</div>
          <div>Layers: {layers.length}</div>
        </div>
      </div>

      <LayerPanel
        layers={layers}
        selectedLayerId={selectedLayerId}
        onLayerSelect={selectLayer}
        onLayerUpdate={updateLayerProperties}
        onLayerReorder={reorderLayers}
        onLayerDelete={deleteLayer}
      />

      <div className="status-bar">
        {statusMessage}
        {isProcessing && ' (Processing...)'}
      </div>
    </div>
  );
}

export default App;