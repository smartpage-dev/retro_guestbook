<?php
declare(strict_types=1);
/* Run from Hostinger Cron (PHP CLI), never as a public HTTP route.
 * RETRO_CONFIG=/absolute/private/path/config.php php /absolute/private/path/tools/build_archives.php
 * Idempotent claim: one queued build is taken at a time under the existing metadata lock.
 */
require __DIR__.'/../app/Cloud.php';
require __DIR__.'/../app/StoredZip.php';
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
$cfgFile=getenv('RETRO_CONFIG')?:__DIR__.'/../config.php';
if(!is_file($cfgFile)){fwrite(STDERR,"Missing private config.php\n");exit(1);}
$cfg=require $cfgFile;
$cfg['publicDir']??=dirname(__DIR__,2).'/public_html';
$cfg['maxArchivePartBytes']??=134217728;
$api=new CloudApi($cfg);$repo=$api->repo;
$limit=max(33554432,min(268435456,(int)$cfg['maxArchivePartBytes']));
$maxJobs=2;
for($job=0;$job<$maxJobs;$job++){
    $claim=$repo->transaction(function(array &$s){
        foreach($s['events'] as $id=>&$e){
            if(($e['archive']['status']??'')!=='queued')continue;
            if($e['expiresAt']<=time()){$e['archive']['status']='failed';$e['archive']['error']='event_expired';continue;}
            $e['archive']['status']='building';$e['archive']['startedAt']=time();$e['archive']['workerId']=rb_id();
            return ['eventId'=>$id,'archive'=>$e['archive'],'clips'=>$s['clips']];
        }
        return null;
    });
    if(!$claim)break;
    $eventId=$claim['eventId'];$a=$claim['archive'];$aid=$a['id'];$workId=$a['workerId'];$parts=[];$files=[];
    try{
        $dir=$repo->archiveDir($eventId);
        if(!is_dir($dir)&&!mkdir($dir,0700,true))throw new RuntimeException('archive_directory_unwritable');
        $batches=[];$batch=[];$bytes=0;
        foreach($a['clipIds'] as $id){
            $c=$claim['clips'][$id]??null;
            if(!$c||$c['eventId']!==$eventId||$c['status']!=='ready')throw new RuntimeException('archive_snapshot_changed');
            $size=(int)$c['size'];
            if($batch && ($bytes+$size>$limit || count($batch)>=90)){$batches[]=$batch;$batch=[];$bytes=0;}
            $batch[]=$c;$bytes+=$size;
        }
        if($batch)$batches[]=$batch;
        if(count($batches)>100)throw new RuntimeException('too_many_archive_parts');
        foreach($batches as $index=>$batch){
            $number=$index+1;$final=$repo->archivePath($eventId,$aid,$number);$tmp=$final.'.tmp-'.rb_id();$files[]=$tmp;
            $zip=new RetroStoredZip($tmp);
            $rows=['seq,clip_id,created_at,bytes,sha256'];
            foreach($batch as $c){
                $id=$c['id'];$name='Event_'.substr($eventId,0,8).'/Message_'.str_pad((string)($c['seq']??0),4,'0',STR_PAD_LEFT).'_'.substr($id,0,12).($c['mime']==='video/mp4'?'.mp4':'.webm');
                $zip->addFile($name,$repo->path($id,$eventId).'/video.bin',(int)$c['size'],$c['sha256']);
                $rows[]=implode(',',[(int)($c['seq']??0),$id,(int)$c['createdAt'],(int)$c['size'],$c['sha256']]);
            }
            $zip->addBytes('Event_'.substr($eventId,0,8).'/MANIFEST.csv',implode("\n",$rows)."\n");
            $zip->addBytes('README.txt',"RetroBooth private client delivery. Part {$number} of ".count($batches).". Contains ".count($batch)." video(s). Guest-deleted clips are not included. Downloaded copies cannot be revoked.\n");
            $zip->finish();unset($zip);
            $size=filesize($tmp);if($size===false||$size>$limit+500000)throw new RuntimeException('archive_part_size_limit');
            $parts[]=['part'=>$number,'bytes'=>$size,'count'=>count($batch),'sha256'=>hash_file('sha256',$tmp)];
        }
        $valid=$repo->transaction(function(array &$s) use($eventId,$aid,$workId,$a){
            $cur=$s['events'][$eventId]['archive']??null;
            if(!$cur||$cur['id']!==$aid||$cur['workerId']!==$workId||$cur['status']!=='building')return false;
            foreach($a['clipIds'] as $id){$c=$s['clips'][$id]??null;if(!$c||$c['status']!=='ready'||$c['eventId']!==$eventId)return false;}
            return true;
        });
        if(!$valid)throw new RuntimeException('archive_snapshot_invalidated');
        foreach($parts as $i=>$part){$final=$repo->archivePath($eventId,$aid,$part['part']);if(!rename($files[$i],$final))throw new RuntimeException('archive_publish_failed');$files[$i]=$final;}
        $published=$repo->transaction(function(array &$s) use($eventId,$aid,$workId,$parts,$a){
            $cur=&$s['events'][$eventId]['archive'];
            if($cur['id']!==$aid||($cur['workerId']??'')!==$workId||$cur['status']!=='building')return false;
            foreach($a['clipIds'] as $id){$c=$s['clips'][$id]??null;if(!$c||$c['status']!=='ready'||$c['eventId']!==$eventId)return false;}
            $cur['status']='ready';$cur['parts']=$parts;$cur['completedAt']=time();$cur['error']='';unset($cur['workerId']);return true;
        });
        if(!$published)throw new RuntimeException('archive_snapshot_invalidated');
        fwrite(STDOUT,"READY event {$eventId} / ".count($parts)." ZIP part(s)\n");
    }catch(Throwable $ex){
        foreach($files as $f)@unlink($f);$repo->clearArchiveFiles($eventId,$aid);
        $repo->transaction(function(array &$s) use($eventId,$aid,$workId,$ex){
            $a=&$s['events'][$eventId]['archive'];
            if($a['id']===$aid&&($a['workerId']??'')===$workId&&$a['status']==='building'){
                $a['status']='failed';$a['error']=substr($ex->getMessage(),0,160);$a['shareHash']='';$a['shareNonce']='';unset($a['workerId']);
            }
        });
        fwrite(STDERR,"FAILED event {$eventId}: ".$ex->getMessage()."\n");
    }
}
