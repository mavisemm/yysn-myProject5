import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs'

const STOMP_CLIENT_OPTIONS = {
  reconnectDelay: 3000,
  heartbeatIncoming: 10000,
  heartbeatOutgoing: 10000,
  debug: () => {},
}

export const stripBearerPrefix = (raw: string) => {
  let value = raw.trim()
  while (/^Bearer\s+/i.test(value)) {
    value = value.replace(/^Bearer\s+/i, '').trim()
  }
  return value
}

export const resolveBrokerURL = (envUrl: string | undefined, fallback: string, override?: string) =>
  override ?? envUrl ?? fallback

export function createStompClient(brokerURL: string, token?: string): Client {
  const tokenValue = stripBearerPrefix(String(token ?? ''))
  const authorization = tokenValue ? `Bearer ${tokenValue}` : undefined
  return new Client({
    brokerURL,
    connectHeaders: authorization ? { Authorization: authorization } : {},
    ...STOMP_CLIENT_OPTIONS,
  })
}

export async function connectStompClient(client: Client): Promise<void> {
  if (client.active) return
  await new Promise<void>((resolve, reject) => {
    client.onConnect = () => resolve()
    client.onStompError = (frame) =>
      reject(new Error(frame.headers.message || 'STOMP error'))
    client.onWebSocketError = () => reject(new Error('WebSocket error'))
    client.activate()
  })
}

export function parseStompJsonBody<T>(msg: IMessage, logLabel: string): T | null {
  try {
    return msg.body ? (JSON.parse(msg.body) as T) : null
  } catch (e) {
    console.error(`${logLabel}消息解析失败:`, e, msg.body)
    return null
  }
}

/** 单主题订阅：未连接时挂到 onConnect，已连接则先退订再订阅 */
export class StompTopicSubscriber {
  private subscription: StompSubscription | null = null

  constructor(private readonly client: Client) {}

  subscribe(topic: string, onMessage: (msg: IMessage) => void): void {
    const bind = () => {
      this.subscription?.unsubscribe()
      this.subscription = this.client.subscribe(topic, onMessage)
    }

    if (!this.client.connected) {
      const prevOnConnect = this.client.onConnect
      this.client.onConnect = (frame) => {
        prevOnConnect?.(frame)
        bind()
      }
      return
    }

    bind()
  }

  unsubscribe(): void {
    this.subscription?.unsubscribe()
    this.subscription = null
  }
}

export function disconnectStomp(client: Client, subscriber: StompTopicSubscriber): void {
  try {
    subscriber.unsubscribe()
  } finally {
    if (client.active) client.deactivate()
  }
}
