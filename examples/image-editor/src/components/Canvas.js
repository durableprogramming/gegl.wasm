import React, { forwardRef, useRef, useEffect, useState } from 'react';

const Canvas = forwardRef(({
  width,
  height,
  onDraw,
  tool,
  brushSettings
}, ref) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

  // Forward ref to parent
  useEffect(() => {
    if (ref) {
      ref.current = canvasRef.current;
    }
  }, [ref]);

  // Handle mouse/touch events
  const getEventPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;
    if (e.touches && e.touches[0]) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    const pos = getEventPos(e);
    setIsDrawing(true);
    setLastPos(pos);

    if (tool === 'brush') {
      drawAt(pos.x, pos.y, 1.0);
    }
  };

  const handlePointerMove = (e) => {
    if (!isDrawing) return;
    e.preventDefault();

    const pos = getEventPos(e);
    const pressure = e.pressure || 1.0;

    if (tool === 'brush') {
      drawAt(pos.x, pos.y, pressure);
    }

    setLastPos(pos);
  };

  const handlePointerUp = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    setIsDrawing(false);
  };

  const drawAt = (x, y, pressure) => {
    if (onDraw) {
      onDraw(x, y, pressure);
    }

    // Drawing is now handled by the layer system
    // The canvas will be updated through the compositing process
  };

  // Set up event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointerleave', handlePointerUp);

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointerleave', handlePointerUp);
    };
  }, [isDrawing, tool, brushSettings, onDraw]);

  return (
    <div className="canvas-container">
      <div className="canvas-wrapper">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          style={{
            cursor: tool === 'brush' ? 'crosshair' : tool === 'eraser' ? 'none' : 'default'
          }}
        />
      </div>
    </div>
  );
});

Canvas.displayName = 'Canvas';

export default Canvas;