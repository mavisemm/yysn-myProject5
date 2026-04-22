import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs'

export interface SoundWarningPayload {
  [k: string]: unknown
}

export type SoundWarningMessageHandler = (payload: SoundWarningPayload) => void

function buildDefaultBrokerURL(): string {
  return 'ws://122.224.196.178:36020/wssevent/event'
}

export class SoundWarningWsClient {
  private client: Client
  private subscription: StompSubscription | null = null

  constructor(opts?: { brokerURL?: string; token?: string }) {
    const brokerURL =
      opts?.brokerURL ??
      (import.meta.env.VITE_SOUND_WARNING_WS_URL as string | undefined) ??
      buildDefaultBrokerURL()
    const rawToken = (opts?.token ?? '').toString().trim()
    let tokenValue = rawToken
    while (/^Bearer\s+/i.test(tokenValue)) {
      tokenValue = tokenValue.replace(/^Bearer\s+/i, '').trim()
    }
    const authorization = tokenValue ? `Bearer ${tokenValue}` : undefined

    this.client = new Client({
      brokerURL,
      connectHeaders: authorization ? { Authorization: authorization } : {},
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: () => {
        // keep silent
      },
    })
  }

  async connect(): Promise<void> {
    if (this.client.active) return
    await new Promise<void>((resolve, reject) => {
      this.client.onConnect = () => resolve()
      this.client.onStompError = (frame) =>
        reject(new Error(frame.headers['message'] || 'STOMP error'))
      this.client.onWebSocketError = () => reject(new Error('WebSocket error'))
      this.client.activate()
    })
  }

  subscribeSoundTopic(tenantId: string, handler: SoundWarningMessageHandler): void {
    if (!tenantId) throw new Error('tenantId 不能为空')
    const topic = `/topic/${tenantId}/*`

    if (!this.client.connected) {
      const prevOnConnect = this.client.onConnect
      this.client.onConnect = (frame) => {
        prevOnConnect?.(frame)
        this.subscription = this.client.subscribe(topic, (msg: IMessage) =>
          this.safeHandle(msg, handler),
        )
      }
      return
    }

    this.subscription?.unsubscribe()
    this.subscription = this.client.subscribe(topic, (msg: IMessage) => this.safeHandle(msg, handler))
  }

  private safeHandle(msg: IMessage, handler: SoundWarningMessageHandler) {
    try {
      const body = msg.body ? JSON.parse(msg.body) : null
      if (!body) return
      handler(body as SoundWarningPayload)
    } catch (e) {
      console.error('声音预警消息解析失败:', e, msg.body)
    }
  }

  disconnect(): void {
    try {
      this.subscription?.unsubscribe()
      this.subscription = null
    } finally {
      if (this.client.active) this.client.deactivate()
    }
  }
}
