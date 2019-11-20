import * as natural from 'natural'
import {BayesClassifierClassification, LogisticRegressionClassifier} from 'natural'
import JsonDB from 'node-json-db'

import {QuestionWithAnswer} from '../Interfaces/Internal/QuestionWithAnswer'

export const trainFromDb = async (db: JsonDB, outputLocation: string) => {

    // Either make a new classifer or use the one given to us
    const messageClassifier = new natural.LogisticRegressionClassifier()

    // Given our database, get all the questions and answers
    const trainingData = db.getData('/')

    let documentCount = 0

    // For each question "label", add the variants to the classifier
    Object.keys(trainingData).forEach((label) => {
        documentCount++
        const document: QuestionWithAnswer = trainingData[label]

        document.questions.forEach((question: string) => {
            // For each question matching that label (question variants)
            messageClassifier.addDocument(question, label)
        })

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
        messageClassifier.addDocument(document.answer, label)

    })

    if (documentCount === 0) {
        return null
    }

    // Now all of the documents are in the classifier we can train the system
    messageClassifier.train()

    // Save this classifier so we can restore it later if we want
    await new Promise((resolve) => {
        messageClassifier.save(outputLocation, async () => {
            resolve()
        })
    })

    // The classifier is immediately available for use
    return messageClassifier
}

/**
 * Interpret and classify a question using the specified classifier.
 *
 * @param phrase
 * @param classifier
 */
export const interpret = (phrase: string, classifier: LogisticRegressionClassifier) => {
    const guesses = classifier.getClassifications(phrase.toLowerCase())

    const guess = guesses.reduce((x: any, y: any) => x && x.value > y.value ? x : y)
    return {
        probabilities: guesses,
        guess: guess.value > (0.5) ? guess.label : null,
        probability: guess.value
    }
}

/**
 * Given an array of probabilities, remove the specified answer if exists.
 *
 * @param probabilities
 * @param answerToRemove
 */
export const removeAnswerFromProbabilities = async (
    probabilities: BayesClassifierClassification[],
    answerToRemove: string) => {

    const newProbabilities = []

    for (const probability of probabilities) {
        const item: BayesClassifierClassification = probability

        if (item.label !== answerToRemove) {
            newProbabilities.push(item)
        }

    }

    return newProbabilities
}
