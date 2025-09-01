export interface StoredImage {
  data: Buffer;
  metadata: {
    width: number;
    height: number;
    format: string;
  };
}

interface SessionData {
  images: Map<string, StoredImage>;
  lastAccess: number;
}

export class SessionImageStore {
  private store = new Map<string, SessionData>();
  private readonly MAX_IMAGES_PER_SESSION = 5;
  private readonly MAX_SESSIONS = 50;
  private readonly SESSION_TIMEOUT = 20 * 60 * 1000; // 20 minutes

  constructor() {
    setInterval(() => this.cleanupExpiredSessions(), 5 * 60 * 1000); // every 5 minutes
  }

  storeImage(sessionId: string, imageData: Buffer, metadata: { width: number; height: number; format: string }): string {
    this.cleanupExpiredSessions();
    const now = Date.now();

    if (!this.store.has(sessionId) && this.store.size >= this.MAX_SESSIONS) {
      throw new Error('Service at capacity');
    }

    const session = this.store.get(sessionId) || { images: new Map(), lastAccess: now };

    if (session.images.size >= this.MAX_IMAGES_PER_SESSION) {
      throw new Error('Session image limit reached');
    }

    const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    session.images.set(imageId, { data: imageData, metadata });
    session.lastAccess = now;
    this.store.set(sessionId, session);
    return imageId;
  }

  getImage(sessionId: string, imageId: string): StoredImage | null {
    const session = this.store.get(sessionId);
    if (!session) return null;
    session.lastAccess = Date.now();
    return session.images.get(imageId) || null;
  }

  cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [sessionId, session] of this.store.entries()) {
      if (now - session.lastAccess > this.SESSION_TIMEOUT) {
        this.store.delete(sessionId);
      }
    }
  }

  getSessionStats(): { count: number; memoryUsage: string } {
    const memoryUsage = `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`;
    return { count: this.store.size, memoryUsage };
  }

  getSessionUsage(sessionId: string): { imagesUsed: number; maxImages: number } {
    const session = this.store.get(sessionId);
    return {
      imagesUsed: session ? session.images.size : 0,
      maxImages: this.MAX_IMAGES_PER_SESSION,
    };
  }
}

export const sessionImageStore = new SessionImageStore();
