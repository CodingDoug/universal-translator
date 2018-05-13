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

export {}

const serviceAccount = require('../../service-account-credentials.json')

const speech = require('@google-cloud/speech')
const fs = require('fs')

const client = new speech.SpeechClient({ credentials: serviceAccount })

const request = {
    config: {
        languageCode: "en-US",
        sampleRateHertz: 8000,
        encoding: 'AMR'
    },
    audio: {
        content: fs.readFileSync('/Users/dougstevenson/Downloads/KlPpKz7P8XqOhIYfsy7i.amr').toString('base64'),
    }
}

client.recognize(request)
.then((response) => {
    const transcript = response[0].results[0].alternatives[0].transcript;
    console.log(transcript)
})
