"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { ImagePosition } from "@/utils/cardGenerator";

interface ImagePositionOverlayProps {
  position: ImagePosition;
  onPositionChange: (position: ImagePosition) => void;
  isEnabled: boolean;
  cardWidth: number;
  cardHeight: number;
  imageFile: File | null;
}

export default function ImagePositionOverlay({
  position,
  onPositionChange,
  isEnabled,
  cardWidth,
  cardHeight,
  imageFile
}: ImagePositionOverlayProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [actualCardDimensions, setActualCardDimensions] = useState({ width: cardWidth, height: cardHeight });
  const overlayRef = useRef<HTMLDivElement>(null);

  // Measure the actual rendered card image dimensions
  useEffect(() => {
    if (!overlayRef.current) return;
    
    const updateDimensions = () => {
      const parent = overlayRef.current?.parentElement;
      if (parent) {
        const img = parent.querySelector('img');
        if (img) {
          const rect = img.getBoundingClientRect();
          setActualCardDimensions({ 
            width: rect.width, 
            height: rect.height 
          });
        }
      }
    };

    // Initial measurement
    updateDimensions();

    // Set up observer for dynamic updates
    const resizeObserver = new ResizeObserver(updateDimensions);
    const parent = overlayRef.current.parentElement;
    if (parent) {
      resizeObserver.observe(parent);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [isEnabled]);

  // Load image preview and get dimensions when file changes
  useEffect(() => {
    if (imageFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageSrc = e.target?.result as string;
        setImagePreview(imageSrc);
        
        // Get image dimensions
        const img = new Image();
        img.onload = () => {
          setImageDimensions({ width: img.width, height: img.height });
        };
        img.src = imageSrc;
      };
      reader.readAsDataURL(imageFile);
    } else {
      setImagePreview("/poke/missingno.png");
      // MissingNo dimensions (you can adjust these)
      setImageDimensions({ width: 300, height: 300 });
    }
  }, [imageFile]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isEnabled) return;
    setIsDragging(true);
    e.preventDefault();
  }, [isEnabled]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !isEnabled || !overlayRef.current) return;
    
    const rect = overlayRef.current.getBoundingClientRect();
    
    // Card frame coordinates (the image area is offset within the card)
    const frameOffsetX = 82; // pixels from left edge of card to image area
    const frameOffsetY = 122; // pixels from top edge of card to image area
    // const frameWidth = 558; // image area width
    // const frameHeight = 390; // image area height
    
    // Scale factors based on actual rendered dimensions
    const scaleX = 726 / actualCardDimensions.width;
    const scaleY = 996 / actualCardDimensions.height;
    
    // Mouse position relative to overlay
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Convert overlay mouse position to card coordinates
    const cardMouseX = mouseX * scaleX;
    const cardMouseY = mouseY * scaleY;
    
    // Convert to frame coordinates (position within the 558x390 frame)
    // These coordinates represent where the CENTER of the image should be
    const frameX = cardMouseX - frameOffsetX;
    const frameY = cardMouseY - frameOffsetY;
    
    // Allow positioning beyond frame bounds for better user control
    const clampedX = Math.max(-100, Math.min(frameWidth + 100, frameX));
    const clampedY = Math.max(-100, Math.min(frameHeight + 100, frameY));
    
    onPositionChange({
      ...position,
      x: clampedX,
      y: clampedY
    });
  }, [isDragging, isEnabled, position, onPositionChange, actualCardDimensions]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!isEnabled) return;
    
    e.preventDefault();
    
    // Calculate delta based on image dimensions for consistent visual scaling
    let delta;
    if (imageDimensions.width > 0 && imageDimensions.height > 0) {
      // Base the delta on the larger dimension to normalize scaling feeling
      const maxDimension = Math.max(imageDimensions.width, imageDimensions.height);
      // Target roughly 20px change per scroll tick, regardless of image size
      const targetPixelChange = 20;
      const baseDelta = targetPixelChange / maxDimension;
      delta = e.deltaY > 0 ? -baseDelta : baseDelta;
    } else {
      // Fallback for when dimensions aren't loaded yet
      delta = e.deltaY > 0 ? -0.02 : 0.02;
    }
    
    const newScale = Math.max(0.1, Math.min(3, position.scale + delta));
    
    onPositionChange({
      ...position,
      scale: newScale
    });
  }, [isEnabled, position, onPositionChange, imageDimensions]);

  // Global mouse event handlers
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (!isEnabled) return null;

  // Calculate real-time image positioning for preview
  const frameOffsetX = 82;
  const frameOffsetY = 122;
  const frameWidth = 558;
  const frameHeight = 390;
  
  // Scale factors based on actual rendered dimensions
  const scaleX = actualCardDimensions.width / 726;
  const scaleY = actualCardDimensions.height / 996;
  
  // Image positioning in overlay coordinates  
  // position.x and position.y are CENTER coordinates within the frame (0-558, 0-390)
  // Match exactly what the card generator does:
  
  // Calculate scaled dimensions (matching card generator)
  let scaledWidth, scaledHeight;
  if (imageDimensions.width > 0 && imageDimensions.height > 0) {
    scaledWidth = imageDimensions.width * position.scale;
    scaledHeight = imageDimensions.height * position.scale;
  } else {
    // Fallback dimensions for MissingNo
    scaledWidth = 300 * position.scale;
    scaledHeight = 300 * position.scale;
  }
  
  // Card generator logic: imageX = imagePosition.x - scaledWidth / 2
  // imagePosition.x is CENTER point in frame coordinates (0-558)
  // Convert to TOP-LEFT position in frame coordinates
  const frameImageX = position.x - scaledWidth / 2;
  const frameImageY = position.y - scaledHeight / 2;
  
  // Convert frame coordinates to card coordinates (add frame offset)
  const cardImageX = frameOffsetX + frameImageX;
  const cardImageY = frameOffsetY + frameImageY;
  
  // Convert to overlay coordinates (scale to display size)
  const overlayImageX = cardImageX * scaleX;
  const overlayImageY = cardImageY * scaleY;
  
  // Calculate image display size
  const imageWidth = scaledWidth * scaleX;
  const imageHeight = scaledHeight * scaleY;
  
  console.log('Preview Debug:', {
    position,
    imageDimensions,
    actualCardDimensions,
    scaledWidth,
    scaledHeight,
    frameImageX,
    frameImageY,
    cardImageX,
    cardImageY,
    overlayImageX,
    overlayImageY,
    displayWidth: imageWidth,
    displayHeight: imageHeight,
    scaleFactors: { scaleX, scaleY }
  });

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 z-10 cursor-move rounded-lg overflow-hidden"
      onMouseDown={handleMouseDown}
      onWheel={handleWheel}
      style={{
        width: actualCardDimensions.width,
        height: actualCardDimensions.height,
      }}
    >
      {/* Real-time image preview */}
      {imagePreview && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: overlayImageX,
            top: overlayImageY,
            width: imageWidth,
            height: imageHeight,
            backgroundImage: `url(${imagePreview})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.7,
            border: '2px solid #3b82f6',
            borderRadius: '4px',
          }}
        />
      )}
      
      {/* Semi-transparent overlay to show it's interactive */}
      <div className="absolute inset-0 bg-blue-500 bg-opacity-10 border-2 border-blue-400 border-dashed rounded-lg">
        <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
          Drag to position • Scroll to scale
        </div>
        
        {/* Scale indicator */}
        <div className="absolute bottom-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
          Scale: {position.scale.toFixed(1)}x
        </div>
        
        {/* Debug info */}
        <div className="absolute bottom-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
          {actualCardDimensions.width}×{actualCardDimensions.height}
        </div>
      </div>
    </div>
  );
} 