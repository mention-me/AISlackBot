import {BayesClassifierClassification} from 'natural'

import {QuestionWithAnswer} from './QuestionWithAnswer'
import {ThreadContext} from './ThreadContext'

/**
 * The thread context to use when the system has guessed an answer
 */
export interface ThreadContextGuessedAnswer extends ThreadContext {
    // The question asked by the user
    question: string
    // The current best guess from the classifier
    guessedAnswer: QuestionWithAnswer
    // Other classifications which _could_ answer the question above
    classifications: BayesClassifierClassification[]
}
