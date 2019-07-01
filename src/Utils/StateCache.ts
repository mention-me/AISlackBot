import NodeCache from 'node-cache'

import {AnswerAcquisition} from '../Interfaces/Internal/AnswerAcquisition'
import {ImproveAnswerAcquisition} from '../Interfaces/Internal/ImproveAnswerAcquisition'
import {ThreadContext} from '../Interfaces/Internal/ThreadContext'
import {ThreadContextGuessedAnswer} from '../Interfaces/Internal/ThreadContextGuessedAnswer'

export class StateCache {

    private cache: NodeCache

    public constructor() {
        this.cache = new NodeCache()
    }

    public setThreadState = (threadId: string, threadState: ThreadContext | ThreadContextGuessedAnswer) => {
        this.cache.set(StateCache.generateThreadCacheKey(threadId), threadState)
    }

    public getThreadState = (threadId: string): ThreadContext | null => {
        return this.getCachedObject(StateCache.generateThreadCacheKey(threadId))
    }

    public deleteThreadState = (threadId: string) => {
        this.deleteCachedObject(StateCache.generateThreadCacheKey(threadId))
    }

    public setAcquisitionState = (threadId: string, acquisition: AnswerAcquisition) => {
        this.cache.set(StateCache.generateAcquisitionCacheKey(threadId), acquisition)
    }

    public getAcquisitionState = (threadId: string): AnswerAcquisition | null => {
        return this.getCachedObject(StateCache.generateAcquisitionCacheKey(threadId)) as AnswerAcquisition
    }

    public deleteAcquisitionState = (threadId: string) => {
        this.deleteCachedObject(StateCache.generateAcquisitionCacheKey(threadId))
    }

    public setImproveAnswerAcquisitionState = (threadId: string, acquisition: ImproveAnswerAcquisition) => {
        this.cache.set(StateCache.generateImproveAnswerAcquisitionCacheKey(threadId), acquisition)
    }

    public getImproveAnswerAcquisitionState = (threadId: string): ImproveAnswerAcquisition | null => {
        return this.getCachedObject(StateCache.generateImproveAnswerAcquisitionCacheKey(threadId)) as ImproveAnswerAcquisition
    }

    public deleteImproveAnswerAcquisitionState = (threadId: string) => {
        this.deleteCachedObject(StateCache.generateImproveAnswerAcquisitionCacheKey(threadId))
    }

    private deleteCachedObject = (key: string) => {
        this.cache.del(key)
    }

    private getCachedObject = (key: string): any => {
        const value: ThreadContext | undefined = this.cache.get(key)
        if (typeof value === 'undefined') {
            return null
        }
        return value
    }

    private static generateThreadCacheKey(threadId: string) {
        return 'THREAD_' + threadId
    }

    private static generateAcquisitionCacheKey(threadId: string) {
        return 'ACQUISITION_' + threadId
    }

    private static generateImproveAnswerAcquisitionCacheKey(threadId: string) {
        return 'IMPROVE_ANSWER_ACQUISITION_' + threadId
    }
}
