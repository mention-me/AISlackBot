import * as DotEnv from 'dotenv'
import express from 'express'
import {BayesClassifierClassification, LogisticRegressionClassifier} from 'natural'
import uniqid from 'uniqid'

import {AnswerFeedbackResponses} from './Enums/Internal/AnswerFeedbackResponses'
import {AnswerAcquisition} from './Interfaces/Internal/AnswerAcquisition'
import {ImproveAnswerAcquisition} from './Interfaces/Internal/ImproveAnswerAcquisition'
import {QuestionWithAnswer} from './Interfaces/Internal/QuestionWithAnswer'
import {ThreadContextGuessedAnswer} from './Interfaces/Internal/ThreadContextGuessedAnswer'
import {MessageEvent} from './Interfaces/Slack/MessageEvent'
import {SlackEventsMiddleware} from './Middleware/SlackEvents'
import {SlackInteractionsMiddleware} from './Middleware/SlackInteractions'
import * as MessageAttachments from './Models/MessageAttachments'
import * as ClassifierUtils from './Utils/ClassifierUtils'
import {SlackUtils} from './Utils/SlackUtils'
import {StateCache} from './Utils/StateCache'
import {QAStorage} from './Utils/StorageUtils'

DotEnv.config()

const port = process.env.PORT || 3000
const PROBABILITY_HARD_CUTOFF = 0.28

const app = express()

const stateCache = new StateCache()
const storage = new QAStorage('storage/qaData')
const slackUtils = new SlackUtils()

let classifier: LogisticRegressionClassifier

/**
 * ./ngrok http -subdomain=subdomain 3000
 */

/**
 * Initialise the classifier so we're ready to go!
 */
const trainClassifier = async () => {
    classifier = await ClassifierUtils.trainFromDb(storage.getDb(), './storage/classifier.json')
}

/**
 * Given a question, try and find it's answer.
 * - If we can find an answer, call out to {@see sendAnswerAndGatherFeedback}
 * - If we can't find an answer, call out to {@see startNewQuestionAnswerAcquision}
 *
 * @param question
 * @param threadId
 */
const interpretQuestionAndGuessAnswer = (question: string, threadId: string) => {
    // Initialise a variable to keep track of the context of the question's thread
    stateCache.setThreadState(threadId, {
        threadId
    })

    // Try and guess an answer
    const interpretation = ClassifierUtils.interpret(question, classifier)

    if (!interpretation.guess) {
        // No answer found so try and ask the community to give one
        startNewQuestionAnswerAcquision(question, threadId)

        return
    }

    // We got a match, so give that to the user
    const labelledQuestionWithAnswer = storage.getQuestionWithAnswerFromLabel(interpretation.guess)

    sendAnswerAndGatherFeedback(
        question,
        labelledQuestionWithAnswer,
        interpretation.probabilities,
        threadId
    )
}

/**
 * In this method we send the answer that we _think_ matches their guessedAnswer, and ask them whether it answered their
 * guessedAnswer satisfactorily.
 *
 * @param usersQuestion
 * @param guessedAnswer
 * @param classifications
 * @param threadId
 */
const sendAnswerAndGatherFeedback = (
    usersQuestion: string,
    guessedAnswer: QuestionWithAnswer,
    classifications: BayesClassifierClassification[],
    threadId: string) => {

    // e.g:
    // This is the answer
    // [Good answer] [Bad answer] [Needs improvement]
    slackUtils.sendMessageWithAttachments(guessedAnswer.answer, MessageAttachments.AnswerFeedbackButtons, threadId)

    stateCache.setThreadState(threadId, {
        threadId,
        question: usersQuestion,
        guessedAnswer,
        classifications
    })
}

/**
 * Once we've given an answer, we ask the user to give feedback on whether it was correct, wrong or needs improving.
 * This method processes this feedback.
 *
 * @param feedback
 * @param threadContext
 * @param userId
 */
