import * as DotEnv from 'dotenv'

import {AnswerFeedbackResponses} from '../Enums/Internal/AnswerFeedbackResponses'
import {ThreadContextGuessedAnswer} from '../Interfaces/Internal/ThreadContextGuessedAnswer'
import {InteractionEvent} from '../Interfaces/Slack/InteractionEvent'
import {StateCache} from '../Utils/StateCache'

export class SlackInteractionsMiddleware {
    private slackInteractions: any

    constructor(stateCache: StateCache, callback: any) {
        DotEnv.config()

        const {createMessageAdapter} = require('@slack/interactive-messages')
        this.slackInteractions = createMessageAdapter(process.env.SLACK_SIGNING_SECRET)

        /**
         * When the bot sends an answer, it will include buttons to give feedback. This handler deals with the action of
         * clicking on one of those buttons.
         */
        this.slackInteractions.action('answer_feedback', (
            event: InteractionEvent<AnswerFeedbackResponses>,
            respond: any
        ) => {

            respond({
                text: event.original_message.text
            })

            if (event.actions == null || event.actions.length === 0) {
                return
            }

            // Try get what the user said and the thread they replied in
            const feedback: AnswerFeedbackResponses | undefined = event.actions[0].name
            const threadId: string | undefined = event.original_message.thread_ts

            // Check feedback received is valid and we've got a thread id
            if (typeof feedback === 'undefined'
                || typeof threadId === 'undefined'
                || !(feedback in AnswerFeedbackResponses)) {
                return
            }

            // Now locate this thread
            const threadContext = stateCache.getThreadState(threadId) as ThreadContextGuessedAnswer

            if (null === threadContext) {
                return
            }

            // Parse the users feedback
            callback(feedback, threadContext, event.user.id)
        })
    }

    public getMiddleware = () => {
        return this.slackInteractions.expressMiddleware()
    }
}
