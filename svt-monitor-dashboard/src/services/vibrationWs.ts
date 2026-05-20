import type { IMessage } from '@stomp/stompjs'
import {
  connectStompClient,
  createStompClient,
  disconnectStomp,
  parseStompJsonBody,
  resolveBrokerURL,
  StompTopicSubscriber,
} from './stompClient'

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

const DEFAULT_BROKER_URL = 'ws://122.224.196.178:36020/topic/vibration'

export class VibrationWsClient {
  private readonly client
  private readonly subscriber

  constructor(opts?: { brokerURL?: string; token?: string }) {
    const brokerURL = resolveBrokerURL(
      import.meta.env.VITE_VIBRATION_WS_URL as string | undefined,
      DEFAULT_BROKER_URL,
      opts?.brokerURL,
    )
    this.client = createStompClient(brokerURL, opts?.token)
    this.subscriber = new StompTopicSubscriber(this.client)
  }

  connect(): Promise<void> {
    return connectStompClient(this.client)
  }

  subscribeVibrationTopic(tenantId: string, handler: VibrationMessageHandler): void {
    if (!tenantId) throw new Error('tenantId 不能为空')
    const topic = `/topic/vibration/${tenantId}`
    this.subscriber.subscribe(topic, (msg: IMessage) => {
      const body = parseStompJsonBody<VibrationEventPayload>(msg, '振动告警')
      if (body) handler(body)
    })
  }

  disconnect(): void {
    disconnectStomp(this.client, this.subscriber)
  }
}
