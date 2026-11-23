import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const args=process.argv.slice(2),origin=args[0],output=args[1];
if(!origin||!output)throw new Error('Usage: node tools/generate-cloud-config.mjs https://YOUR-SUBDOMAIN config.php');
const u=new URL(origin);if(u.protocol!=='https:'||u.pathname!=='/'||u.search||u.hash||u.username||u.password)throw new Error('Use a root HTTPS origin on a dedicated subdomain.');
if(fs.existsSync(output))throw new Error('Refusing to overwrite an existing private configuration.');
const admin=crypto.randomBytes(32).toString('hex'),sign=crypto.randomBytes(32).toString('hex');
const config=`<?php\nreturn [\n 'publicOrigin'=>'${u.origin}',\n 'adminKey'=>'${admin}',\n 'signingKey'=>'${sign}',\n 'dataDir'=>__DIR__.'/data',\n 'quotaBytes'=>2147483648,\n 'corsOrigins'=>['http://127.0.0.1:4173','https://appassets.androidplatform.net'],\n 'allowLoopbackHttp'=>false,\n];\n`;
fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(output,config,{flag:'wx',mode:0o600});
console.log('Private config created:',output);console.log('Cloud Admin key (keep private):',admin);console.log('Upload only beside the private app directory, NEVER into public_html or GitHub.');
