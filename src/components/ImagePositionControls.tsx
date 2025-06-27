"use client";

import { ImagePosition } from "@/utils/cardGenerator";

interface ImagePositionControlsProps {
  position: ImagePosition;
  onPositionChange: (position: ImagePosition) => void;
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
  defaultPosition: ImagePosition;
}

export default function ImagePositionControls({
  position,
  onPositionChange,
  isEnabled,
  onToggle,
  defaultPosition
}: ImagePositionControlsProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="w-4 h-4"
          />
          <span>Enable Image Positioning</span>
        </label>
      </div>

      {isEnabled && (
        <div className="text-sm text-gray-300 bg-zinc-300 bg-opacity-20 rounded-lg p-3">
          <p className="mb-2">
            🖱️ <strong>Drag</strong> on the card preview to position your image
          </p>
          <p className="mb-3">
            🖲️ <strong>Scroll</strong> over the card to scale your image
          </p>
          <button
            type="button"
            onClick={() => onPositionChange(defaultPosition)}
            className="text-xs bg-gray-600 hover:bg-gray-500 px-3 py-1 rounded"
          >
            Reset Position
          </button>
        </div>
      )}
    </div>
  );
} 