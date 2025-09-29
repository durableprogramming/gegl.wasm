import React, { useState, useEffect } from 'react';

const LayerPanel = ({
  layers,
  selectedLayerId,
  onLayerSelect,
  onLayerUpdate,
  onLayerReorder,
  onLayerDelete
}) => {
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [thumbnails, setThumbnails] = useState({});

  // Load thumbnails for layers
  useEffect(() => {
    const loadThumbnails = async () => {
      const newThumbnails = {};
      for (const layer of layers) {
        if (layer.hasContent()) {
          try {
            const thumbnail = await layer.getThumbnail();
            if (thumbnail) {
              newThumbnails[layer.id] = thumbnail;
            }
          } catch (error) {
            console.error('Failed to load thumbnail for layer', layer.id, error);
          }
        }
      }
      setThumbnails(newThumbnails);
    };

    loadThumbnails();
  }, [layers]);

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      onLayerReorder(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleVisibilityToggle = (layerId, visible) => {
    onLayerUpdate(layerId, { visible });
  };

  const handleOpacityChange = (layerId, opacity) => {
    onLayerUpdate(layerId, { opacity: parseFloat(opacity) });
  };

  const handleNameChange = (layerId, name) => {
    onLayerUpdate(layerId, { name });
  };

  return (
    <div className="layers-panel">
      <div className="layers-header">
        Layers
      </div>
      <div className="layers-list">
        {layers.map((layer, index) => (
          <div
            key={layer.id}
            className={`layer-item ${selectedLayerId === layer.id ? 'selected' : ''}`}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            onClick={() => onLayerSelect(layer.id)}
          >
            <div
              className="layer-visibility"
              onClick={(e) => {
                e.stopPropagation();
                handleVisibilityToggle(layer.id, !layer.visible);
              }}
            >
              {layer.visible ? '👁' : '🙈'}
            </div>

            <div className="layer-thumbnail">
              {thumbnails[layer.id] ? (
                <img
                  src={thumbnails[layer.id]}
                  alt="Layer thumbnail"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              ) : layer.hasContent() ? (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: '#ccc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    color: '#666'
                  }}
                >
                  IMG
                </div>
              ) : null}
            </div>

            <input
              type="text"
              className="layer-name"
              value={layer.name}
              onChange={(e) => handleNameChange(layer.id, e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />

            <input
              type="range"
              className="layer-opacity"
              min="0"
              max="1"
              step="0.01"
              value={layer.opacity}
              onChange={(e) => handleOpacityChange(layer.id, e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />

            <button
              onClick={(e) => {
                e.stopPropagation();
                onLayerDelete(layer.id);
              }}
              style={{
                marginLeft: '5px',
                padding: '2px 5px',
                fontSize: '12px'
              }}
            >
              ×
            </button>
          </div>
        ))}

        {layers.length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
            No layers yet. Add an image or create a new layer.
          </div>
        )}
      </div>
    </div>
  );
};

export default LayerPanel;