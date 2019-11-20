import * as natural from 'natural'
import {LogisticRegressionClassification, LogisticRegressionClassifier} from 'natural'
import JsonDB from 'node-json-db'

import {QuestionWithAnswer} from '../Interfaces/Internal/QuestionWithAnswer'

export const trainFromDb = async (db: JsonDB, outputLocation: string) => {

    // Either make a new classifer or use the one given to us
    const messageClassifier = new natural.LogisticRegressionClassifier()

    // Given our database, get all the questions and answers
    const trainingData = db.getData('/')

    let documentCount = 0

    // For each question "label", add the variants to the classifier
    Object.keys(trainingData).forEach((element) => {
        documentCount++
        const documment: QuestionWithAnswer = trainingData[element]

        documment.questions.forEach((question: string) => {
            // For each question matching that label (question variants)
            messageClassifier.addDocument(question, element)
        })

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
    probabilities: LogisticRegressionClassification[],
    answerToRemove: string) => {

    const newProbabilities = []

    for (const probability of probabilities) {
        const item: LogisticRegressionClassification = probability

        if (item.label !== answerToRemove) {
            newProbabilities.push(item)
        }

    }

    return newProbabilities
}
