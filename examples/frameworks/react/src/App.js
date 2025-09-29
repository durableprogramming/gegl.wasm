import React, { useState, useRef, useEffect } from 'react';
import './App.css';

function App() {
  const [imageData, setImageData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState('Ready');
  const [geglWorker, setGeglWorker] = useState(null);

  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Initialize GEGL worker
  useEffect(() => {
    const initWorker = async () => {
      try {
        setStatus('Initializing GEGL...');
        const worker = new window.GeglWorker('../../../build-wasm-prod/gegl.js');
        await worker.init();
        setGeglWorker(worker);
        setStatus('GEGL initialized successfully');
      } catch (error) {
        console.error('Failed to initialize GEGL:', error);
        setStatus('Failed to initialize GEGL');
      }
    };

    if (window.GeglWorker) {
      initWorker();
    } else {
      setStatus('GEGL worker not loaded');
    }

    return () => {
      if (geglWorker) {
        geglWorker.cleanup();
      }
    };
  }, []);

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setStatus('Loading image...');

      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
      });

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imgData = ctx.getImageData(0, 0, img.width, img.height);
      setImageData(imgData);
      setStatus('Image loaded successfully');

      URL.revokeObjectURL(img.src);

    } catch (error) {
      console.error('Failed to load image:', error);
      setStatus('Failed to load image');
    }
  };

  const applyBlur = async () => {
    if (!imageData || !geglWorker) return;

    try {
      setIsProcessing(true);
      setStatus('Applying blur effect...');

      const operations = [{
        operation: 'gegl:blur-gaussian',
        properties: {
          std_dev_x: 5.0,
          std_dev_y: 5.0
        }
      }];

      const result = await geglWorker.process(imageData, operations);

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const processedImageData = new ImageData(
        new Uint8ClampedArray(result.data),
        result.width,
        result.height
      );
      ctx.putImageData(processedImageData, 0, 0);

      setStatus('Blur effect applied successfully');

    } catch (error) {
      console.error('Failed to apply blur:', error);
      setStatus('Failed to apply blur effect');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetImage = () => {
    if (imageData) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.putImageData(imageData, 0, 0);
      setStatus('Image reset to original');
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>GEGL.wasm React Example</h1>
      </header>

      <main className="app-main">
        <div className="file-input-section">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <button
            className="file-button"
            onClick={() => fileInputRef.current.click()}
          >
            Select Image
          </button>
        </div>

        <div className="canvas-section">
          <canvas ref={canvasRef} className="image-canvas" />
        </div>

        <div className="controls-section">
          <button
            onClick={applyBlur}
            disabled={!imageData || isProcessing || !geglWorker}
            className="control-button"
          >
            {isProcessing ? 'Processing...' : 'Apply Blur'}
          </button>
          <button
            onClick={resetImage}
            disabled={!imageData}
            className="control-button"
          >
            Reset
          </button>
        </div>

        <div className="status-section">
          <p>{status}</p>
        </div>
      </main>
    </div>
  );
}

export default App;