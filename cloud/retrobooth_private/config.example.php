<?php
// Copy to config.php OUTSIDE public_html. Never commit a real config or data folder.
return [
    'publicOrigin'=>'https://retro.example.com',
    'adminKey'=>'CHANGE_ME_GENERATE_AT_LEAST_40_RANDOM_CHARACTERS_ADMIN',
    'signingKey'=>'CHANGE_ME_A_DIFFERENT_RANDOM_SECRET_FOR_COOKIES',
    'dataDir'=>__DIR__.'/data',
    'quotaBytes'=>2147483648,
    'corsOrigins'=>['http://127.0.0.1:4173','https://appassets.androidplatform.net','retrobooth://app'],
    'allowLoopbackHttp'=>false,
];
