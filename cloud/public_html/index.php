<?php
declare(strict_types=1);
require dirname(__DIR__).'/retrobooth_private/app/Cloud.php';
require dirname(__DIR__).'/retrobooth_private/app/Drive.php';
ini_set('display_errors','0');
header('X-Content-Type-Options: nosniff');header('Referrer-Policy: no-referrer');header('X-Frame-Options: DENY');header('Cache-Control: no-store');
function rb_json(array $data,int $status=200): never {http_response_code($status);header('Content-Type: application/json; charset=utf-8');echo json_encode($data,JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);exit;}
try {
    $configFile=getenv('RETRO_CONFIG')?:dirname(__DIR__).'/retrobooth_private/config.php';
    if (!is_file($configFile)) rb_fail(503,'setup_required_private_config_missing');
    $cfg=require $configFile;
    foreach(['adminKey','signingKey'] as $key) if (!is_string($cfg[$key]??null)||strlen($cfg[$key])<40||str_contains($cfg[$key],'CHANGE_ME')) rb_fail(503,'setup_required_strong_unique_keys');
    $cfg['publicDir']=__DIR__;$cfg['quotaBytes']??=2147483648;$cfg['corsOrigins']??=[];
    $origin=rtrim((string)($cfg['publicOrigin']??''),'/');$parts=parse_url($origin);
    $dev=($cfg['allowLoopbackHttp']??false)===true && PHP_SAPI==='cli-server' && in_array($parts['host']??'', ['127.0.0.1','localhost'],true);
    if (!$parts||(isset($parts['user'])||isset($parts['pass']))||isset($parts['query'])||isset($parts['fragment'])||!empty($parts['path'])||!in_array($parts['scheme']??'', $dev?['http','https']:['https'],true)) rb_fail(503,'invalid_public_origin');
    $cfg['publicOrigin']=$origin;
    $expectedHost=$parts['host'].(isset($parts['port'])?':'.$parts['port']:'');
    if (strtolower($_SERVER['HTTP_HOST']??'')!==strtolower($expectedHost)) rb_fail(400,'unexpected_host');
    if (!$dev && (($_SERVER['HTTPS']??'')!=='on'&&($_SERVER['HTTPS']??'')!=='1')) rb_fail(400,'https_required');
    $requestOrigin=$_SERVER['HTTP_ORIGIN']??'';
    if ($requestOrigin && $requestOrigin!==$origin) {
        if (!in_array($requestOrigin,$cfg['corsOrigins'],true)) rb_fail(403,'origin_not_allowed');
        header('Access-Control-Allow-Origin: '.$requestOrigin);header('Vary: Origin');
        header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
        header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Chunk-SHA256');
        header('Access-Control-Max-Age: 300');
    }
    $method=$_SERVER['REQUEST_METHOD']??'GET';$route=parse_url($_SERVER['REQUEST_URI']??'/',PHP_URL_PATH);
    if ($method==='OPTIONS') {http_response_code(204);exit;}
    if (!str_starts_with($route,'/api/')) {
        $file=match($route) {'/','/booth','/booth/'=>__DIR__.'/booth/index.html','/guest','/guest/'=>__DIR__.'/guest/index.html','/client','/client/'=>__DIR__.'/client/index.html','/admin','/admin/'=>__DIR__.'/admin/index.html',default=>null};
        if (!$file || !is_file($file)) rb_fail(404,'not_found');
        header('Content-Type: text/html; charset=utf-8');readfile($file);exit;
    }
    $api=new CloudApi($cfg);
    // OAuth callback is the ONLY Drive endpoint callable without the Admin Bearer
    // token: its state is single-use, random, short-lived and created by Admin.
    if ($route==='/api/drive/oauth/callback' && $method==='GET') {
        header('Content-Type: text/html; charset=utf-8');
        try { (new DriveBridge($cfg,$api->repo))->callback($_GET);
            echo '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="referrer" content="no-referrer"><title>RetroBooth Google Drive</title></head><body><h2>Google Drive connected / folder selected</h2><p>Return to the RetroBooth Cloud Admin tab and press Refresh Drive status. You can close this tab.</p></body></html>';
        } catch(CloudError $e) {http_response_code($e->status);
            echo '<!doctype html><html><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"></head><body><h2>Google Drive setup was not completed</h2><p>'.htmlspecialchars($e->reason,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8').'</p><p>Return to Cloud Admin to retry.</p></body></html>';
        }exit;
    }
    $auth=$_SERVER['HTTP_AUTHORIZATION']??$_SERVER['REDIRECT_HTTP_AUTHORIZATION']??'';
    $token=preg_match('/^Bearer ([A-Za-z0-9_.-]{32,180})$/D',$auth,$m)?$m[1]:'';
    if (preg_match('#^/api/media/([a-f0-9]{32})$#D',$route,$m) && in_array($method,['GET','HEAD'],true)) {
        $media=$api->media($m[1],$_COOKIE['retro_media']??'');$h=$media['handle'];
        try {
            $range=$_SERVER['HTTP_RANGE']??null;$etag='"'.$media['etag'].'"';
            if (isset($_SERVER['HTTP_IF_RANGE']) && $_SERVER['HTTP_IF_RANGE']!==$etag) $range=null;
            try {[$start,$end,$code]=rb_range($range,$media['size']);}
            catch(CloudError $e){header('Content-Range: bytes */'.$media['size']);throw $e;}
            http_response_code($code);header('Content-Type: '.$media['mime']);header('Accept-Ranges: bytes');header('ETag: '.$etag);
            header('Content-Length: '.($end-$start+1));
            if ($code===206) header('Content-Range: bytes '.$start.'-'.$end.'/'.$media['size']);
            if (isset($_GET['download'])) header('Content-Disposition: attachment; filename="RetroBooth_'.$m[1].($media['mime']==='video/mp4'?'.mp4':'.webm').'"');
            if ($method==='HEAD') exit;
            if (fseek($h,$start)!==0) rb_fail(503,'media_seek_failed');
            $remaining=$end-$start+1;
            while($remaining>0 && !connection_aborted()) {$bytes=fread($h,min(65536,$remaining));if ($bytes===false||$bytes==='') break;echo $bytes;$remaining-=strlen($bytes);}
        } finally {fclose($h);}exit;
    }
    if (preg_match('#^/api/client/zip/([a-f0-9]{32})/([0-9]{1,3})$#D',$route,$m) && in_array($method,['GET','HEAD'],true)) {
        $archive=$api->archiveDownload($m[1],(int)$m[2],$_COOKIE['retro_bundle']??'');$h=$archive['handle'];
        try {
            $size=$archive['size'];$range=$_SERVER['HTTP_RANGE']??null;
            try {[$start,$end,$code]=rb_range($range,$size);}
            catch(CloudError $e){header('Content-Range: bytes */'.$size);throw $e;}
            http_response_code($code);header('Content-Type: application/zip');header('Accept-Ranges: bytes');header('Content-Length: '.($end-$start+1));
            header('Content-Disposition: attachment; filename="'.$archive['name'].'"');
            if($code===206)header('Content-Range: bytes '.$start.'-'.$end.'/'.$size);
            if($method==='HEAD')exit;
            if(fseek($h,$start)!==0)rb_fail(503,'archive_seek_failed');
            $left=$end-$start+1;
            while($left>0 && !connection_aborted()){$chunk=fread($h,min(65536,$left));if($chunk===false||$chunk==='')break;echo $chunk;$left-=strlen($chunk);}
        } finally {fclose($h);}exit;
    }
    $api->rateLimit($_SERVER['REMOTE_ADDR']??'unknown',$token);
    $binary='';$body=[];$limit=$method==='PUT'?524288:16384;
    if (isset($_SERVER['CONTENT_LENGTH']) && (int)$_SERVER['CONTENT_LENGTH']>$limit) rb_fail(413,'request_too_large');
    if (in_array($method,['POST','PUT'],true)) {
        $raw=file_get_contents('php://input',false,null,0,$limit+1);if (strlen($raw)>$limit) rb_fail(413,'request_too_large');
        if ($method==='PUT') {$binary=$raw;if (($_SERVER['CONTENT_TYPE']??'')!=='application/octet-stream') rb_fail(415,'binary_content_type_required');}
        else {
            if (!str_starts_with($_SERVER['CONTENT_TYPE']??'','application/json')) rb_fail(415,'json_content_type_required');
            try {$body=json_decode($raw,true,32,JSON_THROW_ON_ERROR);}catch(Throwable $e){rb_fail(400,'invalid_json');}
            if (!is_array($body)||array_is_list($body)&&$body!==[]) rb_fail(400,'json_object_required');
        }
    }
    if (str_starts_with($route,'/api/admin/drive/')) {
        if(!hash_equals($cfg['adminKey'],$token))rb_fail(401,'unauthorized');
        $drive=new DriveBridge($cfg,$api->repo);
        $op=substr($route,strlen('/api/admin/drive/'));
        if ($op==='status' && $method==='GET') {
            $status=$drive->publicStatus();
            $status['events']=$api->repo->transaction(function(array &$s){$rows=[];
                foreach($s['events'] as $e){$total=0;$done=0;$failed=0;$deleting=0;
                    foreach($s['clips'] as $c){if($c['eventId']!==$e['id'])continue;
                        if($c['status']==='deleted'){if(($c['driveSync']['status']??'')==='delete_pending')$deleting++;continue;}
                        if($c['status']!=='ready')continue;$total++;
                        if(($c['driveSync']['status']??'')==='ready')$done++;
                        if(($c['driveSync']['status']??'')==='error')$failed++;
                    }
                    $rows[]=['id'=>$e['id'],'name'=>$e['title'],'enabled'=>($e['driveEnabled']??false)===true,
                        'folder'=>$e['driveFolder']??null,'ready'=>$done,'total'=>$total,'failed'=>$failed,'deleting'=>$deleting];}
                return $rows;});
            rb_json($status);
        }
        if($op==='start' && $method==='POST')rb_json($drive->begin((string)($body['mode']??'')));
        if($op==='options' && $method==='POST')rb_json($drive->updateOptions($body));
        if($op==='folder' && $method==='POST')rb_json(['folder'=>$drive->createBaseFolder((string)($body['name']??''))]);
        if($op==='disconnect' && $method==='POST'){
            if(($body['confirm']??'')!=='DISCONNECT')rb_fail(400,'confirmation_required');rb_json($drive->disconnect());
        }
        if($op==='event' && $method==='POST') {
            if(!is_bool($body['enabled']??null))rb_fail(400,'invalid_event_drive_option');
            $id=(string)($body['eventId']??'');
            if($body['enabled']===true&&empty($drive->settings()['parent']['id']))rb_fail(409,'select_google_drive_parent_first');
            rb_json($api->repo->transaction(function(array &$s)use($id,$body){
                if(!isset($s['events'][$id]))rb_fail(404,'event_not_found');
                $s['events'][$id]['driveEnabled']=$body['enabled'];return ['eventId'=>$id,'enabled'=>$body['enabled']];}));
        }
        if($op==='retry' && $method==='POST') {
            $id=(string)($body['clipId']??'');
            rb_json($api->repo->transaction(function(array &$s)use($id){
                if(!isset($s['clips'][$id]))rb_fail(404,'clip_not_found');
                $c=&$s['clips'][$id];if($c['status']!=='ready'||!empty($c['driveSync']['fileId']))rb_fail(409,'drive_retry_not_allowed');
                $c['driveSync']['retryAt']=0;$c['driveSync']['retries']=0;$c['driveSync']['status']='pending';$c['driveSync']['error']='';
                return ['queued'=>true];}));
        }
        rb_fail(404,'drive_admin_route_not_found');
    }
    $result=$api->handle($method,$route,$token,$body,$binary,$_SERVER['HTTP_X_CHUNK_SHA256']??'');
    if (isset($result['archiveGrant'])) {
        if ($requestOrigin && $requestOrigin!==$origin) rb_fail(403,'archive_grants_require_same_origin');
        $g=$result['archiveGrant'];
        setcookie('retro_bundle',$g['value'],['expires'=>$g['expires'],'path'=>'/api/client/zip','secure'=>!$dev,'httponly'=>true,'samesite'=>'Strict']);
        unset($result['archiveGrant']);$result['authorized']=true;
    }
    if (isset($result['mediaGrant'])) {
        $g=$result['mediaGrant'];
        if ($requestOrigin && $requestOrigin!==$origin) rb_fail(403,'media_grants_require_same_origin');
        setcookie('retro_media',$g['value'],['expires'=>$g['expires'],'path'=>'/api/media/'.$g['id'],'secure'=>!$dev,'httponly'=>true,'samesite'=>'Strict']);
        unset($result['mediaGrant']);$result['mediaUrl']='/api/media/'.$g['id'];
    }
    rb_json($result);
} catch(CloudError $e) {rb_json(['error'=>$e->reason],$e->status);}
catch(Throwable $e) {error_log('RetroBooth internal failure: '.get_class($e));rb_json(['error'=>'internal_error_no_success_confirmed'],500);}
