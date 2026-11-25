<?php
// Copy to config.php OUTSIDE public_html. Never commit a real config or data folder.
return [
    'publicOrigin'=>'https://retro.example.com',
    'adminKey'=>'CHANGE_ME_GENERATE_AT_LEAST_40_RANDOM_CHARACTERS_ADMIN',
    'signingKey'=>'CHANGE_ME_A_DIFFERENT_RANDOM_SECRET_FOR_COOKIES',
    'dataDir'=>__DIR__.'/data',
    'quotaBytes'=>2147483648,
    'maxArchiveBytes'=>2147483648, // Total source video bytes for one client ZIP snapshot
    'maxArchivePartBytes'=>134217728, // 128 MiB per independent ZIP by default; max 256 MiB
    'corsOrigins'=>['http://127.0.0.1:4173','https://appassets.androidplatform.net','retrobooth://app'],
    // Google OAuth Web Application credentials. Create in Google Cloud Console;
    // authorize EXACT redirect: https://YOUR-DOMAIN/api/drive/oauth/callback
    // Keep this file OUTSIDE public_html and NEVER put these in GitHub or Android.
    'googleDriveClientId'=>'',
    'googleDriveClientSecret'=>'',
    'allowLoopbackHttp'=>false,
];
