<?php
declare(strict_types=1);
require __DIR__.'/../cloud/retrobooth_private/app/DriveWorker.php';
function ok(bool $cond,string $msg): void {if(!$cond)throw new RuntimeException('FAIL '.$msg);echo 'PASS '.$msg.PHP_EOL;}
function fakeReply(int $status,array $data=[],array $headers=[]): array {return ['status'=>$status,'headers'=>$headers,'body'=>json_encode($data,JSON_THROW_ON_ERROR)];}
final class TestDrive extends DriveBridge {
    public array $files=[],$sessions=[];public int $calls=0;
    protected function request(string $method,string $url,array $headers=[],?string $body=null): array {
        $this->calls++;$parts=parse_url($url);$path=$parts['path']??'';$q=[];parse_str($parts['query']??'',$q);
        if($path==='/token'){
            parse_str((string)$body,$form);$refresh=($form['grant_type']??'')==='authorization_code';
            return fakeReply(200,['access_token'=>'test-access-token','refresh_token'=>$refresh?'test-secret-refresh-token':null,'expires_in'=>3600]);
        }
        if($path==='/drive/v3/about')return fakeReply(200,['user'=>['permissionId'=>'permission-id-12345','emailAddress'=>'test@example.invalid','displayName'=>'Test Operator']]);
        if(str_starts_with($path,'/drive/v3/files/')&&$method==='GET'){
            $id=basename($path);if($id==='existingfolderAB')return fakeReply(200,['id'=>$id,'name'=>'Existing Wedding Folder','mimeType'=>'application/vnd.google-apps.folder','capabilities'=>['canAddChildren'=>true]]);
            return fakeReply(404,['error'=>'not found']);
        }
        if($path==='/drive/v3/files'&&$method==='POST'){
            $meta=json_decode((string)$body,true);$id='folder'.str_pad((string)(count($this->files)+1),16,'0',STR_PAD_LEFT);
            $file=['id'=>$id,'name'=>$meta['name'],'mimeType'=>$meta['mimeType'],'parents'=>$meta['parents']??[],'appProperties'=>$meta['appProperties']??[]];
            $this->files[$id]=$file;return fakeReply(200,$file);
        }
        if($path==='/drive/v3/files'&&$method==='GET'){
            $query=$q['q']??'';$matches=[];
            foreach($this->files as $file){if(str_contains($query,'retroboothEventId')&&str_contains($query,$file['appProperties']['retroboothEventId']??'__NO__')&&isset($file['appProperties']['retroboothEventId']))$matches[]=$file;
                elseif(str_contains($query,'retroboothClipId')&&str_contains($query,$file['appProperties']['retroboothClipId']??'__NO__')&&isset($file['appProperties']['retroboothClipId']))$matches[]=$file;
            }
            return fakeReply(200,['files'=>$matches]);
        }
        if($path==='/upload/drive/v3/files'&&$method==='POST'){
            $meta=json_decode((string)$body,true);$session='session'.str_pad((string)(count($this->sessions)+1),12,'0',STR_PAD_LEFT);
            $this->sessions[$session]=['meta'=>$meta,'total'=>(int)$headers['X-Upload-Content-Length'],'buffer'=>''];
            return fakeReply(200,[],['location'=>'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id='.$session]);
        }
        if($path==='/upload/drive/v3/files'&&$method==='PUT'){
            $session=$q['upload_id']??'';if(!isset($this->sessions[$session]))return fakeReply(404,['error'=>'gone']);
            $job=&$this->sessions[$session];$range=$headers['Content-Range']??'';
            if(str_starts_with($range,'bytes */')){
                if(strlen($job['buffer'])>0)return fakeReply(308,[],['range'=>'bytes=0-'.(strlen($job['buffer'])-1)]);
                return fakeReply(308);
            }
            if(!preg_match('/^bytes (\d+)-(\d+)\/(\d+)$/D',$range,$m))return fakeReply(400);
            if((int)$m[1]!==strlen($job['buffer'])||(int)$m[3]!==$job['total'])return fakeReply(409);
            $job['buffer'].=$body;
            if(strlen($job['buffer'])<$job['total'])return fakeReply(308,[],['range'=>'bytes=0-'.(strlen($job['buffer'])-1)]);
            $id='video'.str_pad((string)(count($this->files)+1),16,'0',STR_PAD_LEFT);
            $file=['id'=>$id,'name'=>$job['meta']['name'],'mimeType'=>$job['meta']['mimeType'],
                'parents'=>$job['meta']['parents'],'appProperties'=>$job['meta']['appProperties'],'size'=>(string)strlen($job['buffer']),
                'md5Checksum'=>md5($job['buffer'])];$this->files[$id]=$file;
            return fakeReply(200,$file);
        }
        if($method==='DELETE'&&str_starts_with($path,'/drive/v3/files/')){
            unset($this->files[basename($path)]);return fakeReply(204);
        }
        throw new RuntimeException('Unhandled fake Google operation '.$method.' '.$url);
    }
}
$tmp=sys_get_temp_dir().'/retrodrive-'.bin2hex(random_bytes(7));mkdir($tmp,0700);
$cfg=['publicOrigin'=>'https://retro.example.invalid','adminKey'=>str_repeat('a',55),'signingKey'=>str_repeat('b',55),
    'dataDir'=>$tmp,'publicDir'=>realpath(__DIR__.'/../cloud/public_html'),
    'googleDriveClientId'=>'sample-client-id.apps.googleusercontent.com','googleDriveClientSecret'=>'sample-very-long-client-secret'];
