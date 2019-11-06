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

window.addEventListener('DOMContentLoaded', e => {
    const languageSelect = document.getElementById('language')
    const transript = document.getElementById('transcript')
    const translation = document.getElementById('translation')

    let language = languageSelect.children[languageSelect.selectedIndex].value
    let lastData

    languageSelect.addEventListener('change', e => {
        language = languageSelect.children[languageSelect.selectedIndex].value
        if (lastData.translations) {
            speak(lastData.translations[language], language)
        }
    })

    const firestore = firebase.firestore()
    const uploads = firestore.collection('uploads')

    function onNext(querySnapshot) {
        console.log('snap!', querySnapshot.size)
        if (querySnapshot.size > 0) {
            lastData = querySnapshot.docs[0].data()
            console.log(lastData)
            // The translations field of the document contains a mapping
            // of language code to text in that language.
            if (lastData.translations) {
                updateDisplay(lastData.translations)
                speak(lastData.translations[language], language)
            }
        }
    }

    function onError(err) {
        console.error('Query error', err)
    }

    const unsubscribe = uploads
        .where('timeCreated', '>', new Date())
        .orderBy('timeCreated', 'desc')
        .limit(1)
        .onSnapshot(onNext, onError)

    function updateDisplay(translations) {
        translation.textContent = JSON.stringify(translations, null, 4)
    }

    function speak(text, lang) {
        const utterance = new SpeechSynthesisUtterance()
        utterance.text = text
        utterance.lang = lang
        window.speechSynthesis.speak(utterance)
    }

});
