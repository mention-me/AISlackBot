/**
 * The object returned when a message is received from slack
 *
 * {@see https://api.slack.com/events/message}
 */
import {ChatPostMessageArguments} from '@slack/web-api'

export interface MessageEvent extends ChatPostMessageArguments {
    // The timestamp the message was sent (can also be used to reply to the message)
    ts: string
}
