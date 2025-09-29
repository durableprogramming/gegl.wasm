import React, { useRef } from 'react';

const ToolPanel = ({
  currentTool,
  onToolChange,
  brushSettings,
  onBrushSettingsChange,
  onNewLayer,
  onFileDrop,
  onApplyFilter,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onExport
}) => {
  const fileInputRef = useRef(null);

  const tools = [
    { id: 'brush', name: 'Brush', icon: '🖌' },
    { id: 'eraser', name: 'Eraser', icon: '🧽' },
    { id: 'select', name: 'Select', icon: '⬜' },
    { id: 'move', name: 'Move', icon: '✋' },
    { id: 'fill', name: 'Fill', icon: '🪣' },
    { id: 'rectangle', name: 'Rectangle', icon: '▭' }
  ];

  const filters = [
    { id: 'blur', name: 'Blur', icon: '🌫' },
    { id: 'brightness', name: 'Brightness', icon: '☀' },
    { id: 'contrast', name: 'Contrast', icon: '🌓' },
    { id: 'saturation', name: 'Saturation', icon: '🌈' },
    { id: 'hue', name: 'Hue', icon: '🎨' },
    { id: 'levels', name: 'Levels', icon: '📊' },
    { id: 'sharpen', name: 'Sharpen', icon: '🔪' }
  ];

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      onFileDrop(files);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFileDrop(files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div className="toolbar">
      <button
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo"
      >
        ↶
      </button>

      <button
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo"
      >
        ↷
      </button>

      <div style={{ height: '20px' }} /> {/* Spacer */}

      {tools.map(tool => (
        <button
          key={tool.id}
          className={currentTool === tool.id ? 'active' : ''}
          onClick={() => onToolChange(tool.id)}
          title={tool.name}
        >
          {tool.icon}
        </button>
      ))}

      <div style={{ height: '20px' }} /> {/* Spacer */}

      <button
        onClick={() => onNewLayer()}
        title="New Layer"
      >
        ➕
      </button>

      <button
        onClick={() => fileInputRef.current?.click()}
        title="Open Image"
      >
        📁
      </button>

      <button
        onClick={onExport}
        title="Export Image"
      >
        💾
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      <div style={{ height: '20px' }} /> {/* Spacer */}

      {filters.map(filter => (
        <button
          key={filter.id}
          onClick={() => onApplyFilter && onApplyFilter(filter.id)}
          title={filter.name}
        >
          {filter.icon}
        </button>
      ))}

      {/* Brush settings when brush tool is selected */}
      {currentTool === 'brush' && (
        <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#555', borderRadius: '4px' }}>
          <div style={{ marginBottom: '10px', fontSize: '12px', color: '#ccc' }}>Brush Settings</div>

          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: '#ccc', marginBottom: '2px' }}>
              Size: {brushSettings.size}px
            </label>
            <input
              type="range"
              min="1"
              max="100"
              value={brushSettings.size}
              onChange={(e) => onBrushSettingsChange({
                ...brushSettings,
                size: parseInt(e.target.value)
              })}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: '#ccc', marginBottom: '2px' }}>
              Hardness: {Math.round(brushSettings.hardness * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={brushSettings.hardness}
              onChange={(e) => onBrushSettingsChange({
                ...brushSettings,
                hardness: parseFloat(e.target.value)
              })}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: '#ccc', marginBottom: '2px' }}>
              Opacity: {Math.round(brushSettings.opacity * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={brushSettings.opacity}
              onChange={(e) => onBrushSettingsChange({
                ...brushSettings,
                opacity: parseFloat(e.target.value)
              })}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#ccc', marginBottom: '2px' }}>
              Color
            </label>
            <input
              type="color"
              value={brushSettings.color}
              onChange={(e) => onBrushSettingsChange({
                ...brushSettings,
                color: e.target.value
              })}
              style={{ width: '100%', height: '24px', border: 'none', borderRadius: '2px' }}
            />
          </div>
        </div>
      )}

      {/* Drop zone hint */}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          left: '70px',
          right: '10px',
          bottom: '10px',
          border: '2px dashed #666',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          color: '#999',
          pointerEvents: 'none'
        }}
      >
        Drop images here
      </div>
    </div>
  );
};

export default ToolPanel;