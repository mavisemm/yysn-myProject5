import type { IMessage } from '@stomp/stompjs'
import {
  connectStompClient,
  createStompClient,
  disconnectStomp,
  parseStompJsonBody,
  resolveBrokerURL,
  StompTopicSubscriber,
} from './stompClient'

export interface SoundWarningPayload {
  [k: string]: unknown
}

export type SoundWarningMessageHandler = (payload: SoundWarningPayload) => void

const DEFAULT_BROKER_URL = 'ws://122.224.196.178:36020/wssevent/event'

export class SoundWarningWsClient {
  private readonly client
  private readonly subscriber

  constructor(opts?: { brokerURL?: string; token?: string }) {
    const brokerURL = resolveBrokerURL(
      import.meta.env.VITE_SOUND_WARNING_WS_URL as string | undefined,
      DEFAULT_BROKER_URL,
      opts?.brokerURL,
    )
    this.client = createStompClient(brokerURL, opts?.token)
    this.subscriber = new StompTopicSubscriber(this.client)
  }

  connect(): Promise<void> {
    return connectStompClient(this.client)
  }

  subscribeSoundTopic(tenantId: string, handler: SoundWarningMessageHandler): void {
    if (!tenantId) throw new Error('tenantId 不能为空')
    const topic = `/topic/${tenantId}/*`
    this.subscriber.subscribe(topic, (msg: IMessage) => {
      const body = parseStompJsonBody<SoundWarningPayload>(msg, '声音预警')
      if (body) handler(body)
    })
  }

  disconnect(): void {
    disconnectStomp(this.client, this.subscriber)
  }
}
