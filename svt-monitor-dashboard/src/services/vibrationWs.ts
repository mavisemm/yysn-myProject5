import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs'

export interface VibrationEventPayload {
  deviceId: string
  time: number
  tenantId: string
  eventTypeCode: string
  statusCode: string
  probability: number
  dataJson: string
}

export type VibrationMessageHandler = (payload: VibrationEventPayload) => void

function buildDefaultBrokerURL(): string {
  return 'ws://122.224.196.178:36020/topic/vibration'
}

export class VibrationWsClient {
  private client: Client
  private subscription: StompSubscription | null = null

  constructor(opts?: { brokerURL?: string; token?: string }) {
    const brokerURL = opts?.brokerURL ?? (import.meta.env.VITE_VIBRATION_WS_URL as string | undefined) ?? buildDefaultBrokerURL()
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
        // 避免在控制台刷屏；需要排查时可临时打开
      }
    })
  }

  async connect(): Promise<void> {
    if (this.client.active) return
    await new Promise<void>((resolve, reject) => {
      this.client.onConnect = () => resolve()
      this.client.onStompError = (frame) => reject(new Error(frame.headers['message'] || 'STOMP error'))
      this.client.onWebSocketError = () => reject(new Error('WebSocket error'))
      this.client.activate()
    })
  }

  subscribeVibrationTopic(tenantId: string, handler: VibrationMessageHandler): void {
    if (!tenantId) throw new Error('tenantId 不能为空')
    const topic = `/topic/vibration/${tenantId}`

    if (!this.client.connected) {
      // 允许调用方先订阅后连接：等连接后再订阅
      const prevOnConnect = this.client.onConnect
      this.client.onConnect = (frame) => {
        prevOnConnect?.(frame)
        this.subscription = this.client.subscribe(topic, (msg: IMessage) => this.safeHandle(msg, handler))
      }
      return
    }

    this.subscription?.unsubscribe()
    this.subscription = this.client.subscribe(topic, (msg: IMessage) => this.safeHandle(msg, handler))
  }

  private safeHandle(msg: IMessage, handler: VibrationMessageHandler) {
    try {
      const body = msg.body ? JSON.parse(msg.body) : null
      if (!body) return
      handler(body as VibrationEventPayload)
    } catch (e) {
      console.error('振动告警消息解析失败:', e, msg.body)
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

