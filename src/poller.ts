import * as fs from 'fs'

import * as ClassifierUtils from './Utils/ClassifierUtils'
import {QAStorage} from './Utils/StorageUtils'

const corpus = './storage/qaData.json'

/**
 * This app monitors the qaData.json file. If it detects a change, it uses
 * the QA data to train a logistic regression classifier. The classifier is
 * saved as classifier.json once it's ready, which is loaded by the other app
 * index.ts.
 */
fs.watchFile(corpus, (curr, prev) => {
    const storage = new QAStorage('storage/qaData')
    console.log("Training")
    ClassifierUtils.trainFromDb(storage.getDb(), './storage/classifier.json')
    console.log("Trained")
})
