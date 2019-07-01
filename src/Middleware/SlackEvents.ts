import * as DotEnv from 'dotenv'

import {MessageSubtypes} from '../Enums/Slack/MessageSubtypes'
import {MessageEvent} from '../Interfaces/Slack/MessageEvent'

export class SlackEventsMiddleware {
    private slackEvents: any

    constructor(callback: any) {
        DotEnv.config()

        const {createEventAdapter} = require('@slack/events-api')

        this.slackEvents = createEventAdapter(process.env.SLACK_SIGNING_SECRET)

        /**
         * Handle incoming messages
         */
        this.slackEvents.on('message', (event: MessageEvent) => {

            // Dont reply to itself!
            if (MessageSubtypes.BOT_MESSAGE === event.subtype || typeof event.text === 'undefined') {
                return
            }

            const message = event.text

            callback(message, event)
        })
    }

    public getMiddleware = () => {
        return this.slackEvents.expressMiddleware()
    }
}
