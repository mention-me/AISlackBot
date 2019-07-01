import {MessageAttachment} from '@slack/web-api'

import {AnswerFeedbackResponses} from '../Enums/Internal/AnswerFeedbackResponses'
import {ActionTypes} from '../Enums/Slack/ActionTypes'
import {ButtonStyles} from '../Enums/Slack/ButtonStyles'

/**
 * Returns the attachments used to get feedback on a message.
 */
export const AnswerFeedbackButtons: MessageAttachment[] = [
    {
        fallback: 'Feedback isnt working currently, sorry',
        callback_id: 'answer_feedback',
        actions: [
            {
                text: 'Good answer',
                name: AnswerFeedbackResponses.GOOD_ANSWER,
                value: AnswerFeedbackResponses.GOOD_ANSWER,
                type: ActionTypes.BUTTON,
                style: ButtonStyles.BUTTON_STYLE_PRIMARY,
            },
            {
                text: 'Wrong answer',
                name: AnswerFeedbackResponses.WRONG_ANSWER,
                value: AnswerFeedbackResponses.WRONG_ANSWER,
                type: ActionTypes.BUTTON,
                style: ButtonStyles.BUTTON_STYLE_DANGER,
            },
            {
                text: 'Answer has changed',
                name: AnswerFeedbackResponses.ANSWER_HAS_CHANGED,
                value: AnswerFeedbackResponses.ANSWER_HAS_CHANGED,
                type: ActionTypes.BUTTON
            }
        ]
    }
]

/**
 * Returns the attachments for a footer with the specified text.
 *
 * @param text
 */
export const getFooter = (text: string): MessageAttachment[] => {
    return [
        {
            fallback: text,
            footer: text,
        }
    ]
}
