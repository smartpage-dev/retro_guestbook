<?php
declare(strict_types=1);
if (PHP_SAPI!=='cli') {http_response_code(403);exit;}
require dirname(__DIR__).'/app/Cloud.php';
$cfg=require (getenv('RETRO_CONFIG')?:dirname(__DIR__).'/config.php');
$cfg['publicDir']=dirname(__DIR__,2).'/public_html';
$repo=new CloudRepo($cfg);echo json_encode($repo->cleanup(),JSON_THROW_ON_ERROR).PHP_EOL;
