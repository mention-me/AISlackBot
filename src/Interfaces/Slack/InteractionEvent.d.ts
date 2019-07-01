/**
 * The object returned when a user interacts with an attachment such as clicking a button
 *
 * {@see https://api.slack.com/interactive-messages}
 */
export interface InteractionEvent<T> {
    // The message which contained the attachment being interacted with
    original_message: {
        text: string
        thread_ts: string
    }
    // The action that occured
    actions: Array<{
        // Currently the only options supported are
        name: T
    }>,
    // The user that performed the action
    user: {
        id: string
    }
}