const processFeedbackOnGuessedAnswer = async (
    feedback: AnswerFeedbackResponses,
    threadContext: ThreadContextGuessedAnswer,
    userId: string) => {

    // We want to be case insensitive
    threadContext.question = threadContext.question.toLowerCase()

    if (feedback === AnswerFeedbackResponses.GOOD_ANSWER) {
        // Positive feedback! The answer was good!

        if (!threadContext.guessedAnswer.questions.includes(threadContext.question)) {

            // If we've not seen the question asked which provided this answer before, update the corpus so this
            // question is factored in for the next time it gets trained.

            threadContext.guessedAnswer.questions.push(threadContext.question)
            storage.storeOrUpdateLabelledQuestionWithAnswer(
                threadContext.guessedAnswer,
                threadContext.classifications[0].label
            )

            trainClassifier()
        }

        slackUtils.sendMessage('Thanks for letting me know!', threadContext.threadId)
        stateCache.deleteThreadState(threadContext.threadId)

    } else if (feedback === AnswerFeedbackResponses.WRONG_ANSWER && threadContext.guessedAnswer.label != null) {

        // The answer provided wasn't correct

        // Remove the answer from the array of possible answers
        const newClassifications = await ClassifierUtils.removeAnswerFromProbabilities(
            threadContext.classifications,
            threadContext.guessedAnswer.label
        )

        // At this point, the top classification is the next highest confidence answer

        // Update the state so only the remaining answers are available
        const newThreadState = threadContext
        newThreadState.classifications = newClassifications

        stateCache.setThreadState(threadContext.threadId, newThreadState)

        // Fire the method so it gives the user the next answer
        sendNextBestQuestionGuess(threadContext.question, newThreadState)

    } else if (feedback === AnswerFeedbackResponses.ANSWER_HAS_CHANGED) {
        // The answer was correct, however, the user has suggested that the answer could be improved.

        startImproveExistingAnswerAcquisition(threadContext, threadContext.classifications[0].label, userId)
    }

}

/**
 * Sometimes, the answer given by the classifier isn't correct, this method picks the next highest confidence answer.
 *
 * @param question
 * @param threadContext
 */
const sendNextBestQuestionGuess = async (question: string, threadContext: ThreadContextGuessedAnswer) => {

    const bestClassification = threadContext.classifications[0]

    // If we're at the point where we've run out of guesses, we can try and get the community to answer it
    if (typeof bestClassification === 'undefined' || bestClassification.value <= PROBABILITY_HARD_CUTOFF) {
        startNewQuestionAnswerAcquision(question, threadContext.threadId)
        return
    }

    // We have another potential answer. The probability is lower than the last, but lets try it
    const labelledQuestionWithAnswer = storage.getQuestionWithAnswerFromLabel(bestClassification.label)

    // Remove the specified label from the guesses (in case we end up back in this method)
    threadContext.classifications = await ClassifierUtils.removeAnswerFromProbabilities(
        threadContext.classifications,
        bestClassification.label
    )

    // Store this new state
    stateCache.setThreadState(threadContext.threadId, threadContext)

    // Call the method to output the answer and ask if it's good now
    sendAnswerAndGatherFeedback(
        question,
        labelledQuestionWithAnswer,
        threadContext.classifications,
        threadContext.threadId
    )

}

/**
 * Ask the community for an answer to a question we couldn't figure out
 *
 * @param question
 * @param threadId
 */
const startNewQuestionAnswerAcquision = async (question: string, threadId: string) => {

    const thread = await slackUtils.getThread(threadId)

    const askingUser = thread.messages[0].user

    // If this was called from within a thread, give them an apology message before posting in the channel
    slackUtils.sendMessage('I\'m sorry, my responses are limited, you must ask the right questions', threadId)

    // Begin the acquisition process
    const acquisitionId = uniqid()
    const footer = MessageAttachments.getFooter('Acquisition Code: ' + acquisitionId)

    // Create a acquisition using the unique ID
    stateCache.deleteThreadState(threadId)
    stateCache.setAcquisitionState(acquisitionId, {
        question,
        id: acquisitionId
    })

    // Message the rest of the channel asking them for the answer using the acquisition ID
    slackUtils.sendMessageWithAttachments('<@' + askingUser + '> asked this question:\n' +
        '>>>```' + question + '```' + '\n*Please reply to this message as a thread with your answer if you know it!*',
        footer)
}

