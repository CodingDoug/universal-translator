/*
 * Copyright 2018 Google Inc.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package com.hyperaware.android.babelfire

import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.media.MediaRecorder
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.view.Menu
import android.view.MenuItem
import android.view.View
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.firebase.ui.auth.AuthUI
import com.google.android.material.snackbar.Snackbar
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.firestore.*
import com.google.firebase.storage.FirebaseStorage
import com.google.firebase.storage.StorageMetadata
import java.io.File

class MainActivity : AppCompatActivity() {

    companion object {
        private const val TAG = "MainActivity"
        private const val RC_SIGN_IN: Int = 42
        private const val MY_PERMISSIONS_REQUEST_RECORD_AUDIO = 1

        private val LANGUAGE_CODES = mapOf(
            "English" to "en",
            "Español" to "es",
            "Português" to "pt",
            "Deutsch" to "de",
            "日本語" to "ja",
            "हिन्दी" to "hi",
            "Nederlands" to "nl",
            "Français" to "fr",
            "Polski" to "pl",
            "עברית" to "he",
            "русский" to "ru",
            "Українська" to "uk",
            "汉语" to "zh",
            "ภาษาไทย" to "th"
        )
    }

    private val storage = FirebaseStorage.getInstance()
    private val auth = FirebaseAuth.getInstance()
    private val firestore = FirebaseFirestore.getInstance()

    private lateinit var vMain: View
    private lateinit var btnRecord: Button
    private lateinit var tvTranslated: TextView
    private lateinit var spinnerLanguages: Spinner

    private var currentLanguage: String? = null

    private val authStateListener = MyAuthStateListener()
    private var user: FirebaseUser? = null

    private var listenerRegistration: ListenerRegistration? = null


    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        initViews()

        checkPermissions()

        user = auth.currentUser
        if (user == null) {
            startActivityForResult(
                AuthUI.getInstance()
                    .createSignInIntentBuilder()
                    .setAvailableProviders(listOf(
                        AuthUI.IdpConfig.GoogleBuilder().build()
                    ))
                    .build(),
                RC_SIGN_IN)
        }
    }

    override fun onStart() {
        super.onStart()
        auth.addAuthStateListener(authStateListener)
    }

    override fun onStop() {
        auth.removeAuthStateListener(authStateListener)
        super.onStop()
    }

    private fun initViews() {
        setContentView(R.layout.activity_main)

        vMain = findViewById(R.id.activity_main)

        btnRecord = findViewById(R.id.record_button)
        btnRecord.setOnClickListener(RecordButtonOnClickListener())

        spinnerLanguages = findViewById(R.id.language_choices)
        tvTranslated = findViewById(R.id.translated_text)

        val list = LANGUAGE_CODES.keys.asSequence().sorted().toList()
        val adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, list)
        spinnerLanguages.adapter = adapter
        spinnerLanguages.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>, view: View, position: Int, id: Long) {
                currentLanguage = LANGUAGE_CODES[spinnerLanguages.selectedItem.toString()]
            }

            override fun onNothingSelected(parent: AdapterView<*>) {}
        }
        currentLanguage = LANGUAGE_CODES[spinnerLanguages.selectedItem.toString()]
    }

    override fun onCreateOptionsMenu(menu: Menu?): Boolean {
        super.onCreateOptionsMenu(menu)
        menuInflater.inflate(R.menu.activity_main, menu)
        return true
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        if (super.onOptionsItemSelected(item)) {
            return true
        }

        return when (item.itemId) {
            R.id.mi_log_out -> {
                AuthUI.getInstance()
                    .signOut(this)
                    .addOnCompleteListener(this) {
                        startActivity(Intent(this, MainActivity::class.java))
                        finish()
                    }
                true
            }
            else -> false
        }
    }


    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)

        if (requestCode == RC_SIGN_IN) {
            if (resultCode != Activity.RESULT_OK) {
                // require successful login
                finish()
            }
        }
    }


    private fun checkPermissions() {
        if (ContextCompat.checkSelfPermission(this, "android.permission.RECORD_AUDIO") != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf("android.permission.RECORD_AUDIO"), MY_PERMISSIONS_REQUEST_RECORD_AUDIO)
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<String>, grantResults: IntArray) {
        when (requestCode) {
            MY_PERMISSIONS_REQUEST_RECORD_AUDIO -> {
                if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                    snack("Recording permission granted")
                }
                else {
                    snack("Recording permission denied")
                }
            }
        }
    }


    private inner class RecordButtonOnClickListener : View.OnClickListener {
        private lateinit var mediaRecorder: MediaRecorder
        private lateinit var recordingFile: File
        private var isRecording = false

        private fun startRecording() {
            mediaRecorder = MediaRecorder()
            mediaRecorder.setAudioSource(MediaRecorder.AudioSource.MIC)
            mediaRecorder.setOutputFormat(MediaRecorder.OutputFormat.AMR_NB)
            mediaRecorder.setAudioEncoder(MediaRecorder.AudioEncoder.AMR_NB)

            val outputDir = this@MainActivity.cacheDir
            recordingFile = File.createTempFile("audio", ".amr", outputDir)
            Log.d(TAG, "Recording to $recordingFile")
            mediaRecorder.setOutputFile(recordingFile.path)

            mediaRecorder.prepare()
            mediaRecorder.start()
        }

        private fun stopRecording() {
            mediaRecorder.stop()
            mediaRecorder.reset()
            mediaRecorder.release()
        }

        override fun onClick(v: View?) {
            tvTranslated.text = ""
            if (!isRecording) {
                isRecording = true
                btnRecord.setText(R.string.stop_recording)

                startRecording()
            }
            else {
                isRecording = false
                btnRecord.setText(R.string.record)

                stopRecording()
                processRecording(recordingFile)
            }
        }
    }


    private fun processRecording(recordingFile: File) {
        listenerRegistration?.remove()

        val docRef = firestore
            .collection("uploads")
            .document()
        val storageRef = storage.reference
            .child("uploads")
            .child(user!!.uid)
            .child(docRef.id)

        val recording = Recording()
        recording.contentType = "audio/amr"
        recording.encoding = "AMR"
        recording.sampleRate = 8000
        recording.language = currentLanguage
        recording.uid = user!!.uid
        recording.storagePath = storageRef.path

        docRef.set(recording)
            .continueWithTask {
                val metadata = StorageMetadata.Builder()
                    .setContentType(recording.contentType)
                    .build()
                storageRef.putFile(Uri.fromFile(recordingFile), metadata)
            }
            .addOnSuccessListener(this@MainActivity) {
                snack("Uploaded!")
            }
            .addOnFailureListener(this@MainActivity) {e ->
                snack("Failed to upload audio :(")
                Log.e(TAG, "Error uploading audio or metadata", e)
                docRef.delete()
            }

        listenerRegistration = docRef.addSnapshotListener(this, MySnapshotListener())
    }


    private inner class MySnapshotListener : EventListener<DocumentSnapshot> {
        override fun onEvent(s: DocumentSnapshot?, e: FirebaseFirestoreException?) {
            if (e != null) {
                snack("Something went wrong with Firestore")
                Log.e(TAG, "Firestore error", e)
                return
            }

            val snapshot = s!!
            val trans = snapshot["translations"]
            val error = snapshot["error"]
            if (error != null && error is String) {
                when (error) {
                    "NO_TRANSLATION" -> {
                        snack("No translations available")
                    }
                    else -> {
                        snack("Unknown error")
                    }
                }
            }
            else if (trans != null && trans is Map<*, *>) {
                val translations = safeMapCast(trans)
                val sb = StringBuilder()
                val sorted = translations.entries.sortedBy { entry -> entry.key }
                sorted.forEach { entry ->
                    val lang = entry.key
                    val text = entry.value
                    sb.append("$lang: $text\n")
                }
                tvTranslated.text = sb.toString()
            }
        }

        private fun safeMapCast(map: Map<*, *>): Map<String, String> {
            return map.entries.associate { it.key.toString() to it.value.toString() }
        }
    }


    private fun snack(message: String) {
        Snackbar.make(vMain, message, Snackbar.LENGTH_SHORT).show()
    }


    private inner class MyAuthStateListener: FirebaseAuth.AuthStateListener {
        override fun onAuthStateChanged(auth: FirebaseAuth) {
            Log.d(TAG, "auth ${auth.currentUser != null}")
            if (auth.currentUser != null) {
                user = auth.currentUser
//                testDocumentListen()
            }
        }
    }

    // For testing during development
//    private fun testDocumentListen() {
//        listenerRegistration?.remove()
//        val docRef = firestore.collection("uploads").document("7sjhqBhPMWw4afE7xTn2")
//        listenerRegistration = docRef.addSnapshotListener(this, MySnapshotListener())
//    }

}
