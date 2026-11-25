<?php
declare(strict_types=1);
require_once __DIR__.'/Cloud.php';
require_once __DIR__.'/Drive.php';
/** Bounded, resumable and idempotency-aware PHP CLI mirroring worker. */
final class DriveWorker {
    public function __construct(private CloudRepo $repo, private DriveBridge $drive) {}
    private function updateClip(string $id,callable $fn): void {
        $this->repo->transaction(function(array &$s)use($id,$fn){if(isset($s['clips'][$id]))$fn($s['clips'][$id]);});
    }
    private function failClip(string $id,string $message): void {
        $this->updateClip($id,function(array &$c)use($message){
            $r=(int)($c['driveSync']['retries']??0)+1;
            $c['driveSync']['status']='error';$c['driveSync']['error']=$message;
            if(in_array($message,['google_drive_upload_probe_http_404','google_drive_upload_probe_http_410'],true)){
                // Google resumable sessions expire; a fresh pass first searches for
                // an already completed remote file by immutable clip appProperties.
                unset($c['driveSync']['session']);
            }
            $c['driveSync']['retries']=$r;$c['driveSync']['retryAt']=time()+min(3600,60*(2**min($r,6)));
            $c['driveSync']['updatedAt']=time();
        });
    }
    public function run(): array {
        $options=$this->drive->settings();
        if(empty($options['refreshCipher'])||empty($options['parent']['id']))return ['status'=>'not_connected_or_parent_not_selected','folders'=>0,'uploaded'=>0,'pending'=>0,'deleted'=>0];
        $summary=['status'=>'ok','folders'=>0,'uploaded'=>0,'pending'=>0,'deleted'=>0,'errors'=>[]];
        // Most important: remove deleted recordings from Drive, even if mirror was switched OFF.
        $deletions=$this->repo->transaction(function(array &$s){$jobs=[];
            foreach($s['clips'] as $id=>$c){
                if($c['status']==='deleted'&&empty($c['driveSync']['deleted'])&&
                    (!empty($c['driveSync']['fileId'])||!empty($c['driveSync']['session']))) {
                    $jobs[$id]=['fileId'=>$c['driveSync']['fileId']??'',
                        'eventId'=>$c['eventId'],'folderId'=>$s['events'][$c['eventId']]['driveFolder']['id']??''];
                }
            }
            return array_slice($jobs,0,20,true);
        });
        foreach($deletions as $id=>$item){try{
                $fileId=$item['fileId'];
                if(!$fileId&&$item['folderId']){
                    $remote=$this->drive->findClip($item['folderId'],$id);
                    if($remote)$fileId=$remote['id'];
                }
                if(!$fileId){$summary['pending']++;continue;} // No claim that a remote copy is gone.
                $this->drive->deleteFile($fileId);
                $this->updateClip($id,function(array &$c){$c['driveSync']['deleted']=true;$c['driveSync']['status']='deleted';unset($c['driveSync']['session']);$c['driveSync']['updatedAt']=time();});$summary['deleted']++;
            }catch(Throwable $e){$summary['errors'][]='delete_'.$id.':'.($e instanceof CloudError?$e->reason:'drive_delete_failed');}}
        $events=$this->repo->transaction(fn(array &$s)=>array_values(array_filter($s['events'],fn($e)=>(($e['driveEnabled']??false)===true)&&($e['expiresAt']??0)>time())));
        foreach($events as $event){$eventId=$event['id'];$folderId=(string)($event['driveFolder']['id']??'');
            if($folderId===''){
                try{$folder=$this->drive->eventFolder($event,$options['parent']['id']);
                    $this->repo->transaction(function(array &$s)use($eventId,$folder,$options){if(isset($s['events'][$eventId])&&!isset($s['events'][$eventId]['driveFolder']))$s['events'][$eventId]['driveFolder']=['id'=>$folder['id'],'name'=>$folder['name'],'parentId'=>$options['parent']['id']];});
                    $folderId=$folder['id'];$summary['folders']++;
                }catch(Throwable $e){$summary['errors'][]='folder_'.substr($eventId,0,8).':'.($e instanceof CloudError?$e->reason:'drive_folder_failed');continue;}
            }
            $clips=$this->repo->transaction(function(array &$s)use($eventId){$found=[];
                foreach($s['clips'] as $c){if($c['eventId']!==$eventId||$c['status']!=='ready'||!empty($c['driveSync']['fileId'])||($c['driveSync']['retryAt']??0)>time())continue;$found[]=$c;}
                usort($found,fn($a,$b)=>($a['createdAt']<=>$b['createdAt'])?:strcmp($a['id'],$b['id']));return array_slice($found,0,2);
            });
            foreach($clips as $clip){$id=$clip['id'];$path=$this->repo->path($id,$eventId).'/video.bin';
                try{
                    if(!is_file($path)||is_link($path)||filesize($path)!==($clip['size']??-1))rb_fail(409,'drive_source_missing_or_size_mismatch');
                    if(!hash_equals((string)$clip['sha256'],hash_file('sha256',$path)))rb_fail(409,'drive_source_sha256_mismatch');
                    $remote=$this->drive->findClip($folderId,$id);
                    if($remote){$this->finish($clip,$remote,$path);$summary['uploaded']++;continue;}
                    $session=$clip['driveSync']['session']??'';
                    if(!$session){$session=$this->drive->startUpload($folderId,$clip,$path);
                        $this->updateClip($id,function(array &$c)use($session){if($c['status']==='ready'){
                            $c['driveSync']['session']=$session;$c['driveSync']['status']='uploading';$c['driveSync']['updatedAt']=time();}});
                    }
                    $result=$this->drive->resumeUpload($session,$path);
                    if($result['done']){$this->finish($clip,$result['file'],$path);$summary['uploaded']++;}
                    else{$this->updateClip($id,function(array &$c)use($result){if($c['status']==='ready'){
                        $c['driveSync']['status']='uploading';$c['driveSync']['offset']=$result['offset'];$c['driveSync']['updatedAt']=time();}});$summary['pending']++;}
                }catch(Throwable $e){$reason=$e instanceof CloudError?$e->reason:'google_drive_worker_error';$this->failClip($id,$reason);$summary['errors'][]='clip_'.substr($id,0,8).':'.$reason;}
            }
        }
        return $summary;
    }
    private function finish(array $clip,array $remote,string $path): void {
        $fileId=(string)($remote['id']??'');if(!preg_match('/^[A-Za-z0-9_-]{8,180}$/D',$fileId))rb_fail(503,'drive_upload_no_file_id');
        if(!isset($remote['size'])||(int)$remote['size']!==(int)$clip['size'])rb_fail(503,'drive_uploaded_size_mismatch_or_missing');
        if(empty($remote['md5Checksum'])||!hash_equals(strtolower((string)$remote['md5Checksum']),md5_file($path)))rb_fail(503,'drive_uploaded_checksum_mismatch_or_missing');
        $id=$clip['id'];$this->updateClip($id,function(array &$c)use($fileId){
            $deleted=$c['status']==='deleted';
            $c['driveSync']=['status'=>$deleted?'delete_pending':'ready','fileId'=>$fileId,'deleted'=>false,
                'uploadedAt'=>time(),'updatedAt'=>time(),'error'=>''];
        });
    }
}
