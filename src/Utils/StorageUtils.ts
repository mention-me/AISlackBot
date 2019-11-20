import crypto from 'crypto'
import JsonDB from 'node-json-db'

import {QuestionWithAnswer} from '../Interfaces/Internal/QuestionWithAnswer'

export class QAStorage {
    public db: JsonDB

    constructor(filename: string) {
        this.db = new JsonDB(filename, true, false, '/')
    }

    /**
     * Update the answer for an existing question with answer using its label.
     *
     * @param label
     * @param answer
     */
    public updateAnswer = (label: string, answer: string) => {

        const existingAnswer = this.getQuestionWithAnswerFromLabel(label)

        existingAnswer.answer = answer

        this.db.push('/' + label, existingAnswer)
    }

    /**
     * Given a question with answer, store it if new, or update it if it exists already.
     *
     * @param labelledQuestionWithAnswer
     * @param label
     */
    public storeOrUpdateLabelledQuestionWithAnswer = (
        labelledQuestionWithAnswer: QuestionWithAnswer,
        label?: string
    ) => {

        if (typeof label === 'undefined') {
            label = crypto.createHash('md5').update(labelledQuestionWithAnswer.answer).digest('hex')
            labelledQuestionWithAnswer.label = label
        }

        this.db.push('/' + label, labelledQuestionWithAnswer)
    }

    /**
     * Given the answers question label get that item.
     *
     * @param label
     */
    public getQuestionWithAnswerFromLabel = (label: string): QuestionWithAnswer => {
        const qa = this.db.getData('/' + label.toLowerCase()) as QuestionWithAnswer
        qa.label = label

        return qa
    }

    public getDb = (): JsonDB => {
        return this.db
    }
}
