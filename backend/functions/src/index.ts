/*
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const sourceMapSupport = require('source-map-support')
sourceMapSupport.install()

import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { v2 as translate } from '@google-cloud/translate'
const speech = require('@google-cloud/speech')

admin.initializeApp()

const firestore = admin.firestore()
const bucket = admin.storage().bucket()

const speechClient = new speech.SpeechClient()
const translateClient = new translate.Translate()

const LANGUAGES = ['en', 'es', 'pt', 'de', 'ja', 'hi', 'nl', 'fr', 'pl', 'he', 'ru', 'uk', 'zh', 'th', 'no']

const UPLOADS_COLLECTION = 'uploads'
const UPLOADS_PREFIX = 'uploads'

interface RecordingFileInfo {
    path: string
    uid: string
    documentId: string
}

/**
 * The contents of documents in the "uploads" collection that track the
 * metadata of each accompanying file in the "uploads" folder in Storage.
 */

 interface RecordingMetadata {
    contentType: string
    encoding: string
    sampleRate: number
    language: string
    uid: string
    storagePath: string
}

interface Translation {
    language: string
    translation: string
}

/**
 * When a file is uplaoded to Cloud Storage in the "uploads" folder, perform
 * speech detection and translation on it, and write the results to its
 * accompanying Firestore document.
 */

export const onRecordingFileUpload =
functions.storage.object().onFinalize(async object => {
    let recordingFileInfo: RecordingFileInfo
    try {
        // Extract some information from the uploaded file
        recordingFileInfo = getRecordingFileInfo(object)
    }
    catch (err) {
        console.log(`Skipping file ${object.name}:`, err)
        return
    }

    // Get the metadata document with the same id as the storage upload
    const docRef = firestore
        .collection(UPLOADS_COLLECTION)
        .doc(recordingFileInfo.documentId)
    const snapshot = await docRef.get()

    let recordingMetadata: RecordingMetadata
    if (snapshot) {
        recordingMetadata = snapshot.data() as RecordingMetadata
        console.log('recordingMetadata:', recordingMetadata)
    }
    else {
        console.error("Firestore document not found")
        return
    }

    try {
        // Perform speech recognition on the uploaded file
        const transcript = await recognizeSpeech(recordingMetadata)
        console.log('transcript:', transcript)

        // Perform translations of the text of the speech
        const translations = await translateSpeech(transcript, recordingMetadata.language)
        console.log('translations:', translations)

        // Map each language code to the translated text
        const translationsMap = translations.reduce<{[key:string]: string}>((map, obj) => {
            map[obj.language] = obj.translation
            return map
        }, {} as {string: string})

        // And update the original document with the translations
        await docRef.update({ translations: translationsMap })
    }
    catch (err) {
        console.error(err)
        await docRef.update({ error: "NO_TRANSLATION" })
    }
})


/**
 * When a recording file is deleted from storge, also delete its corresponding
 * metadata document.
 */

export const onRecordingFileDelete =
functions.storage.object().onDelete(async object => {
    const recordingFileInfo = getRecordingFileInfo(object)
    const docRef = firestore.collection(UPLOADS_COLLECTION).doc(recordingFileInfo.documentId)
    await docRef.delete()
})


/**
 * When a metadata document is deleted, also delete its corresponding file in
 * storage.
 */

export const onRecordingDocumentDelete =
functions.firestore.document(`${UPLOADS_COLLECTION}/{id}`).onDelete(async snapshot => {
    const data = snapshot.data() as RecordingMetadata
    console.log(data)
    const file = bucket.file(data.storagePath)
    const exists = await file.exists()
    if (exists[0]) {
        await file.delete()
    }
})


/**
 * Parse the name of a file uploaded to storage to get some information
 * embedded inside.
 *
 * @param object the object metadata from Cloud Functions
 * @returns a RecordingFile object
 */

function getRecordingFileInfo(object: functions.storage.ObjectMetadata): RecordingFileInfo {
    const path = object.name   //  uploads/{uid}/{docId}
    if (!path) {
        throw Error("File name was undefined")
    }
    const parts = path.split('/')
    if (parts.length !== 3) {
        throw new Error("Path isn't three parts long")
    }

    if (parts[0] !== UPLOADS_PREFIX) {
        throw new Error(`File isn't in ${UPLOADS_PREFIX}`)
    }

    const [ , uid, documentId] = parts
    return { path, uid, documentId }
}


async function recognizeSpeech(metadata: RecordingMetadata): Promise<string> {
    const languageCode = metadata.language
    const sampleRateHertz = metadata.sampleRate
    const encoding = metadata.encoding

    const recognizeRequest = {
        config: {
            languageCode,
            sampleRateHertz,
            encoding
        },
        audio: {
            uri : `gs://${bucket.name}${metadata.storagePath}`
        }
    }

    console.info('recognizeRequest:', recognizeRequest)
    const recognizeResponse = await speechClient.recognize(recognizeRequest)
    console.log('recognizeResponse:', recognizeResponse)
    if (recognizeResponse.length === 0
        || recognizeResponse[0].results.length === 0
        || recognizeResponse[0].results[0].alternatives.length === 0) {
            throw new Error("No speech recognized")
    }
    return recognizeResponse[0].results[0].alternatives[0].transcript
}


async function translateSpeech(transcript: string, fromLanguage: string): Promise<Translation[]> {
    const translatePromises = LANGUAGES.map(async toLanguage => {
        if (fromLanguage !== toLanguage) {
            const request: translate.TranslateRequest = {
                from: fromLanguage,
                to: toLanguage,
                format: 'text',
            }
            const [ result ] = await translateClient.translate(transcript, request)
            return {
                language: toLanguage,
                translation: result
            }
        }
        else {
            // Don't translate to same language, use transcript verbatim
            return {
                language: toLanguage,
                translation: transcript
            }
        }
    })

    return Promise.all(translatePromises)
}
