# NeuroCity Android release

The Android client uses Capacitor 8 with package ID `com.neuroedge.neurocity`. It loads the production platform from `https://neurocity.city`, keeps trusted NeuroCity routes in the app, sends outside web links to the system browser, and includes a local offline screen.

## Local requirements

Install Android Studio with its bundled JDK, Android SDK 36 and command-line tools. Open Android Studio once and allow it to install the SDK components. Set `ANDROID_HOME` if Android Studio does not expose the SDK automatically.

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

Create the upload key once and store it outside the repository. Configure the release signing values through an untracked Gradle properties file or CI secrets. Never commit the keystore or passwords.

After Google Play App Signing is enabled, copy the SHA-256 fingerprint for the **app signing certificate** from Play Console. Publish `https://neurocity.city/.well-known/assetlinks.json` with that fingerprint and package name `com.neuroedge.neurocity`. Verified links cannot be completed before the signing fingerprint exists.

## Release bundle

Increase `versionCode` for every Play release and update `versionName` for user-visible releases in `android/app/build.gradle`. Then run:

```powershell
npm run android:bundle
```

The signed bundle is created under `android/app/build/outputs/bundle/release/`. Upload the `.aab` to an internal Play Console test track before production review.

## Play Console material still required

- Production privacy-policy URL and completed Data safety answers.
- Phone and tablet screenshots captured from the release build.
- Short and full store descriptions, category and support contact.
- Content rating, ads declaration and app-access instructions for reviewer sign-in.
- The final app-signing certificate fingerprint for verified links.
