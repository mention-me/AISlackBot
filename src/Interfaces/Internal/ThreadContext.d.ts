/**
 * The object used to maintain the lifecycle of a message through the bot's journey
 */
export interface ThreadContext {
    threadId: string
    // The question asked by the user
    question?: string
}
