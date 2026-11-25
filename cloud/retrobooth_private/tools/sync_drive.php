<?php
declare(strict_types=1);
/** PHP CLI ONLY. Configure a separate Hostinger cron job (e.g. every 5 minutes). */
if(PHP_SAPI!=='cli'){http_response_code(403);exit;}
require dirname(__DIR__).'/app/DriveWorker.php';
$cfg=require (getenv('RETRO_CONFIG')?:dirname(__DIR__).'/config.php');
$cfg['publicDir']=dirname(__DIR__,2).'/public_html';
$repo=new CloudRepo($cfg);$lock=fopen(rtrim($cfg['dataDir'],'/').'/.drive-worker.lock','c+b');
if(!$lock||!flock($lock,LOCK_EX|LOCK_NB)){fwrite(STDERR,"Drive worker already running or lock unavailable\n");exit(2);}
try{$result=(new DriveWorker($repo,new DriveBridge($cfg,$repo)))->run();echo json_encode($result,JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR).PHP_EOL;
    exit(empty($result['errors'])?0:1);
}catch(Throwable $e){fwrite(STDERR,'Drive worker failed: '.($e instanceof CloudError?$e->reason:get_class($e)).PHP_EOL);exit(1);}
finally{flock($lock,LOCK_UN);fclose($lock);}
