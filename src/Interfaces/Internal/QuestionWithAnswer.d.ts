/**
 * The object used for an answer with an array of questions.
 */
export interface QuestionWithAnswer {
    // The label identifying the answer, an MD5 hash of the answer when first given
    label?: string
    // The actual answer
    answer: string
    // Questions which have previously been answered by the above answer
    questions: string[]
}
