# NeuroCity Android release

The Android client uses Capacitor 8 with package ID `com.neuroedge.neurocity`. It loads the production platform from `https://neurocity.city`, keeps trusted NeuroCity routes in the app, sends outside web links to the system browser, and includes a local offline screen.

## Local requirements

Install Android Studio, JDK 21, Android SDK 36 and the Android command-line tools. Set `JAVA_HOME`, `ANDROID_HOME` and `ANDROID_SDK_ROOT` when the tools are not already available in the shell.

## Sync and test

```powershell
npm install
npm run android:assets
npm run android:sync
npm run android:open
```

In Android Studio, run the `app` configuration on a physical Android device and verify:

- Home, marketplace search, storefront, product options, bag and checkout.
- Customer sign-in, Google sign-in callback and sign-out.
- Orders and account navigation.
- Merchant dashboard, catalogue editing and image upload.
- Selma image upload and camera permission denial/approval.
- WhatsApp, telephone, email and merchant website links.
- Android back navigation and links to `neurocity.city/stores/...`.
- Offline launch and recovery after reconnecting.

## Signing and verified links

Create the upload key once and store it outside the repository. Never commit the keystore or passwords. Set these environment variables in the release environment:

```powershell
$env:NEUROCITY_UPLOAD_STORE_FILE = 'C:\secure\neurocity-upload.jks'
$env:NEUROCITY_UPLOAD_STORE_PASSWORD = '<store password>'
$env:NEUROCITY_UPLOAD_KEY_ALIAS = 'neurocity-upload'
$env:NEUROCITY_UPLOAD_KEY_PASSWORD = '<key password>'
```

The Android build signs the release only when all four values are present. Keep the passwords in a password manager or CI secret store rather than a checked-in file.

After Google Play App Signing is enabled, copy the SHA-256 fingerprint for the **app signing certificate** from Play Console. Publish `https://neurocity.city/.well-known/assetlinks.json` with that fingerprint and package name `com.neuroedge.neurocity`. Verified links cannot be completed before the signing fingerprint exists.

## Release bundle

Increase `versionCode` for every Play release and update `versionName` for user-visible releases in `android/app/build.gradle`. Then run:

```powershell
npm run android:bundle
```

The bundle is created under `android/app/build/outputs/bundle/release/`. Verify that it is signed before uploading it:

```powershell
jarsigner -verify -verbose -certs android/app/build/outputs/bundle/release/app-release.aab
```

An unsigned bundle is useful for build validation but Play Console will reject it. Upload the verified signed `.aab` to an internal Play Console test track before production review.

## Play Console material still required

- Production privacy-policy URL and completed Data safety answers.
- Phone and tablet screenshots captured from the release build.
- Short and full store descriptions, category and support contact.
- Content rating, ads declaration and app-access instructions for reviewer sign-in.
- The final app-signing certificate fingerprint for verified links.
