import {MessageEvent} from './MessageEvent'

/**
 * The object returned when a thread is returned.
 *
 * {@see https://api.slack.com/methods/channels.replies}
 */
export interface MessageThreadEvent extends MessageEvent {
    // Messages within the thread
    messages: MessageEvent[]
}
