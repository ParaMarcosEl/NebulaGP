'use client';

export type PhysicsPlayerState = {
  pos: [number, number, number];
  rot: [number, number, number, number];
  velocity?: [number, number, number];
  vel?: [number, number, number];
};

export type PhysicsUpdatePayload = {
  state: Record<string, PhysicsPlayerState>;
};

export type MultiplayerMessagePayloads = {
  connected: { playerId: string };
  joined: {
    playerId: string;
    roomId: string;
    fbmParams?: Record<string, unknown>;
    curvePoints?: number[][];
  };
  removed: { playerId: string };
  'room:update': {
    phase: string;
    players: Array<{
      id: string;
      name: string;
      position: number | null;
      score: number;
      outOfBoundsTime: number;
      ready: boolean;
    }>;
  };
  'pregame:tick': { seconds: number };
  'racecountdown:tick': { seconds: number };
  'race:start': { startedAt: number };
  'race:end': Record<string, never>;
  'player:finished': { id: string; finishedAt: number };
  'physics:update': PhysicsUpdatePayload;
  input: {
    playerId: string;
    throttle?: number;
    inputAxis?: { x: number; y: number };
  };
  'server:log': { message: string };
};

export type MultiplayerEventType = keyof MultiplayerMessagePayloads | string;

export type MultiplayerClientConfig = {
  url?: string;
  autoReconnect?: boolean;
  reconnectDelayMs?: number;
};

export type JoinPayload = {
  name?: string;
  fbmParams?: Record<string, unknown>;
  curvePoints?: number[][];
};

type Listener<T = unknown> = (payload: T) => void;

type OutboundMessage = {
  type: string;
  payload?: unknown;
};

function defaultMultiplayerWsUrl(): string {
  if (typeof window === 'undefined') {
    return 'ws://localhost:3030';
  }

  if (process.env.NEXT_PUBLIC_MULTIPLAYER_WS_URL) {
    return process.env.NEXT_PUBLIC_MULTIPLAYER_WS_URL;
  }

  const isSecure = window.location.protocol === 'https:';
  const protocol = isSecure ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.hostname}:3030`;
}

export class MultiplayerClient {
  private ws: WebSocket | null = null;
  private readonly listeners = new Map<string, Set<Listener>>();
  private readonly queue: OutboundMessage[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private lastJoinPayload: JoinPayload | null = null;
  private manuallyDisconnected = false;

  private readonly url: string;
  private readonly autoReconnect: boolean;
  private readonly reconnectDelayMs: number;

  playerId: string | null = null;
  roomId: string | null = null;

  private debugLog(message: string, meta?: Record<string, unknown>): void {
    if (typeof console === 'undefined') return;
    if (meta) {
      console.info(`[MultiplayerClient] ${message}`, meta);
      return;
    }
    console.info(`[MultiplayerClient] ${message}`);
  }

  constructor(config: MultiplayerClientConfig = {}) {
    this.url = config.url ?? defaultMultiplayerWsUrl();
    this.autoReconnect = config.autoReconnect ?? true;
    this.reconnectDelayMs = config.reconnectDelayMs ?? 1000;
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  connect(joinPayload: JoinPayload = {}): void {
    this.manuallyDisconnected = false;
    this.lastJoinPayload = joinPayload;

    if (this.ws && this.isSocketOpenOrConnecting(this.ws)) {
      this.debugLog('connect() skipped; socket already open/connecting', {
        readyState: this.ws.readyState,
      });
      return;
    }

    this.debugLog('Opening websocket connection', { url: this.url });
    this.clearReconnectTimer();
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.debugLog('WebSocket connected', { url: this.url });
      this.send('join', this.lastJoinPayload ?? {});
      this.flushQueue();
      this.emit('open', undefined);
    };

    this.ws.onmessage = (event) => {
      let data: { type?: string; payload?: unknown };

      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      if (!data?.type) {
        return;
      }

      if (data.type === 'connected') {
        const payload = data.payload as MultiplayerMessagePayloads['connected'];
        this.playerId = payload.playerId;
      }

      if (data.type === 'joined') {
        const payload = data.payload as MultiplayerMessagePayloads['joined'];
        this.playerId = payload.playerId;
        this.roomId = payload.roomId;
      }

      this.emit(data.type, data.payload);
    };

    this.ws.onerror = (error) => {
      this.debugLog('WebSocket error emitted');
      this.emit('error', error);
    };

    this.ws.onclose = (event) => {
      this.debugLog('WebSocket disconnected', {
        code: event.code,
        reason: event.reason || 'no reason provided',
        wasClean: event.wasClean,
      });
      this.emit('close', undefined);

      if (this.autoReconnect && !this.manuallyDisconnected) {
        this.debugLog('Scheduling websocket reconnect', { delayMs: this.reconnectDelayMs });
        this.reconnectTimer = setTimeout(() => {
          this.connect(this.lastJoinPayload ?? {});
        }, this.reconnectDelayMs);
      }
    };
  }

  disconnect(): void {
    this.debugLog('Disconnect requested by client');
    this.manuallyDisconnected = true;
    this.clearReconnectTimer();
    const socket = this.ws;
    this.ws = null;

    if (socket && this.isSocketOpenOrConnecting(socket)) {
      this.debugLog('Closing websocket connection', { readyState: socket.readyState });
      socket.close(1000, 'Client disconnect');
      return;
    }

    this.debugLog('No websocket to close during disconnect');
  }

  send(type: string, payload?: unknown): void {
    const message: OutboundMessage = { type, payload };

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.queue.push(message);
      return;
    }

    this.ws.send(JSON.stringify(message));
  }

  on<T = unknown>(type: MultiplayerEventType, listener: Listener<T>): () => void {
    const key = String(type);
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }

    const set = this.listeners.get(key);
    if (!set) {
      return () => undefined;
    }

    set.add(listener as Listener);
    return () => this.off(key, listener as Listener);
  }

  off(type: MultiplayerEventType, listener: Listener): void {
    const key = String(type);
    const set = this.listeners.get(key);
    if (!set) {
      return;
    }

    set.delete(listener);
    if (set.size === 0) {
      this.listeners.delete(key);
    }
  }

  private emit(type: string, payload: unknown): void {
    const listeners = this.listeners.get(type);
    if (!listeners || listeners.size === 0) {
      return;
    }

    listeners.forEach((listener) => listener(payload));
  }

  private flushQueue(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    while (this.queue.length > 0) {
      const message = this.queue.shift();
      if (!message) continue;
      this.ws.send(JSON.stringify(message));
    }
  }


  private isSocketOpenOrConnecting(socket: WebSocket): boolean {
    return socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING;
  }
  private clearReconnectTimer(): void {
    if (!this.reconnectTimer) return;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }
}
