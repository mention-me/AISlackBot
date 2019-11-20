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

        let existingAnswer = this.getQuestionWithAnswerFromLabel(label)

        existingAnswer.answer = answer

        existingAnswer = this.addAnswerAsQuestionToAnswer(existingAnswer)

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

        labelledQuestionWithAnswer = this.addAnswerAsQuestionToAnswer(labelledQuestionWithAnswer)

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

    /**
     * Often, the answer to the question is already in the answer (if that makes sense). So let's say for example
     * The answer is:
     *  "The tempersature of the office is 30 degrees!"
     *
     *  An appropriate question might be
     *  "What is the temperature of the office?"
     *
     *  So this function adds the answer to the list of questions which match the answer so the classifier can
     *  use it as a heuristic to finding the same answer (as well as the questions).
     */
    private addAnswerAsQuestionToAnswer = (questionWithAnswer: QuestionWithAnswer): QuestionWithAnswer => {
        const answer = questionWithAnswer.answer

        if (!questionWithAnswer.questions.includes(answer) && answer.length > 1) {
            questionWithAnswer.questions.push(answer)
        }

        return questionWithAnswer
    }
}