$repo=new CloudRepo($cfg);$drive=new TestDrive($cfg,$repo);
try {
    ok(!$drive->publicStatus()['connected'],'default Drive is disconnected and disabled');
    $url=$drive->begin('connect')['url'];$parsed=[];parse_str(parse_url($url,PHP_URL_QUERY),$parsed);
    ok(($parsed['scope']??'')==='https://www.googleapis.com/auth/drive.file','minimal drive.file scope, not full Drive');
    ok(($parsed['access_type']??'')==='offline','offline refresh token requested');
    $drive->callback(['state'=>$parsed['state'],'code'=>'code-good-123456']);
    ok($drive->publicStatus()['connected'],'OAuth callback connects Google account');
    ok(!str_contains(file_get_contents($tmp.'/.google-drive.json'),'test-secret-refresh-token'),'refresh token encrypted at rest');
    try{$drive->callback(['state'=>$parsed['state'],'code'=>'code-good-123456']);throw new RuntimeException('OAuth state replay accepted');}
    catch(CloudError $e){ok($e->status===403,'OAuth state is single use');}
    $pick=$drive->begin('pick')['url'];$pq=[];parse_str(parse_url($pick,PHP_URL_QUERY),$pq);
    ok(($pq['trigger_onepick']??'')==='true'&&($pq['allow_folder_selection']??'')==='true','Google One Pick folder selection enabled');
    $drive->callback(['state'=>$pq['state'],'code'=>'code-good-picker','picked_file_ids'=>'existingfolderAB']);
    ok($drive->publicStatus()['parent']['id']==='existingfolderAB','existing folder selected via Google Picker');
    $created=$drive->createBaseFolder('RetroBooth Events');
    ok($drive->publicStatus()['parent']['id']===$created['id'],'new base folder created and selected');
    $drive->updateOptions(['autoForNewEvents'=>true]);
    $cloud=new CloudApi($cfg);$event=$cloud->handle('POST','/api/admin/events',$cfg['adminKey'],['title'=>'First Wedding','days'=>7]);
    ok($event['driveEnabled']===true,'new event inherits explicitly enabled Drive copy default');
    $id=rb_id();$contents="\x00\x00\x00\x18ftypisom000000000000000000";$dir=$repo->path($id,$event['id']);mkdir($dir,0700,true);file_put_contents($dir.'/video.bin',$contents);
    $repo->transaction(function(array &$s)use($id,$event,$contents){$s['clips'][$id]=[
        'id'=>$id,'eventId'=>$event['id'],'deviceId'=>rb_id(),'status'=>'ready','size'=>strlen($contents),
        'sha256'=>hash('sha256',$contents),'mime'=>'video/mp4','seq'=>1,'createdAt'=>time(),
        'revision'=>1,'permission'=>'allow','moderation'=>'pending','chunks'=>[],
        'ownerHash'=>str_repeat('0',64),'viewHash'=>str_repeat('1',64)];});
    $result=(new DriveWorker($repo,$drive))->run();
    ok(($result['folders']??0)===1&&($result['uploaded']??0)===1,'worker creates Event folder and mirrors verified video');
    $snapshot=$repo->transaction(fn(array &$s)=>$s['clips'][$id]);
    ok(($snapshot['driveSync']['status']??'')==='ready'&&!empty($snapshot['driveSync']['fileId']),'Drive uploaded file ID persisted');
    $before=count($drive->files);(new DriveWorker($repo,$drive))->run();
    ok(count($drive->files)===$before,'repeated worker run does not duplicate a completed upload');
    $repo->transaction(function(array &$s)use($repo,$id){$repo->tombstone($s,$id,'guest_deleted');});
    $snapshot=$repo->transaction(fn(array &$s)=>$s['clips'][$id]);
    ok(($snapshot['driveSync']['status']??'')==='delete_pending','guest deletion immediately queues remote Drive deletion');
    $deleted=(new DriveWorker($repo,$drive))->run();
    ok($deleted['deleted']===1,'worker deletes Drive mirror after guest deletion');
    $drive->disconnect();ok(!$drive->publicStatus()['connected'],'disconnect revokes future API access locally');
    echo 'DRIVE PILOT TESTS PASSED'.PHP_EOL;
} finally {
    // Test-only cleanup; production cleanup always observes event retention.
    $iterator=new RecursiveIteratorIterator(new RecursiveDirectoryIterator($tmp,FilesystemIterator::SKIP_DOTS),RecursiveIteratorIterator::CHILD_FIRST);
    foreach($iterator as $node){$node->isDir()?rmdir($node->getPathname()):unlink($node->getPathname());}rmdir($tmp);
}
