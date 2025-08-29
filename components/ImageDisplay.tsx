'use client';

import { useState } from 'react';
import { Download, Loader2, Image as ImageIcon, X } from 'lucide-react';

interface ImageDisplayProps {
  imageUrl: string | null;
  isLoading: boolean;
  onClear: () => void;
}

export default function ImageDisplay({ imageUrl, isLoading, onClear }: ImageDisplayProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleDownload = () => {
    if (!imageUrl) return;

    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `speak2create_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSave = async () => {
    if (!imageUrl) return;

    try {
      // Convert base64 to blob
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      // Use the File System Access API if available
      if ('showSaveFilePicker' in window) {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: `speak2create_${Date.now()}.png`,
          types: [{
            description: 'PNG Image',
            accept: { 'image/png': ['.png'] }
          }]
        });
        
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
      } else {
        // Fallback to download
        handleDownload();
      }
    } catch (error) {
      console.error('Save failed:', error);
      handleDownload();
    }
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-lg">
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
          <p className="text-gray-600 font-medium">Creating your image...</p>
          <p className="text-sm text-gray-500">This may take a few seconds</p>
        </div>
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-lg">
        <div className="flex flex-col items-center justify-center h-96 border-2 border-dashed border-gray-300 rounded-lg">
          <ImageIcon className="w-16 h-16 text-gray-400 mb-4" />
          <p className="text-gray-600 font-medium">No image yet</p>
          <p className="text-sm text-gray-500 mt-2">Speak a command to generate an image</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-lg">
        <div className="space-y-4">
          {/* Image Container */}
          <div className="relative group">
            <img
              src={imageUrl}
              alt="Generated image"
              className="w-full rounded-lg shadow-md cursor-pointer transition-transform hover:scale-[1.02]"
              onClick={() => setIsFullscreen(true)}
            />
            
            {/* Overlay Controls */}
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleSave}
                className="p-2 bg-white/90 backdrop-blur rounded-lg shadow-lg hover:bg-white transition-colors"
                title="Save image"
              >
                <Download className="w-5 h-5 text-gray-700" />
              </button>
              <button
                onClick={onClear}
                className="p-2 bg-white/90 backdrop-blur rounded-lg shadow-lg hover:bg-white transition-colors"
                title="Clear image"
              >
                <X className="w-5 h-5 text-gray-700" />
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              className="flex-1 py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-gray-700 transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Save Image
            </button>
            <button
              onClick={onClear}
              className="flex-1 py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-gray-700 transition-colors flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          </div>

          {/* Edit Hint */}
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-green-700">
              Image created! You can now speak to edit it, or clear to start over.
            </p>
          </div>
        </div>
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-8 cursor-pointer"
          onClick={() => setIsFullscreen(false)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsFullscreen(false);
            }}
            className="absolute top-4 right-4 p-2 bg-white/10 backdrop-blur rounded-lg hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <img
            src={imageUrl}
            alt="Generated image fullscreen"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}