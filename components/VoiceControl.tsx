'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { RealtimeClient } from '@/lib/openai-realtime';

interface VoiceControlProps {
  onImageGenerate: (prompt: string) => Promise<void>;
  onImageEdit: (instruction: string) => Promise<void>;
  currentImage: string | null;
  onListeningChange?: (isListening: boolean) => void;
  compact?: boolean;
  ultraCompact?: boolean;
}

export default function VoiceControl({ 
  onImageGenerate, 
  onImageEdit, 
  currentImage,
  onListeningChange,
  compact = false,
  ultraCompact = false
}: VoiceControlProps) {
  const [isListening, setIsListening] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [status, setStatus] = useState('Click or press spacebar to start');
  const clientRef = useRef<RealtimeClient | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Keyboard shortcut for spacebar
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Check if spacebar is pressed and no input/textarea is focused
      if (e.code === 'Space' && 
          !(e.target instanceof HTMLInputElement || 
            e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        if (isListening) {
          stopListening();
        } else if (!isConnecting) {
          startListening();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isListening, isConnecting]);

  useEffect(() => {
    if (onListeningChange) {
      onListeningChange(isListening);
    }
  }, [isListening, onListeningChange]);

  const visualizeAudio = (stream: MediaStream) => {
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    analyser.fftSize = 256;
    analyserRef.current = analyser;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height;
        
        // Emerald green gradient for visualization
        const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
        gradient.addColorStop(0, '#10b981'); // emerald-500
        gradient.addColorStop(1, '#059669'); // emerald-600
        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };

    draw();
  };

  const startListening = async () => {
    try {
      setIsConnecting(true);
      setStatus('Connecting...');

      // Get session token
      const response = await fetch('/api/session', { method: 'POST' });
      const { token } = await response.json();

      // Initialize realtime client
      const client = new RealtimeClient({
        voice: 'alloy',
        instructions: `You are a voice-controlled image creation assistant. Images appear instantly on the user's screen when you use functions.

CRITICAL DECISION LOGIC:
- If NO image exists on screen: Any descriptive request should call generate_image (e.g., "a sunset", "cute cat", "mountain landscape")
- If an image EXISTS on screen: 
  * Modification requests should call edit_image (e.g., "make it brighter", "add clouds", "change to night", "remove the tree")
  * Requests starting with "new", "create", "generate", "start over", "different" should call generate_image for a fresh image
  
RESPONSE STYLE:
- When generating: Say "Creating your [brief description]..." then call function
- When editing: Say "Making those changes..." or "Adjusting the [what you're changing]..." then call function  
- After function calls: Simple confirmation like "Done!" or "There you go!"
- NEVER describe the image - they can see it
- Keep all responses under 5 words when possible

EXAMPLES:
User: "A cute robot in a garden" → You: "Creating your robot scene..." [generate_image]
User: "Make the sky purple" (with image showing) → You: "Making the sky purple..." [edit_image]  
User: "Actually, start over with a beach scene" → You: "Creating a beach scene..." [generate_image]
User: "Add some palm trees" (with beach showing) → You: "Adding palm trees..." [edit_image]`,
        tools: [
          {
            type: 'function',
            name: 'generate_image',
            description: 'Generate a completely NEW image, replacing any existing image. Use when user wants to start fresh or create something different.',
            parameters: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description: 'Detailed description of the image to generate'
                },
                style: {
                  type: 'string',
                  description: 'Optional style hints (e.g., photorealistic, cartoon, oil painting)'
                }
              },
              required: ['prompt']
            }
          },
          {
            type: 'function',
            name: 'edit_image',
            description: 'Modify or adjust the EXISTING image on screen. Use for changes like colors, adding/removing elements, style adjustments.',
            parameters: {
              type: 'object',
              properties: {
                instruction: {
                  type: 'string',
                  description: 'Instructions for how to edit the current image'
                }
              },
              required: ['instruction']
            }
          }
        ]
      });

      // Set up event handlers
      client.setOnMessage((event) => {
        if (event.transcript) {
          setTranscript(event.transcript);
        }
      });

      client.setOnFunctionCall(async (name, args) => {
        if (name === 'generate_image') {
          setStatus('Generating image...');
          await onImageGenerate(args.prompt);
          setStatus('Image generated!');
          return { success: true };
        } else if (name === 'edit_image' && currentImage) {
          setStatus('Editing image...');
          await onImageEdit(args.instruction);
          setStatus('Image edited!');
          return { success: true };
        }
        return { success: false, error: 'Function not available' };
      });

      await client.connect(token);
      clientRef.current = client;

      // Set up audio visualization
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      visualizeAudio(stream);

      setIsListening(true);
      setIsConnecting(false);
      setStatus('Listening... Speak your command');
    } catch (error) {
      console.error('Failed to start listening:', error);
      setStatus('Failed to connect. Please try again.');
      setIsConnecting(false);
    }
  };

  const stopListening = () => {
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setIsListening(false);
    setStatus('Click or press spacebar to start');
  };

  if (ultraCompact) {
    // Ultra compact - just visualization and button stacked
    return (
      <div className="w-full space-y-3">
        {/* Audio Visualizer - Slim Bar */}
        <div className="relative h-16 bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm">
          <canvas
            ref={canvasRef}
            width={640}
            height={64}
            className="w-full h-full"
          />
          {!isListening && !isConnecting && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-gray-400 text-xs font-light">Audio visualization</p>
            </div>
          )}
        </div>

        {/* Control Button */}
        <button
          onClick={isListening ? stopListening : startListening}
          disabled={isConnecting}
          className={`w-full py-3.5 px-6 rounded-xl font-medium transition-all flex items-center justify-center gap-3 ${
            isListening
              ? 'bg-black text-white hover:bg-gray-900'
              : isConnecting
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-black text-white hover:bg-gray-900 shadow-md'
          }`}
        >
          {isConnecting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Connecting...
            </>
          ) : isListening ? (
            <>
              <MicOff className="w-5 h-5" />
              Stop Speaking
            </>
          ) : (
            <>
              <Mic className="w-5 h-5" />
              Start Speaking
            </>
          )}
        </button>

        {/* Status */}
        <p className="text-center text-sm text-gray-500 font-light">{status}</p>
        {transcript && (
          <p className="text-center text-xs text-gray-600 font-light">{transcript}</p>
        )}
      </div>
    );
  }

  if (compact) {
    return (
      <div className="w-full">
        {/* Audio Visualizer - Slim Bar */}
        <div className="relative h-20 bg-gray-900/5 rounded-xl overflow-hidden mb-4 border border-purple-100">
          <canvas
            ref={canvasRef}
            width={640}
            height={80}
            className="w-full h-full"
          />
          {!isListening && !isConnecting && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-gray-500 text-sm">Audio visualization will appear here</p>
            </div>
          )}
        </div>

        {/* Control Button and Status */}
        <div className="flex items-center gap-4">
          <button
            onClick={isListening ? stopListening : startListening}
            disabled={isConnecting}
            className={`py-3 px-6 rounded-xl font-medium transition-all transform hover:scale-105 flex items-center justify-center gap-3 ${
              isListening
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : isConnecting
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white'
            }`}
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Connecting...
              </>
            ) : isListening ? (
              <>
                <MicOff className="w-5 h-5" />
                Stop Speaking
              </>
            ) : (
              <>
                <Mic className="w-5 h-5" />
                Start Speaking
              </>
            )}
          </button>

          <div className="flex-1">
            <p className="text-sm text-gray-600">{status}</p>
            {transcript && (
              <p className="text-sm text-gray-700 italic mt-1">"{transcript}"</p>
            )}
          </div>
        </div>

        {/* Command Suggestions */}
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="text-xs text-gray-500">Try saying:</span>
          <button className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition-colors">
            "Generate a sunset over mountains"
          </button>
          <button className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition-colors">
            "Create a cute robot"
          </button>
          {currentImage && (
            <button className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200 transition-colors">
              "Make it more colorful"
            </button>
          )}
        </div>
      </div>
    );
  }

  // Original full-size layout
  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-lg">
      <div className="space-y-4">
        {/* Audio Visualizer */}
        <div className="relative h-32 bg-gray-50 rounded-lg overflow-hidden">
          <canvas
            ref={canvasRef}
            width={640}
            height={128}
            className="w-full h-full"
          />
          {!isListening && !isConnecting && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-gray-500">Audio visualization will appear here</p>
            </div>
          )}
        </div>

        {/* Control Button */}
        <button
          onClick={isListening ? stopListening : startListening}
          disabled={isConnecting}
          className={`w-full py-4 px-6 rounded-xl font-medium transition-all transform hover:scale-105 flex items-center justify-center gap-3 ${
            isListening
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : isConnecting
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white'
          }`}
        >
          {isConnecting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Connecting...
            </>
          ) : isListening ? (
            <>
              <MicOff className="w-5 h-5" />
              Stop Speaking
            </>
          ) : (
            <>
              <Mic className="w-5 h-5" />
              Start Speaking
            </>
          )}
        </button>

        {/* Status Display */}
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-600">{status}</p>
          {transcript && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700 italic">"{transcript}"</p>
            </div>
          )}
        </div>

        {/* Tips */}
        <div className="mt-6 p-4 bg-purple-50 rounded-lg">
          <p className="text-sm font-semibold text-purple-900 mb-2">Try saying:</p>
          <ul className="text-sm text-purple-700 space-y-1">
            <li>• "Generate a sunset over mountains"</li>
            <li>• "Create a cute robot in a garden"</li>
            {currentImage && (
              <>
                <li>• "Make the sky more purple"</li>
                <li>• "Add a rainbow to the image"</li>
              </>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}