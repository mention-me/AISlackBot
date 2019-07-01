import {QuestionWithAnswer} from './QuestionWithAnswer'

/**
 * The object used when trying to improve an existing answer.
 */
export interface ImproveAnswerAcquisition {
    id: string
    // The label given to the answer, an md5 hash of the first answer given
    label: string
    // The answer which we will hopefully be improving
    answerToImprove: QuestionWithAnswer
}
