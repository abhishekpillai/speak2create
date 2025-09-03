'use client';

import { useState } from 'react';
import { Download, Loader2, Image as ImageIcon, X, Maximize2 } from 'lucide-react';

interface ImageDisplayProps {
  imageUrl: string | null;
  isLoading: boolean;
  onClear: () => void;
  compact?: boolean;
  centered?: boolean;
}

export default function ImageDisplay({ imageUrl, isLoading, onClear, compact = false, centered = false }: ImageDisplayProps) {
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

  if (centered) {
    // Centered layout - smaller image, stacked controls
    if (isLoading) {
      return (
        <div className="aspect-[4/3] flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-indigo-50 rounded-2xl shadow-sm border border-gray-100">
          <div className="text-center space-y-4">
            <div className="relative flex items-center justify-center">
              {/* Main spinning circle */}
              <div className="w-16 h-16 relative">
                <div className="absolute inset-0 rounded-full border-4 border-purple-200 animate-spin border-t-purple-500"></div>
                <div className="absolute inset-2 rounded-full border-2 border-indigo-200 animate-spin border-b-indigo-500" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}></div>
              </div>
              
              {/* Pulsing background */}
              <div className="absolute inset-0 w-16 h-16 bg-gradient-to-r from-purple-400 to-indigo-400 rounded-full animate-ping opacity-20"></div>
              
              {/* Dancing dots */}
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                <div className="flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-gray-700 font-medium">Creating your vision...</p>
              <div className="flex items-center justify-center space-x-1">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (!imageUrl) {
      return (
        <div className="aspect-[4/3] flex items-center justify-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
          <div className="text-center space-y-3">
            <div className="p-3 bg-white rounded-full shadow-sm inline-block border border-gray-100">
              <ImageIcon className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">Your image will appear here</p>
          </div>
        </div>
      );
    }

    return (
      <>
        <div className="space-y-3">
          <div className="relative group">
            {/* Main Image */}
            <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-sm bg-white border border-gray-100">
              <img
                src={imageUrl}
                alt="Generated image"
                className="w-full h-full object-contain cursor-pointer bg-white"
                onClick={() => setIsFullscreen(true)}
              />
            </div>
            
            {/* Overlay Controls */}
            <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setIsFullscreen(true)}
                className="p-2 bg-black/80 backdrop-blur rounded-lg hover:bg-black transition-all"
                title="Fullscreen"
              >
                <Maximize2 className="w-4 h-4 text-white" />
              </button>
              <button
                onClick={handleSave}
                className="p-2 bg-black/80 backdrop-blur rounded-lg hover:bg-black transition-all"
                title="Save"
              >
                <Download className="w-4 h-4 text-white" />
              </button>
              <button
                onClick={onClear}
                className="p-2 bg-black/80 backdrop-blur rounded-lg hover:bg-black transition-all"
                title="Clear"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          {/* Compact Action Bar */}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 py-2.5 px-4 bg-black hover:bg-gray-900 rounded-xl text-sm font-medium text-white transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-3.5 h-3.5" />
              Save
            </button>
            <button
              onClick={onClear}
              className="flex-1 py-2.5 px-4 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 transition-all flex items-center justify-center gap-2"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          </div>
        </div>

        {/* Fullscreen Modal */}
        {isFullscreen && (
          <div 
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 cursor-pointer backdrop-blur-sm"
            onClick={() => setIsFullscreen(false)}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsFullscreen(false);
              }}
              className="absolute top-4 right-4 p-3 bg-white/10 backdrop-blur rounded-xl hover:bg-white/20 transition-all"
            >
              <X className="w-6 h-6 text-white" />
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSave();
              }}
              className="absolute bottom-4 right-4 p-3 bg-white/10 backdrop-blur rounded-xl hover:bg-white/20 transition-all flex items-center gap-2"
            >
              <Download className="w-5 h-5 text-white" />
              <span className="text-white">Save</span>
            </button>
            
            <img
              src={imageUrl}
              alt="Generated image fullscreen"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </>
    );
  }

  if (compact) {
    // Compact layout for above-the-fold design
    if (isLoading) {
      return (
        <div className="h-full flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-indigo-50 rounded-xl shadow-lg border border-purple-100">
          <div className="text-center space-y-3">
            <div className="relative flex items-center justify-center">
              {/* Main spinning circle */}
              <div className="w-12 h-12 relative">
                <div className="absolute inset-0 rounded-full border-4 border-purple-200 animate-spin border-t-purple-500"></div>
                <div className="absolute inset-2 rounded-full border-2 border-indigo-200 animate-spin border-b-indigo-500" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}></div>
              </div>
              
              {/* Pulsing background */}
              <div className="absolute inset-0 w-12 h-12 bg-gradient-to-r from-purple-400 to-indigo-400 rounded-full animate-ping opacity-20"></div>
              
              {/* Dancing dots */}
              <div className="absolute -top-1.5 left-1/2 transform -translate-x-1/2">
                <div className="flex space-x-1">
                  <div className="w-1 h-1 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1 h-1 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
            <p className="text-gray-600 text-sm font-medium">Creating your vision...</p>
          </div>
        </div>
      );
    }

    if (!imageUrl) {
      return (
        <div className="h-full flex items-center justify-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <div className="text-center space-y-3">
            <div className="p-3 bg-white rounded-full shadow-sm inline-block border border-gray-100">
              <ImageIcon className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">Your image will appear here</p>
          </div>
        </div>
      );
    }

    return (
      <>
        <div className="h-full flex flex-col">
          <div className="flex-1 relative group min-h-0">
            {/* Main Image */}
            <div className="h-full rounded-xl overflow-hidden shadow-xl bg-white border border-purple-100">
              <img
                src={imageUrl}
                alt="Generated image"
                className="w-full h-full object-contain cursor-pointer bg-white"
                onClick={() => setIsFullscreen(true)}
              />
            </div>
            
            {/* Overlay Controls */}
            <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setIsFullscreen(true)}
                className="p-2 bg-black/80 backdrop-blur rounded-lg hover:bg-black transition-all"
                title="Fullscreen"
              >
                <Maximize2 className="w-4 h-4 text-white" />
              </button>
              <button
                onClick={handleSave}
                className="p-2 bg-black/80 backdrop-blur rounded-lg hover:bg-black transition-all"
                title="Save"
              >
                <Download className="w-4 h-4 text-white" />
              </button>
              <button
                onClick={onClear}
                className="p-2 bg-black/80 backdrop-blur rounded-lg hover:bg-black transition-all"
                title="Clear"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          {/* Compact Action Bar */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleSave}
              className="flex-1 py-2.5 px-4 bg-black hover:bg-gray-900 rounded-xl text-sm font-medium text-white transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-3.5 h-3.5" />
              Save
            </button>
            <button
              onClick={onClear}
              className="flex-1 py-2.5 px-4 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 transition-all flex items-center justify-center gap-2"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          </div>
        </div>

        {/* Fullscreen Modal */}
        {isFullscreen && (
          <div 
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 cursor-pointer backdrop-blur-sm"
            onClick={() => setIsFullscreen(false)}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsFullscreen(false);
              }}
              className="absolute top-4 right-4 p-3 bg-white/10 backdrop-blur rounded-xl hover:bg-white/20 transition-all"
            >
              <X className="w-6 h-6 text-white" />
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSave();
              }}
              className="absolute bottom-4 right-4 p-3 bg-white/10 backdrop-blur rounded-xl hover:bg-white/20 transition-all flex items-center gap-2"
            >
              <Download className="w-5 h-5 text-white" />
              <span className="text-white">Save</span>
            </button>
            
            <img
              src={imageUrl}
              alt="Generated image fullscreen"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </>
    );
  }

  // Original non-compact layout code remains the same...
  if (isLoading) {
    return (
      <div className="w-full aspect-[4/3] bg-gradient-to-br from-purple-50 via-white to-indigo-50 rounded-2xl shadow-xl border border-purple-100">
        <div className="flex flex-col items-center justify-center h-full space-y-6">
          <div className="relative flex items-center justify-center">
            {/* Main spinning rings */}
            <div className="w-20 h-20 relative">
              <div className="absolute inset-0 rounded-full border-4 border-purple-200 animate-spin border-t-purple-500"></div>
              <div className="absolute inset-2 rounded-full border-3 border-indigo-200 animate-spin border-b-indigo-500" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}></div>
              <div className="absolute inset-4 rounded-full border-2 border-purple-300 animate-spin border-l-purple-600" style={{ animationDuration: '1.2s' }}></div>
            </div>
            
            {/* Pulsing background */}
            <div className="absolute inset-0 w-20 h-20 bg-gradient-to-r from-purple-400 to-indigo-400 rounded-full animate-ping opacity-20"></div>
            
            {/* Orbital dots */}
            <div className="absolute inset-0 w-20 h-20">
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              </div>
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
              </div>
              <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></div>
              </div>
              <div className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-1">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '600ms' }}></div>
              </div>
            </div>
          </div>
          
          <div className="text-center space-y-2">
            <p className="text-gray-700 font-semibold text-lg">Creating your vision...</p>
            <p className="text-sm text-gray-500">This may take a few seconds</p>
            <div className="flex items-center justify-center space-x-2 mt-3">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.6s' }}></div>
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: '0.9s' }}></div>
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '1.2s' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div className="w-full aspect-[4/3] bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl shadow-xl border-2 border-dashed border-purple-200">
        <div className="flex flex-col items-center justify-center h-full space-y-4">
          <div className="p-6 bg-white rounded-full shadow-lg">
            <ImageIcon className="w-20 h-20 text-purple-400" />
          </div>
          <div className="text-center">
            <p className="text-gray-700 font-medium text-lg">No image yet</p>
            <p className="text-sm text-gray-500 mt-2">Click "Start Creating" to generate, upload, or create memes</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="w-full">
        <div className="relative group">
          {/* Main Image */}
          <div className="rounded-2xl overflow-hidden shadow-2xl bg-white border border-purple-100">
            <img
              src={imageUrl}
              alt="Generated image"
              className="w-full h-auto cursor-pointer transition-transform hover:scale-[1.01]"
              onClick={() => setIsFullscreen(true)}
            />
          </div>
          
          {/* Overlay Controls - Top Right */}
          <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setIsFullscreen(true)}
              className="p-2.5 bg-white/95 backdrop-blur rounded-xl shadow-lg hover:bg-white transition-all hover:scale-110"
              title="Fullscreen"
            >
              <Maximize2 className="w-5 h-5 text-gray-700" />
            </button>
            <button
              onClick={handleSave}
              className="p-2.5 bg-white/95 backdrop-blur rounded-xl shadow-lg hover:bg-white transition-all hover:scale-110"
              title="Save image"
            >
              <Download className="w-5 h-5 text-gray-700" />
            </button>
            <button
              onClick={onClear}
              className="p-2.5 bg-white/95 backdrop-blur rounded-xl shadow-lg hover:bg-white transition-all hover:scale-110"
              title="Clear image"
            >
              <X className="w-5 h-5 text-gray-700" />
            </button>
          </div>

          {/* Hover Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-2xl" />
        </div>

        {/* Action Buttons Below Image */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 px-4 bg-purple-100 hover:bg-purple-200 rounded-xl font-medium text-purple-700 transition-all flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Save Image
          </button>
          <button
            onClick={onClear}
            className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium text-gray-700 transition-all flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            Clear & Start Over
          </button>
        </div>

        {/* Success Message */}
        <div className="mt-4 p-3 bg-green-50 rounded-xl border border-green-200">
          <p className="text-sm text-green-700 text-center">
            ✨ Image ready! You can edit it by speaking or save your creation.
          </p>
        </div>
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 cursor-pointer backdrop-blur-sm"
          onClick={() => setIsFullscreen(false)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsFullscreen(false);
            }}
            className="absolute top-4 right-4 p-3 bg-white/10 backdrop-blur rounded-xl hover:bg-white/20 transition-all"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleSave();
            }}
            className="absolute bottom-4 right-4 p-3 bg-white/10 backdrop-blur rounded-xl hover:bg-white/20 transition-all flex items-center gap-2"
          >
            <Download className="w-5 h-5 text-white" />
            <span className="text-white">Save</span>
          </button>
          
          <img
            src={imageUrl}
            alt="Generated image fullscreen"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}