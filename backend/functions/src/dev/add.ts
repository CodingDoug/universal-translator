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

import * as admin from 'firebase-admin'

const serviceAccount = require("../service-account-credentials.json")

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
})

const db = admin.firestore()
const ref = db.collection('uploads').doc()
ref.set({
    contentType: "audio/amr",
    encoding: "AMR",
    language: "en-US",
    sampleRate: 8000,
    storagePath: "/uploads/PYrPFQNDFzOGChek83QZQOVQcXj1/awFFn3i5rSxJWsN8pCcW.amr"
})
.then((x) => {
    console.log("ok", ref.id)
})
.catch((err) => {
    console.error(err)
})
