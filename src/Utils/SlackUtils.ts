import {MessageAttachment, WebClient} from '@slack/web-api'
import * as DotEnv from 'dotenv'
import * as env from 'require-env'

import {MessageSubtypes} from '../Enums/Slack/MessageSubtypes'
import {MessageThreadEvent} from '../Interfaces/Slack/MessageThreadEvent'

/**
 * The SlackUtils class is the main way we interact with slack, both sending and finding messages.
 * The class ensures it has all the variables it needs to connect to slack and exposes methodss to send in various
 * formats and retrieve threads.
 *
 * Requires the following environment variables:
 *      - SLACK_CHANNEL
 *      - SLACK_ACCESS_TOKEN
 */
export class SlackUtils {

    private webClient: WebClient
    private readonly slackChannel: string

    /**
     * Setup a new slack web client.
     */
    constructor() {
        DotEnv.config()
        this.slackChannel = env.require('SLACK_CHANNEL')
        this.webClient = new WebClient(env.require('SLACK_ACCESS_TOKEN'))
    }

    /**
     * Sends a message to a specified thread with an array of attachments.
     *
     * @param message
     * @param attachments
     * @param threadId
     */
    public sendMessageWithAttachments = (message: string, attachments: MessageAttachment[], threadId?: string) => {
        this.sendMessage(message, threadId, attachments)
    }

    /**
     * Sends a message to a slack channel or thread with optional attachments.
     *
     * @param message
     * @param threadId = if populated will try and sending the specified thread, otherwise post in the main channel
     * @param attachments
     */
    public sendMessage = (message: string, threadId?: string, attachments?: MessageAttachment[]) => {
        this.webClient.chat.postMessage({
            channel: this.slackChannel,
            text: message,
            thread_ts: threadId,
            attachments
        })
    }

    /**
     * Given the timestamp of a thread, get the thread contents.
     *
     * @param threadTimestamp
     */
    public getThread = async (threadTimestamp: string) => {
        return await this.webClient.channels.replies({
            channel: this.slackChannel,
            thread_ts: threadTimestamp
        }) as unknown as MessageThreadEvent
    }

    /**
     * Given a thread event, try and obtain an acquisition code if present, otherwise return null
     *
     * @param threadContents
     */
    public static tryGetAcquisitionId = (threadContents: MessageThreadEvent): string | null => {
        if (MessageSubtypes.BOT_MESSAGE !== threadContents.messages[0].subtype) {
            return null
        }

        if (threadContents.messages[0].attachments == null
            || threadContents.messages[0].attachments[0].footer == null) {
            return null
        }

        const found = threadContents.messages[0].attachments[0].footer

        if (!found.startsWith('Acquisition Code: ')) {
            return null
        }

        return found.replace('Acquisition Code: ', '')

    }
}
