export interface RealtimeSession {
  id: string;
  token: string;
  expiresAt: Date;
  pc?: RTCPeerConnection;
  dc?: RTCDataChannel;
}

export interface RealtimeConfig {
  model?: string;
  voice?: 'alloy' | 'echo' | 'shimmer';
  instructions?: string;
  tools?: Tool[];
}

export interface Tool {
  type: 'function';
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export class RealtimeClient {
  private config: RealtimeConfig;
  private session: RealtimeSession | null = null;
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private localStream: MediaStream | null = null;
  private onAudioTrack?: (stream: MediaStream) => void;
  private onMessage?: (event: any) => void;
  private onFunctionCall?: (name: string, args: any) => Promise<any>;

  constructor(config: RealtimeConfig = {}) {
    this.config = {
      model: 'gpt-4o-realtime-preview-2024-12-17',
      voice: 'alloy',
      ...config
    };
  }

  async connect(token: string): Promise<void> {
    // Create peer connection
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    // Create audio element for playback
    this.audioElement = document.createElement('audio');
    this.audioElement.autoplay = true;

    // Handle incoming audio
    this.pc.ontrack = (e) => {
      if (this.audioElement && e.streams[0]) {
        this.audioElement.srcObject = e.streams[0];
        if (this.onAudioTrack) {
          this.onAudioTrack(e.streams[0]);
        }
      }
    };

    // Add local audio track
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.localStream = stream;
    stream.getTracks().forEach(track => {
      this.pc?.addTrack(track, stream);
    });

    // Create data channel for events
    this.dc = this.pc.createDataChannel('oai-events', {
      ordered: true
    });

    this.dc.onopen = () => {
      console.log('Data channel opened');
      this.sendSessionUpdate();
    };

    this.dc.onmessage = (e) => {
      const event = JSON.parse(e.data);
      this.handleEvent(event);
    };

    // Create offer
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    // Connect to OpenAI
    const response = await fetch('https://api.openai.com/v1/realtime', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/sdp'
      },
      body: offer.sdp
    });

    if (!response.ok) {
      throw new Error(`Failed to connect: ${response.statusText}`);
    }

    const answer = await response.text();
    await this.pc.setRemoteDescription({
      type: 'answer',
      sdp: answer
    });
  }

  private sendSessionUpdate() {
    if (!this.dc || this.dc.readyState !== 'open') return;

    const updateEvent = {
      type: 'session.update',
      session: {
        model: this.config.model,
        voice: this.config.voice,
        instructions: this.config.instructions || 'You are a helpful assistant that helps users create images through natural conversation. When the user asks to generate or edit an image, use the appropriate function.',
        tools: this.config.tools || []
      }
    };

    this.dc.send(JSON.stringify(updateEvent));
  }

  private handleEvent(event: any) {
    console.log('Received event:', event.type);

    switch (event.type) {
      case 'response.function_call_arguments.done':
        this.handleFunctionCall(event);
        break;
      
      case 'response.audio_transcript.delta':
      case 'conversation.item.input_audio_transcription.completed':
        if (this.onMessage) {
          this.onMessage(event);
        }
        break;

      case 'error':
        console.error('Realtime API error:', event.error);
        break;
    }
  }

  private async handleFunctionCall(event: any) {
    const { name, arguments: argsString } = event;
    const args = JSON.parse(argsString);

    if (this.onFunctionCall) {
      const result = await this.onFunctionCall(name, args);
      
      // Send function result back
      if (this.dc && this.dc.readyState === 'open') {
        const resultEvent = {
          type: 'conversation.item.create',
          item: {
            type: 'function_call_output',
            call_id: event.call_id,
            output: JSON.stringify(result)
          }
        };
        this.dc.send(JSON.stringify(resultEvent));
      }
    }
  }

  sendText(text: string) {
    if (!this.dc || this.dc.readyState !== 'open') return;

    const event = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }]
      }
    };

    this.dc.send(JSON.stringify(event));
    
    // Request response
    this.dc.send(JSON.stringify({ type: 'response.create' }));
  }

  setOnMessage(handler: (event: any) => void) {
    this.onMessage = handler;
  }

  setOnFunctionCall(handler: (name: string, args: any) => Promise<any>) {
    this.onFunctionCall = handler;
  }

  mute() {
    this.localStream?.getAudioTracks().forEach(track => (track.enabled = false));
  }

  unmute() {
    this.localStream?.getAudioTracks().forEach(track => (track.enabled = true));
  }

  setOnAudioTrack(handler: (stream: MediaStream) => void) {
    this.onAudioTrack = handler;
  }

  disconnect() {
    if (this.audioElement) {
      this.audioElement.srcObject = null;
    }
    if (this.dc) {
      this.dc.close();
    }
    if (this.pc) {
      this.pc.close();
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    this.session = null;
  }
}