# BabelFire - a universal translator

This is a Firebase and Google Cloud powered app used for demo purposes.  It implements a "universal translator", where an Android client app records some speech, uploads it to Google Cloud, and receives translations in a variety of languages.  A client web app also receives the translates and speaks them out loud using the browser's speech synthesis API.

This is a rewrite of [Jen Tong's similar project](https://github.com/mimming/zero-to-app-universal-translator).

## What's here

At the top level, you'll find:

- `android` - Android app that receives speech and uploads it to Google Cloud for processing
- `backend` - TypeScript for Cloud Functions on the backend
- `web` - and the JS / HTML translation viewer

## Setup

This setup assumes you are already familiar with how Firebase and Google Cloud projects work.

### Project setup

1. Create a Firebase project in the [Firebase console](https://console.firebase.google.com/)
1. Go to the Authentication product tab and enable Google authentication.
1. Go to the Database product tab and enable Firestore.
1. Go to the Storage product tab and enable Cloud Storage.
1. Enable Blaze plan billing on the project (required for the Google Cloud APIs used here)
1. In the [Cloud console](https://console.cloud.google.com/) for the same project, enable both the Cloud Translation API and the Cloud Speech API.
1. Install the [Firebase CLI](https://firebase.google.com/docs/cli/)

### Backend project setup

1. `cd backend`
1. `firebase use --add`, then select the newly created project, and give it the alias "default"
1. `firebase deploy` to deploy Cloud Functions code, Firestore security rules, and Cloud Storage security rules
1. Optional - if you want to run the scripts in `functions/dev`, download a service account and place it in `service-account-credentials.json` in the `functions` folder.

### Web app setup

1. `cd web`
1. `firebase use --add`, then select the newly created project, and give it the alias "default"
1. `firebase deploy` to deploy the web app to Firebase Hosting
1. Note the given URL for the web site

### Android app setup

1. `cd android`
1. Add the app to your project in the Firebase console, and be sure to provide the SHA-1 of your debug signing key
1. Download the `google-services.json` file for your project from the Firebase console, move it to the `app` folder
1. `./gradlew assembleDebug`
1. Install the APK on your emulator or device

## Use the demo app

1. Open the web app using the URL given after it was deployed (*.firebaseapp.com)
1. Select the language in which you want to hear a translation
1. Launch the Android app
1. Select the language you want to translate from the dropdown
1. Push the record button, speak in that language, then push the button again
1. Wait for the translations to appear in both the Android app and the web app.  The web app will also speak it out loud in the selected language

## Firebase and Google Cloud products used

- [Cloud Firestore](https://firebase.google.com/docs/firestore/)
- [Firebase Storage](https://firebase.google.com/docs/storage/)
- [Cloud Functions for Firebase](https://firebase.google.com/docs/functions/)
- [Firebase Hosting](https://firebase.google.com/docs/hosting/)
- [Cloud Speech-to-Text API](https://cloud.google.com/speech-to-text/)
- [Cloud Translation API](https://cloud.google.com/translate/)

## Contributing

Please read and follow the steps in the [CONTRIBUTING.md](CONTRIBUTING.md)

## License

The code in this project is licensed under the Apache License 2.0.

```text
Copyright 2018 Google LLC

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

## Disclaimer

This is not an officially supported Google product.