/**
 * Method to create a new answer from the community members answer
 *
 * @param answer
 * @param acquisition
 * @param threadId
 */
const acquireNewQuestionAnswer = async (answer: string, acquisition: AnswerAcquisition, threadId: string) => {

    storage.storeOrUpdateLabelledQuestionWithAnswer({
        answer,
        questions: [acquisition.question.toLowerCase()]
    })

    stateCache.deleteThreadState(threadId)
    stateCache.deleteAcquisitionState(acquisition.id)

    slackUtils.sendMessage('Thanks for making me smarter!', threadId)

    // Retrain
    trainClassifier()
}

/**
 * If an answer is provided, it might be correct but requires improvement, this might be due to information changing or
 * could be as simple as a typo etc.
 *
 * @param threadContext
 * @param label
 * @param userId
 */
const startImproveExistingAnswerAcquisition = async (
    threadContext: ThreadContextGuessedAnswer,
    label: string,
    userId: string) => {

    const answerToImprove = threadContext.guessedAnswer

    // Begin the acquisition process
    const acquisitionId = uniqid()

    const improveAcquisition: ImproveAnswerAcquisition = {
        label,
        answerToImprove,
        id: acquisitionId
    }

    // Create a acquisition using the unique ID
    stateCache.setImproveAnswerAcquisitionState(acquisitionId, improveAcquisition)
    const footer = MessageAttachments.getFooter('Acquisition Code: ' + acquisitionId)

    // Message the rest of the channel asking them for the answer using the acquisition ID
    slackUtils.sendMessageWithAttachments('<@' + userId + '> said this answer could be improved:\n' +
        '>>>```' + answerToImprove.answer + '```' + '\n*Please reply to this message as a thread with the improved ' +
        'answer if you can!*',
        footer)

}

/**
 * Update an existing answer with an improved answer from the community.
 *
 * @param newAnswer
 * @param acquisition
 * @param threadId
 */
const acquireImproveExistingAnswer = async (
    newAnswer: string,
    acquisition: ImproveAnswerAcquisition,
    threadId: string) => {

    // Replace the answer on the existing answer
    storage.updateAnswer(acquisition.label, newAnswer)

    stateCache.deleteThreadState(threadId)
    stateCache.deleteImproveAnswerAcquisitionState(acquisition.id)

    slackUtils.sendMessage('Thanks for making me smarter!', threadId)

    // Retrain
    trainClassifier()
}

/**
 * Called when a message is incoming.
 *
 * @param message
 * @param event
 */
const handleIncomingSlackMessage = async (message: string, event: MessageEvent) => {
    // Work out context
    const isQuestion = message.indexOf('?') > -1
    const replyId = event.ts
    const isThread = event.thread_ts != null

    if (isQuestion && !isThread) {
        interpretQuestionAndGuessAnswer(message, replyId)
        return
    }

    if (event.thread_ts == null) {
        return
    }

    // If we get here, the message is a reply to a thread

    const threadContents = await slackUtils.getThread(event.thread_ts)

    // If this thread contains an acquisition ID, it might be answering a question or improving an existing question.
    const acquisitionId = SlackUtils.tryGetAcquisitionId(threadContents)

    if (null === acquisitionId) {
        return
    }

    // First see if it's answering a new question
    const aquisition = stateCache.getAcquisitionState(acquisitionId)

    if (null !== aquisition) {
        acquireNewQuestionAnswer(message, aquisition, event.thread_ts)
        return
    }

    // Then see if it's improving an existing question
    const improveAnswerAquisition = stateCache.getImproveAnswerAcquisitionState(acquisitionId)

    if (null !== improveAnswerAquisition) {
        acquireImproveExistingAnswer(message, improveAnswerAquisition, event.thread_ts)
        return
    }

}

app.use('/slack/events',
    new SlackEventsMiddleware(handleIncomingSlackMessage).getMiddleware()
)

app.use('/slack/actions',
    new SlackInteractionsMiddleware(stateCache, processFeedbackOnGuessedAnswer).getMiddleware()
)

trainClassifier()
app.listen(port, () => console.log(`App listening on port ${port}!`))
