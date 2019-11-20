import * as fs from 'fs'

import * as ClassifierUtils from './Utils/ClassifierUtils'
import {QAStorage} from './Utils/StorageUtils'

const corpus = './storage/qaData.json'

fs.watchFile(corpus, (curr, prev) => {
    const storage = new QAStorage('storage/qaData')
    console.log("Training")
    ClassifierUtils.trainFromDb(storage.getDb(), './storage/classifier.json')
    console.log("Trained")
})
