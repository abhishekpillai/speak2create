"use client";

import { useState, useCallback } from "react";
import VoiceControl from "@/components/VoiceControl";
import ImageDisplay from "@/components/ImageDisplay";
import ImageUploader from "@/components/ImageUploader";
import UsageLimits from "@/components/UsageLimits";
import { Sparkles } from "lucide-react";
import addWatermark from "@/lib/watermark";

export default function Home() {
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [uploadedImageId, setUploadedImageId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [sessionId] = useState(`session_${Date.now()}`);
  const [rateLimitInfo, setRateLimitInfo] = useState<any>(null);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [sessionStarted, setSessionStarted] = useState(false);

  const handleImageGenerate = async (prompt: string) => {
    try {
      setIsLoading(true);
      setRateLimitError(null);

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          session_id: sessionId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setRateLimitError(data.message || "Rate limit exceeded");
          setRateLimitInfo(data.rateLimitInfo || data.sessionInfo);
        } else {
          throw new Error(data.error || "Failed to generate image");
        }
        return;
      }

      let imageUrl = data.imageUrl;
      try {
        imageUrl = await addWatermark(data.imageUrl);
      } catch (err) {
        console.error("Watermark failed:", err);
      }
      setCurrentImage(imageUrl);
      setUploadedImageId(null); // Clear uploaded image when generating new one
      setRateLimitInfo(data.rateLimitInfo);
    } catch (error) {
      console.error("Image generation error:", error);
      setRateLimitError("Failed to generate image. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMemeGenerate = async (template: string, topText?: string, bottomText?: string) => {
    try {
      setIsLoading(true);
      setRateLimitError(null);

      const response = await fetch("/api/meme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template,
          topText,
          bottomText,
          session_id: sessionId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setRateLimitError(data.message || "Rate limit exceeded");
          setRateLimitInfo(data.rateLimitInfo || data.sessionInfo);
        } else {
          throw new Error(data.error || "Failed to generate meme");
        }
        return;
      }

      setCurrentImage(data.imageUrl);
      setUploadedImageId(null); // Clear uploaded image when generating new meme
      setRateLimitInfo(data.rateLimitInfo);
    } catch (error) {
      console.error("Meme generation error:", error);
      setRateLimitError("Failed to generate meme. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageEdit = useCallback(async (instruction: string) => {
    console.log('📝 handleImageEdit called with:', { instruction, hasImage: !!currentImage, hasUploadedImage: !!uploadedImageId });
    if (!currentImage) {
      console.warn('⚠️ handleImageEdit called but no current image');
      return;
    }

    try {
      console.log('🔄 Starting image edit, setting loading to true');
      setIsLoading(true);
      setRateLimitError(null);

      // Determine which edit flow to use
      const requestBody = uploadedImageId 
        ? {
            base_image_id: uploadedImageId,
            edit_instruction: instruction,
            session_id: sessionId,
          }
        : {
            image_data: currentImage,
            edit_instruction: instruction,
            session_id: sessionId,
          };

      const response = await fetch("/api/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setRateLimitError(data.message || "Rate limit exceeded");
          setRateLimitInfo(data.rateLimitInfo || data.sessionInfo);
        } else {
          throw new Error(data.error || "Failed to edit image");
        }
        return;
      }

      console.log('✅ Edit successful, updating image');
      let imageUrl = data.imageUrl;
      try {
        imageUrl = await addWatermark(data.imageUrl);
      } catch (err) {
        console.error('Watermark failed:', err);
      }
      setCurrentImage(imageUrl);
      setRateLimitInfo(data.rateLimitInfo);
    } catch (error) {
      console.error('❌ Image editing error:', error);
      setRateLimitError("Failed to edit image. Please try again.");
    } finally {
      console.log('🔄 Edit complete, setting loading to false');
      setIsLoading(false);
    }
  }, [currentImage, uploadedImageId, sessionId]);

  const handleClear = () => {
    setCurrentImage(null);
    setUploadedImageId(null);
  };

  const handleImageUpload = useCallback((result: any) => {
    setCurrentImage(result.image_url);
    setUploadedImageId(result.image_id);
    setUploadError(null);
    setRateLimitError(null);
    setRateLimitInfo({
      sessionImagesUsed: result.session_limits.images_used,
      sessionImagesRemaining: result.session_limits.max_images - result.session_limits.images_used,
    });
  }, []);

  const handleUploadError = useCallback((error: string) => {
    setUploadError(error);
  }, []);

  const handleSessionStart = useCallback(() => {
    setSessionStarted(true);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Compact Header */}
      <header className="bg-white border-b border-gray-100 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-black rounded-lg">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-lg font-semibold text-gray-900">
              speak2create
            </h1>
          </div>
          <p className="text-xs text-gray-500 hidden sm:block">
            Voice-powered image generation
          </p>
        </div>
      </header>

      {/* Main Content - Centered Stack */}
      <main className="flex-1 flex items-center justify-center p-4 py-4 min-h-0">
        <div className="w-full max-w-6xl flex gap-8 items-center">
          {/* Left Side - Try Saying Tips */}
          <div className="hidden lg:block w-48 flex-shrink-0">
            <div className="space-y-3">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
                Try saying
              </p>
              <div className="space-y-2">
                {!currentImage ? (
                  <>
                    <div className="text-sm text-gray-700 bg-white border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors cursor-pointer shadow-sm">
                      "Create a Drake meme about coffee"
                    </div>
                    <div className="text-sm text-gray-700 bg-white border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors cursor-pointer shadow-sm">
                      "Generate a sunset over mountains"
                    </div>
                    <div className="text-sm text-gray-700 bg-white border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors cursor-pointer shadow-sm">
                      Upload a photo to edit
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-sm text-gray-700 bg-white border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors cursor-pointer shadow-sm">
                      "Make the sky more vibrant"
                    </div>
                    <div className="text-sm text-gray-700 bg-white border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors cursor-pointer shadow-sm">
                      "Add some warm lighting"
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Center - Main Content */}
          <div className="flex-1 flex flex-col items-center justify-center max-w-3xl mx-auto">
            {/* Title */}
            <div className="text-center mb-2">
              <h2 className="text-3xl font-semibold text-gray-900 mb-1">
                {currentImage ? "Your Creation" : "Speak Your Vision"}
              </h2>
              <p className="text-sm text-gray-500">
                {currentImage
                  ? (uploadedImageId ? "Edit your photo with voice commands" : "Edit with voice or save your masterpiece")
                  : "Just describe what you want to see"}
              </p>
            </div>

            {/* Image Display with Upload Option - Smaller, Centered */}
            <div className="w-full max-w-md mb-3">
              {currentImage ? (
                <ImageDisplay
                  imageUrl={currentImage}
                  isLoading={isLoading}
                  onClear={handleClear}
                  centered={true}
                />
              ) : sessionStarted ? (
                <ImageUploader
                  sessionId={sessionId}
                  onUpload={handleImageUpload}
                  onError={handleUploadError}
                  disabled={isLoading}
                  placeholder={true}
                />
              ) : (
                <ImageUploader
                  sessionId={sessionId}
                  onUpload={handleImageUpload}
                  onError={handleUploadError}
                  disabled={true}
                  placeholder={true}
                  inactiveMessage="Click Start Creating to begin"
                />
              )}
            </div>

            {/* Voice Control - Compact, Centered */}
            <div className="w-full max-w-md">
              <VoiceControl
                onImageGenerate={handleImageGenerate}
                onImageEdit={handleImageEdit}
                onMemeGenerate={handleMemeGenerate}
                currentImage={currentImage}
                onListeningChange={setIsListening}
                ultraCompact={true}
                onSessionStart={handleSessionStart}
              />

              
              {/* Errors */}
              {(uploadError || rateLimitError) && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700 font-medium">
                    {uploadError || rateLimitError}
                  </p>
                </div>
              )}
            </div>

            {/* Mobile Tips - Show below on small screens */}
            <div className="lg:hidden mt-6 space-y-3">
              {/* Usage Limit Message (only shows when at limit) */}
              <UsageLimits 
                sessionId={sessionId}
                rateLimitInfo={rateLimitInfo}
                compact={true}
              />
              
              {/* Tips */}
              <div className="flex flex-wrap justify-center gap-2">
                <span className="text-xs text-gray-500">Try:</span>
                {!currentImage ? (
                  <>
                    <span className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full border border-gray-200">
                      "Drake meme"
                    </span>
                    <span className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full border border-gray-200">
                      "Generate a sunset"
                    </span>
                    <span className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full border border-gray-200">
                      Upload & edit
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full border border-gray-200">
                      "Make it warmer"
                    </span>
                    <span className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full border border-gray-200">
                      "Add lighting"
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Side - Tips and Usage */}
          <div className="hidden lg:block w-48 flex-shrink-0">
            <div className="space-y-4">
              {/* Usage Limit Message (only shows when at limit) */}
              <UsageLimits 
                sessionId={sessionId}
                rateLimitInfo={rateLimitInfo}
                compact={true}
              />
              
              {/* Quick Tips */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
                  Quick tips
                </p>
                <div className="space-y-2 text-xs text-gray-600">
                  <div className="flex items-start gap-2">
                    <span className="text-gray-400">→</span>
                    <span>Upload photos to edit with voice</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-gray-400">→</span>
                    <span>Be descriptive for better results</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-gray-400">→</span>
                    <span>Click image to view fullscreen</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer with attribution */}
      <footer className="bg-white border-t border-gray-100 py-2 px-4 flex-shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <span>Powered by</span>
            <span className="font-medium text-gray-700">
              OpenAI Realtime API
            </span>
            <span>&</span>
            <span className="font-medium text-gray-700">
              Google Gemini 2.5 Flash Image 🍌
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span>Built by</span>
            <span className="font-medium text-gray-700">Abhi Pillai</span>
            <span className="text-gray-400">•</span>
            <a
              href="https://twitter.com/abhiondemand"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Twitter
            </a>
            <span className="text-gray-400">•</span>
            <a
              href="https://linkedin.com/in/abhipillai1"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              LinkedIn
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
