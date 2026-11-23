# Persistent TEST signing key

The first workflow can run without secrets. Its debug key may change on each clean runner, so later APKs may not install over earlier ones. Export all recordings before any uninstall or Clear storage operation.

A persistent TEST key makes repeat testing easier. It is not a production signing setup. Keep this key and its passwords in a private backup, outside the repository. Do not include it in source ZIPs.

With JDK 17 installed, run this interactively in a private folder (not the repo):

```sh
keytool -genkeypair -keystore retrobooth-test.jks -alias retrobooth-test -keyalg RSA -keysize 2048 -validity 3650
```

Choose your own passwords and record them privately. The key password may be the same as the store password, depending on the generated keystore format; use the actual values.

Encode the file as a single Base64 value. Python works across Windows/Mac/Linux:

```sh
python -c "import base64,pathlib; print(base64.b64encode(pathlib.Path('retrobooth-test.jks').read_bytes()).decode())"
```

Do not share the printed value. In your GitHub repository's Settings > Secrets and variables > Actions, add these repository secrets:

| Secret | Value |
| --- | --- |
| RETRO_TEST_KEYSTORE_BASE64 | The complete Base64 value of your private test keystore |
| RETRO_TEST_STORE_PASSWORD | Keystore password |
| RETRO_TEST_KEY_ALIAS | retrobooth-test, or the alias you actually created |
| RETRO_TEST_KEY_PASSWORD | Password for that private key |

Run the workflow again. Its BUILD_INFO should say `persistent-test-key`. The temporary key file is removed at the end of the Android job. Do not print these secrets from custom steps.

Switching from an earlier ephemeral key to this persistent key can itself require a clean install. Export first. Keep the same application ID, same key and a nondecreasing versionCode when making future test releases. Increment versionCode for a genuinely newer Android release.

The supplied release APK and AAB remain unsigned. A production app needs a separate release-signing, distribution, privacy and device-acceptance process.
