<?php
declare(strict_types=1);
/* RetroBooth v0.7 cloud pilot. One local filesystem, cooperative flock, no public media directory. */
final class CloudError extends RuntimeException {
    public function __construct(public int $status, public string $reason) { parent::__construct($reason); }
}
function rb_fail(int $code, string $reason): never { throw new CloudError($code, $reason); }
function rb_id(): string { return bin2hex(random_bytes(16)); }
function rb_secret(): string { return rtrim(strtr(base64_encode(random_bytes(24)), '+/', '-_'), '='); }
function rb_hash(string $s): string { return hash('sha256', $s); }
function rb_write(string $path, string $bytes): void {
    $tmp=$path.'.tmp-'.bin2hex(random_bytes(8)); $h=@fopen($tmp,'xb');
    if (!$h) rb_fail(503,'private_storage_unwritable');
    try {
        chmod($tmp,0600); $offset=0; $length=strlen($bytes);
        while ($offset<$length) { $n=fwrite($h,substr($bytes,$offset)); if (!$n) rb_fail(503,'private_storage_write_failed'); $offset+=$n; }
        if (!fflush($h) || !fsync($h)) rb_fail(503,'private_storage_sync_failed');
    } finally { fclose($h); }
    if (!rename($tmp,$path)) { @unlink($tmp); rb_fail(503,'private_storage_commit_failed'); }
}
final class CloudRepo {
    private string $root;
    public function __construct(public array $cfg) {
        $this->root=rtrim($cfg['dataDir'],'/');
        if (!is_dir($this->root) && !mkdir($this->root,0700,true)) rb_fail(503,'private_storage_unwritable');
        $real=realpath($this->root); $pub=realpath($cfg['publicDir']);
        if (!$real || !$pub || $real===$pub || str_starts_with($real,$pub.'/')) rb_fail(503,'data_must_be_outside_public_root');
        if (is_link($this->root)) rb_fail(503,'symlink_data_root_not_supported');
    }
    public function eventDir(string $eventId): string {
        if (!preg_match('/^[a-f0-9]{32}$/D',$eventId)) rb_fail(400,'invalid_event_id');
        return $this->root.'/events/'.$eventId;
    }
    public function path(string $id,?string $eventId=null): string {
        if (!preg_match('/^[a-f0-9]{32}$/D',$id)) rb_fail(400,'invalid_clip_id');
        // Read existing v0.7-v0.9.3 clips in their original flat storage location.
        // All NEW uploads go to /events/<event-id>/clips/<clip-id>/.
        $legacy=$this->root.'/clips/'.$id;
        if (is_dir($legacy) || $eventId===null) return $legacy;
        return $this->eventDir($eventId).'/clips/'.$id;
    }
    public function archiveDir(string $eventId): string {return $this->eventDir($eventId).'/archives';}
    public function archivePath(string $eventId,string $archiveId,int $part): string {
        if (!preg_match('/^[a-f0-9]{32}$/D',$archiveId)||$part<1||$part>100) rb_fail(400,'invalid_archive_part');
        return $this->archiveDir($eventId).'/'.$archiveId.'-part-'.str_pad((string)$part,3,'0',STR_PAD_LEFT).'.zip';
    }
    public function clearArchiveFiles(string $eventId,string $archiveId): void {
        if (!preg_match('/^[a-f0-9]{32}$/D',$archiveId)) return;
        foreach (glob($this->archiveDir($eventId).'/'.$archiveId.'-part-*.zip')?:[] as $file) if (is_file($file)) @unlink($file);
    }
    public function persist(array $s): void { rb_write($this->root.'/state.json',json_encode($s,JSON_THROW_ON_ERROR|JSON_UNESCAPED_SLASHES)); }
    public function transaction(callable $fn): mixed {
        $lock=fopen($this->root.'/.state.lock','c+b');
        if (!$lock || !flock($lock,LOCK_EX)) rb_fail(503,'storage_lock_unavailable');
        try {
            $file=$this->root.'/state.json';
            if (file_exists($file)) {
                try { $s=json_decode(file_get_contents($file),true,512,JSON_THROW_ON_ERROR); }
                catch(Throwable $e) { rb_fail(503,'metadata_corrupt_restore_backup_do_not_reset'); }
                if (!is_array($s) || ($s['schema']??null)!==1 || !isset($s['clips'],$s['events'],$s['devices'])) rb_fail(503,'metadata_schema_invalid');
            } else { if(file_exists($this->root.'/.initialized')||is_dir($this->root.'/clips'))rb_fail(503,'metadata_missing_restore_backup_do_not_reset'); $s=['schema'=>1,'events'=>[],'devices'=>[],'clips'=>[],'rate'=>[]]; }
            $before=json_encode($s); $value=$fn($s);
            if ($before!==json_encode($s) || !file_exists($file)) $this->persist($s);
            if(!file_exists($this->root.'/.initialized'))rb_write($this->root.'/.initialized','RetroBooth schema 1');
            return $value;
        } finally { flock($lock,LOCK_UN); fclose($lock); }
    }
    public function removeMedia(string $id,?string $eventId=null): bool {
        $dir=$this->path($id,$eventId); if (!is_dir($dir)) return true;
        $ok=true;
        foreach (glob($dir.'/*')?:[] as $file) {
            if (is_dir($file)) { $ok=false; continue; }
            if (!@unlink($file)) $ok=false;
        }
        if ($ok) $ok=@rmdir($dir);
        return $ok;
    }
    public function tombstone(array &$s, string $id, string $reason): void {
        $c=&$s['clips'][$id];
        if (($c['status']??'')!=='deleted') {
            $c['status']='deleted';$c['deletedAt']=time();$c['deleteReason']=$reason;
            $c['permission']='hidden';$c['moderation']='pending';$c['revision']++;
            $c['purge']='pending';$c['devicePurgeAck']=false;
            $c['chunks']=[]; unset($c['sourceId'],$c['seq']);
            // Drive is an OPTIONAL mirror. Queue remote deletion durably; the private
            // Drive CLI worker performs it. Until then an external Drive copy may remain.
            if((!empty($c['driveSync']['fileId'])||!empty($c['driveSync']['session']))&&!($c['driveSync']['deleted']??false)) {
                $c['driveSync']['status']='delete_pending';
                $c['driveSync']['updatedAt']=time();
            }
            $e=&$s['events'][$c['eventId']];
            if (isset($e['archive']) && in_array($c['id'],$e['archive']['clipIds']??[],true)) {
                $archiveId=$e['archive']['id'];
                $e['archive']['status']='stale';$e['archive']['shareHash']='';$e['archive']['shareNonce']='';$e['archive']['error']='A recording was deleted. Rebuild the ZIP before sharing.';
                $this->clearArchiveFiles($c['eventId'],$archiveId);
            }
            $this->persist($s); // revoke access durably BEFORE unlinking any media.
        }
        if ($this->removeMedia($id,$c['eventId'])) $c['purge']='complete';
    }
    public function cleanup(): array {
        return $this->transaction(function(array &$s) {
            $n=0;$stale=0;
            foreach ($s['clips'] as $id=>&$c) {
                $e=$s['events'][$c['eventId']];
                if ($c['status']==='deleted' || $e['expiresAt']<=time()) { $this->tombstone($s,$id,$c['deleteReason']??'expired');$n++; }
                elseif ($c['status']==='uploading' && ($c['updatedAt']??$c['createdAt'])<time()-86400) {
                    $this->removeMedia($id,$c['eventId']);$c['chunks']=[];$c['updatedAt']=time();$stale++;
                }
            } unset($c);
            foreach ($s['rate'] as $k=>$r) if ($r['at']<time()-600) unset($s['rate'][$k]);
            return ['tombstonesProcessed'=>$n,'staleUploadsReset'=>$stale];
        });
    }
}
final class CloudApi {
    public CloudRepo $repo;
    public function __construct(public array $cfg) { $this->repo=new CloudRepo($cfg); }
    public function auth(array $s,string $token,string $role): array {
        if ($role==='admin') {
            if (!hash_equals($this->cfg['adminKey'],$token)) rb_fail(401,'unauthorized');
            return ['role'=>'admin'];
        }
        if (!preg_match('/^([a-f0-9]{32})\.([A-Za-z0-9_-]{32})$/D',$token,$m)) rb_fail(401,'unauthorized');
        if ($role==='device') {
            $d=$s['devices'][$m[1]]??null;
            if (!$d || $d['revoked'] || !hash_equals($d['tokenHash'],rb_hash($m[2]))) rb_fail(401,'unauthorized');
            return $d;
        }
        $c=$s['clips'][$m[1]]??null;
        if (!$c) rb_fail(401,'unauthorized');
        if (hash_equals($c['ownerHash'],rb_hash($m[2]))) return ['role'=>'owner','id'=>$m[1]];
        if (hash_equals($c['viewHash'],rb_hash($m[2]))) return ['role'=>'viewer','id'=>$m[1]];
        rb_fail(401,'unauthorized');
    }
    public function rateLimit(string $peer,string $token): void {
        // Per IP: failed-auth attempts cannot create an unbounded token-keyed map.
        $key=rb_hash($peer); $this->repo->transaction(function(array &$s) use($key) {
            $r=$s['rate'][$key]??['at'=>time(),'count'=>0];
            if ($r['at']<time()-60) $r=['at'=>time(),'count'=>0];
            if ($r['count']>=2400) rb_fail(429,'request_limit');
            $r['count']++;$s['rate'][$key]=$r;
            if (count($s['rate'])>2048) {uasort($s['rate'],fn($a,$b)=>$a['at']<=>$b['at']);$s['rate']=array_slice($s['rate'],-1024,null,true);}
        });
    }
    private function archiveStatus(array $event,bool $client=false): array {
        $a=$event['archive']??null;
        if(!$a)return ['status'=>'none','eventId'=>$event['id'],'eventTitle'=>$event['title'],'parts'=>[]];
        $result=['status'=>$a['status'],'eventId'=>$event['id'],'eventTitle'=>$event['title'],
            'count'=>$a['count']??0,'bytes'=>$a['bytes']??0,'parts'=>($a['status']==='ready'?$a['parts']:[]),
            'createdAt'=>$a['createdAt']??null,'completedAt'=>$a['completedAt']??null,
            'shareActive'=>($a['shareHash']??'')!==''&&($a['shareExpiresAt']??0)>time(),
            'shareExpiresAt'=>$a['shareExpiresAt']??0];
        if(!$client)$result['error']=$a['error']??'';
        return $result;
    }
    private function clientAuth(array $s,string $token): array {
        if (!preg_match('/^([a-f0-9]{32})\.([A-Za-z0-9_-]{32})$/D',$token,$m)) rb_fail(401,'invalid_client_link');
        foreach($s['events'] as $e){$a=$e['archive']??null;
            if (($a['id']??null)!==$m[1])continue;
            if (($a['status']??'')!=='ready'||($a['shareHash']??'')===''||($a['shareExpiresAt']??0)<=time()||$e['expiresAt']<=time())rb_fail(410,'client_share_unavailable');
            if(!hash_equals($a['shareHash'],rb_hash($m[2])))rb_fail(401,'invalid_client_link');
            return [$e,$a];
        }
        rb_fail(401,'invalid_client_link');
    }
    private function archiveGrant(array $event,array $archive): array {
        // A one-hour HttpOnly download grant lets clients fetch several independent ZIP
        // parts without repeatedly opening their private invite. Revocation is checked
        // on EVERY new download request, regardless of cookie expiry.
        $expiry=min(time()+3600,$archive['shareExpiresAt'],$event['expiresAt']);
        $value=$archive['id'].'.'.$expiry.'.'.$archive['shareNonce'];
        return ['value'=>$value.'.'.hash_hmac('sha256',$value,$this->cfg['signingKey']),'expires'=>$expiry];
    }
    public function archiveDownload(string $archiveId,int $part,string $cookie): array {
        return $this->repo->transaction(function(array &$s) use($archiveId,$part,$cookie) {
            if (!preg_match('/^([a-f0-9]{32})\.([0-9]{10})\.([a-f0-9]{16})\.([a-f0-9]{64})$/D',$cookie,$m)
                ||$m[1]!==$archiveId||(int)$m[2]<time())rb_fail(401,'archive_authorization_required');
            $message=$m[1].'.'.$m[2].'.'.$m[3];
            if(!hash_equals(hash_hmac('sha256',$message,$this->cfg['signingKey']),$m[4]))rb_fail(401,'archive_authorization_required');
            foreach($s['events'] as $e){$a=$e['archive']??null;if(($a['id']??'')!==$archiveId)continue;
                if(($a['status']??'')!=='ready'||$e['expiresAt']<=time()||($a['shareExpiresAt']??0)<time()
                    ||!hash_equals((string)($a['shareNonce']??''),$m[3])||($a['shareHash']??'')==='')rb_fail(410,'client_share_unavailable');
                if($part<1||$part>count($a['parts']??[]))rb_fail(404,'archive_part_not_found');
                $meta=$a['parts'][$part-1];$path=$this->repo->archivePath($e['id'],$archiveId,$part);
                if(!is_file($path)||is_link($path)||filesize($path)!==$meta['bytes'])rb_fail(503,'archive_file_missing');
                $handle=fopen($path,'rb');if(!$handle)rb_fail(503,'archive_file_unavailable');
                return ['handle'=>$handle,'size'=>$meta['bytes'],'name'=>'RetroBooth_Event_'.substr($e['id'],0,8).'_Part_'.$part.'.zip'];
            }
            rb_fail(404,'archive_not_found');
        });
    }
    private function clipStatus(array $c,array $e,string $role): array {
        $deleted=$c['status']==='deleted';
        return ['id'=>$c['id'],'status'=>$c['status'],'title'=>$deleted?'':$e['title'],
            'expiresAt'=>$e['expiresAt'],'canManage'=>$role==='owner','permission'=>$c['permission'],
            'moderation'=>$c['moderation'],'revision'=>$c['revision'],
            'size'=>$deleted?0:($c['size']??0),'mime'=>$deleted?'':($c['mime']??''),
            'purge'=>$c['purge']??null,'devicePurgeAck'=>$c['devicePurgeAck']??false,
            'publicShowConnected'=>false];
    }
    private function requireAlive(array &$s,string $id): void {
        $c=$s['clips'][$id]??null;if (!$c) rb_fail(404,'clip_not_found');
        if ($s['events'][$c['eventId']]['expiresAt']<=time() && $c['status']!=='deleted') {
            $this->repo->tombstone($s,$id,'expired');$this->repo->persist($s);
        }
        if ($s['clips'][$id]['status']==='deleted') rb_fail(410,'clip_deleted');
    }
    public function handle(string $method,string $route,string $token,array $body=[],string $binary='',string $chunkHash=''): array {
        if ($route==='/api/health' && $method==='GET') return ['service'=>'RetroBooth','api'=>1,'build'=>'0.9.5-alpha.1','printer'=>'not_connected'];
        return $this->repo->transaction(function(array &$s) use($method,$route,$token,$body,$binary,$chunkHash) {
            if (str_starts_with($route,'/api/admin/')) {
                $this->auth($s,$token,'admin');
                if ($route==='/api/admin/events' && $method==='GET') return ['events'=>array_values($s['events']),'storage'=>'single-host-locked-files'];
                if ($route==='/api/admin/events' && $method==='POST') {
                    $title=trim((string)($body['title']??''));$days=(int)($body['days']??30);
                    if ($title==='' || strlen($title)>240 || $days<1 || $days>365) rb_fail(400,'invalid_event');
                    if (count($s['events'])>=100) rb_fail(409,'event_limit');
                    $id=rb_id();$dir=$this->repo->eventDir($id).'/clips';
                    if (!is_dir($dir)&&!mkdir($dir,0700,true)) rb_fail(503,'event_storage_unwritable');
                    $defaultDriveSync=class_exists('DriveBridge')?(new DriveBridge($this->cfg,$this->repo))->autoForNewEvents():false;
                    $s['events'][$id]=['id'=>$id,'title'=>$title,'expiresAt'=>time()+$days*86400,'issueOpen'=>true,'uploadOpen'=>true,'createdAt'=>time(),'driveEnabled'=>$defaultDriveSync];
                    return $s['events'][$id];
                }
                if (preg_match('#^/api/admin/event/([a-f0-9]{32})/archive$#D',$route,$m)) {
                    $id=$m[1];if (!isset($s['events'][$id])) rb_fail(404,'event_not_found');$e=&$s['events'][$id];
                    if ($method==='GET') return $this->archiveStatus($e);
                    if ($method!=='POST') rb_fail(405,'method_not_allowed');
                    $action=$body['action']??'';
                    if ($action==='prepare') {
                        if (($body['confirm']??'')!=='SHARE_ALL_READY') rb_fail(400,'share_confirmation_required');
                        if ($e['expiresAt']<=time()) rb_fail(410,'event_expired');
                        if ($e['issueOpen']||$e['uploadOpen']) rb_fail(409,'close_event_reservations_and_upload_drain_first');
                        $rows=[];$total=0;
                        foreach($s['clips'] as $clip) {
                            if ($clip['eventId']!==$id) continue;
                            if ($clip['status']==='uploading') rb_fail(409,'uploads_not_complete');
                            if ($clip['status']!=='ready') continue;
                            $total+=(int)$clip['size'];
                            if ($total>(int)($this->cfg['maxArchiveBytes']??2147483648)) rb_fail(413,'archive_too_large_use_offline_export');
                            $rows[]=$clip['id'];
                        }
                        if (!count($rows)) rb_fail(409,'no_ready_recordings');
                        if (count($rows)>1000) rb_fail(413,'too_many_archive_clips');
                        usort($rows,fn($a,$b)=>($s['clips'][$a]['createdAt']<=>$s['clips'][$b]['createdAt']) ?: strcmp($a,$b));
                        if (isset($e['archive']['id']))$this->repo->clearArchiveFiles($id,$e['archive']['id']);
                        $e['archive']=['id'=>rb_id(),'status'=>'queued','clipIds'=>$rows,'count'=>count($rows),
                            'bytes'=>$total,'createdAt'=>time(),'parts'=>[],'shareHash'=>'','shareNonce'=>'','shareExpiresAt'=>0,'error'=>''];
                        return $this->archiveStatus($e);
                    }
                    if ($action==='create-link') {
                        if (($body['confirm']??'')!=='SHARE_ALL_READY') rb_fail(400,'share_confirmation_required');
                        if (($e['archive']['status']??'')!=='ready') rb_fail(409,'archive_not_ready');
                        $days=(int)($body['days']??7);if($days<1||$days>30)rb_fail(400,'invalid_share_days');
                        $expiry=min($e['expiresAt'],time()+$days*86400);
                        if($expiry<=time())rb_fail(410,'event_expired');
                        $secret=rb_secret();$e['archive']['shareHash']=rb_hash($secret);$e['archive']['shareNonce']=bin2hex(random_bytes(8));
                        $e['archive']['shareExpiresAt']=$expiry;
                        return ['shareUrl'=>$this->cfg['publicOrigin'].'/client/index.html?token='.$e['archive']['id'].'.'.$secret,'expiresAt'=>$expiry,'status'=>'ready'];
                    }
                    if ($action==='revoke') {
                        $e['archive']['shareHash']='';$e['archive']['shareNonce']='';$e['archive']['shareExpiresAt']=0;
                        return $this->archiveStatus($e);
                    }
                    rb_fail(400,'invalid_archive_action');
                }
                if ($route==='/api/admin/device' && $method==='POST') {
                    $id=(string)($body['eventId']??'');if (!isset($s['events'][$id])) rb_fail(404,'event_not_found');
                    $did=rb_id();$secret=rb_secret();
                    $d=['id'=>$did,'eventId'=>$id,'label'=>substr(trim((string)($body['label']??'Booth')),0,80),'tokenHash'=>rb_hash($secret),'revoked'=>false,'createdAt'=>time()];
                    $s['devices'][$did]=$d;
                    return ['version'=>1,'serverOrigin'=>$this->cfg['publicOrigin'],'eventId'=>$id,'deviceId'=>$did,'deviceToken'=>$did.'.'.$secret,'expiresAt'=>$s['events'][$id]['expiresAt']];
                }
                if ($route==='/api/admin/devices' && $method==='GET') return ['devices'=>array_values(array_map(function($d){unset($d['tokenHash']);return $d;},$s['devices']))];
                if (preg_match('#^/api/admin/device/([a-f0-9]{32})/revoke$#D',$route,$m) && $method==='POST') {
                    if (!isset($s['devices'][$m[1]])) rb_fail(404,'device_not_found');$s['devices'][$m[1]]['revoked']=true;return ['revoked'=>true];
                }
                if (preg_match('#^/api/admin/event/([a-f0-9]{32})$#D',$route,$m) && $method==='POST') {
                    if (!isset($s['events'][$m[1]])) rb_fail(404,'event_not_found');
                    foreach(['issueOpen','uploadOpen'] as $key) if (array_key_exists($key,$body)) $s['events'][$m[1]][$key]=$body[$key]===true;
                    if(array_key_exists('title',$body)){$name=trim((string)$body['title']);if($name===''||strlen($name)>240)rb_fail(400,'invalid_event_title');$s['events'][$m[1]]['title']=$name;}
                    return $s['events'][$m[1]];
                }
                if ($route==='/api/admin/clips' && $method==='POST') {
                    $event=(string)($body['eventId']??'');$rows=[];
                    foreach($s['clips'] as $c) if ($c['eventId']===$event) $rows[]=[...$this->clipStatus($c,$s['events'][$event],'admin'),'seq'=>$c['seq']??null,'createdAt'=>$c['createdAt']];
                    return ['clips'=>$rows];
                }
                if (preg_match('#^/api/admin/clip/([a-f0-9]{32})/(moderate|open|delete)$#D',$route,$m) && $method==='POST') {
                    $id=$m[1];if (!isset($s['clips'][$id])) rb_fail(404,'clip_not_found');
                    if ($m[2]==='delete') {if (($body['confirm']??'')!=='DELETE') rb_fail(400,'confirmation_required');$this->repo->tombstone($s,$id,'admin_deleted');return ['deleted'=>true];}
                    $this->requireAlive($s,$id);
                    if ($m[2]==='moderate') {$s['clips'][$id]['moderation']=($body['approved']??false)===true?'approved':'pending';$s['clips'][$id]['revision']++;return ['moderation'=>$s['clips'][$id]['moderation']];}
                    if ($s['clips'][$id]['status']!=='ready') rb_fail(409,'not_ready');return ['mediaGrant'=>$this->mediaGrant($s['clips'][$id])];
                }
                rb_fail(404,'not_found');
            }
            if (str_starts_with($route,'/api/client/')) {
                [$event,$archive]=$this->clientAuth($s,$token);
                if ($route==='/api/client/status' && $method==='GET') return $this->archiveStatus($event,true);
                if ($route==='/api/client/authorize' && $method==='POST') return ['archiveGrant'=>$this->archiveGrant($event,$archive)];
                rb_fail(404,'not_found');
            }
            if (str_starts_with($route,'/api/device/')) {
                $d=$this->auth($s,$token,'device');$e=$s['events'][$d['eventId']];
                if ($route==='/api/device/verify' && $method==='GET') return ['deviceId'=>$d['id'],'event'=>$e,'publicOrigin'=>$this->cfg['publicOrigin'],'chunkBytes'=>524288,'maxClipBytes'=>67108864];
                if ($route==='/api/device/reserve' && $method==='POST') {
                    if (!$e['issueOpen'] || $e['expiresAt']<=time()) rb_fail(409,'new_reservations_closed');
                    $count=(int)($body['count']??12);if ($count<1||$count>50) rb_fail(400,'invalid_reservation_count');
                    if (count($s['clips'])+$count>5000) rb_fail(507,'pilot_clip_limit');
                    $out=[];
                    for($i=0;$i<$count;$i++) {
                        $id=rb_id();$owner=rb_secret();$view=rb_secret();
                        $s['clips'][$id]=['id'=>$id,'eventId'=>$e['id'],'deviceId'=>$d['id'],'ownerHash'=>rb_hash($owner),'viewHash'=>rb_hash($view),
                            'status'=>'reserved','createdAt'=>time(),'revision'=>1,'permission'=>'private','moderation'=>'pending','chunks'=>[]];
                        $out[]=['id'=>$id,'eventId'=>$e['id'],'ownerToken'=>$id.'.'.$owner,'viewToken'=>$id.'.'.$view,'expiresAt'=>$e['expiresAt']];
                    }
                    return ['slots'=>$out];
                }
                if (!preg_match('#^/api/device/clip/([a-f0-9]{32})/(status|init|complete|delete|ack-delete|chunk/([0-9]{1,4}))$#D',$route,$m)) rb_fail(404,'not_found');
                $id=$m[1];$op=$m[2];$c=$s['clips'][$id]??null;
                if (!$c || $c['deviceId']!==$d['id']) rb_fail(404,'clip_not_found');
                if ($e['expiresAt']<=time() && $c['status']!=='deleted') $this->repo->tombstone($s,$id,'expired');
                $c=&$s['clips'][$id];
                if ($op==='status' && $method==='GET') return [...$this->clipStatus($c,$e,'device'),'received'=>array_map('intval',array_keys($c['chunks'])),'sha256'=>$c['status']==='deleted'?null:($c['sha256']??null)];
                if ($op==='ack-delete' && $method==='POST') {if ($c['status']!=='deleted') rb_fail(409,'not_deleted');$c['devicePurgeAck']=true;return ['acknowledged'=>true];}
                if ($op==='delete' && $method==='POST') {if (($body['confirm']??'')!=='DELETE') rb_fail(400,'confirmation_required');$this->repo->tombstone($s,$id,'device_deleted');return ['deleted'=>true];}
                $this->requireAlive($s,$id);if (!$e['uploadOpen']) rb_fail(409,'upload_drain_closed');
                if ($op==='init' && $method==='POST') {
                    $size=$body['size']??0;$hash=(string)($body['sha256']??'');$mime=(string)($body['mime']??'');$source=(string)($body['sourceId']??'');
                    if (!is_int($size)||$size<16||$size>67108864||!preg_match('/^[a-f0-9]{64}$/D',$hash)||!in_array($mime,['video/mp4','video/webm'],true)||!preg_match('/^[a-f0-9]{32}$/D',$source)) rb_fail(400,'invalid_upload_metadata');
                    if (isset($c['sha256'])) {
                        if ($c['size']!==$size||$c['sha256']!==$hash||$c['mime']!==$mime||$c['sourceId']!==$source) rb_fail(409,'immutable_upload_conflict');
                    } else {
                        $used=0;foreach($s['clips'] as $other) if ($other['status']!=='deleted') $used+=$other['size']??0;
                        if ($used+$size>$this->cfg['quotaBytes']) rb_fail(507,'cloud_quota_full');
                        $c['size']=$size;$c['sha256']=$hash;$c['mime']=$mime;$c['sourceId']=$source;$c['seq']=max(0,(int)($body['seq']??0));
                        $c['status']='uploading';$c['updatedAt']=time();
                    }
                    return ['status'=>$c['status'],'chunkBytes'=>524288,'received'=>array_map('intval',array_keys($c['chunks']))];
                }
                if (str_starts_with($op,'chunk/') && $method==='PUT') {
                    if (!isset($c['size'])) rb_fail(409,'initialize_first');
                    $index=(int)$m[3];$expected=min(524288,$c['size']-$index*524288);
                    if ($expected<=0||strlen($binary)!==$expected||!preg_match('/^[a-f0-9]{64}$/D',$chunkHash)||!hash_equals($chunkHash,rb_hash($binary))) rb_fail(400,'chunk_length_or_hash_mismatch');
                    if (isset($c['chunks'][$index])) {if ($c['chunks'][$index]!==$chunkHash) rb_fail(409,'chunk_conflict');return ['accepted'=>true,'duplicate'=>true];}
                    if ($c['status']==='ready') rb_fail(409,'already_complete');
                    $dir=$this->repo->path($id,$c['eventId']);if (!is_dir($dir) && !mkdir($dir,0700,true)) rb_fail(503,'private_storage_unwritable');
                    rb_write($dir.'/part-'.$index,$binary);$c['chunks'][$index]=$chunkHash;$c['updatedAt']=time();
                    return ['accepted'=>true,'index'=>$index];
                }
                if ($op==='complete' && $method==='POST') {
                    if ($c['status']==='ready') return ['ready'=>true,'sha256'=>$c['sha256'],'size'=>$c['size']];
                    if (!isset($c['size'])) rb_fail(409,'initialize_first');
                    $count=(int)ceil($c['size']/524288);$dir=$this->repo->path($id,$c['eventId']);
                    for($i=0;$i<$count;$i++) if (!isset($c['chunks'][$i])||!is_file($dir.'/part-'.$i)) rb_fail(409,'chunks_missing');
                    $tmp=$dir.'/assembled-'.rb_id();$out=fopen($tmp,'xb');if (!$out) rb_fail(503,'assembly_failed');
                    $ctx=hash_init('sha256');$written=0;
                    try {
                        for($i=0;$i<$count;$i++) {
                            $part=file_get_contents($dir.'/part-'.$i);
                            if (!hash_equals($c['chunks'][$i],rb_hash($part))) rb_fail(409,'stored_chunk_corrupt');
                            hash_update($ctx,$part);$offset=0;while($offset<strlen($part)) {$n=fwrite($out,substr($part,$offset));if (!$n) rb_fail(503,'assembly_write_failed');$offset+=$n;}$written+=$offset;
                        }
                        if ($written!==$c['size']||!hash_equals($c['sha256'],hash_final($ctx))) rb_fail(409,'final_checksum_mismatch');
                        if (!fflush($out)||!fsync($out)) rb_fail(503,'assembly_sync_failed');
                    } catch(Throwable $ex) {fclose($out);@unlink($tmp);throw $ex;}
                    fclose($out);$head=file_get_contents($tmp,false,null,0,16);
                    $valid=$c['mime']==='video/mp4'?substr($head,4,4)==='ftyp':substr($head,0,4)==="\x1a\x45\xdf\xa3";
                    if (!$valid) {@unlink($tmp);rb_fail(415,'media_container_signature_invalid');}
                    if (!rename($tmp,$dir.'/video.bin')) rb_fail(503,'media_commit_failed');chmod($dir.'/video.bin',0600);
                    $c['status']='ready';$c['uploadedAt']=time();$c['revision']++;
                    // Snapshot is not a live feed. A late verified upload makes an already
                    // prepared 'all ready videos' bundle incomplete; revoke until rebuilt.
                    $archive=&$s['events'][$c['eventId']]['archive'];
                    if (is_array($archive) && in_array($archive['status']??'',['queued','building','ready'],true)
                        && !in_array($id,$archive['clipIds']??[],true)) {
                        $archive['status']='stale';$archive['shareHash']='';$archive['shareNonce']='';
                        $archive['error']='A late video arrived. Rebuild all ZIP parts to include it.';
                        $this->repo->clearArchiveFiles($c['eventId'],$archive['id']);
                    }
                    unset($archive);$this->repo->persist($s);
                    for($i=0;$i<$count;$i++) @unlink($dir.'/part-'.$i);
                    return ['ready'=>true,'sha256'=>$c['sha256'],'size'=>$c['size']];
                }
                rb_fail(405,'method_not_allowed');
            }
            if (str_starts_with($route,'/api/guest/')) {
                $a=$this->auth($s,$token,'guest');$id=$a['id'];$c=&$s['clips'][$id];$e=$s['events'][$c['eventId']];
                if ($e['expiresAt']<=time() && $c['status']!=='deleted') $this->repo->tombstone($s,$id,'expired');
                if ($route==='/api/guest/status' && $method==='GET') return $this->clipStatus($c,$e,$a['role']);
                if ($route==='/api/guest/open' && $method==='POST') {
                    $this->requireAlive($s,$id);if ($c['status']!=='ready') rb_fail(409,'not_ready');
                    return ['mediaGrant'=>$this->mediaGrant($c),'id'=>$id];
                }
                if ($a['role']!=='owner') rb_fail(403,'view_only_link');
                if ($route==='/api/guest/delete' && $method==='POST') {
                    if (($body['confirm']??'')!=='DELETE') rb_fail(400,'confirmation_required');
                    $this->repo->tombstone($s,$id,'guest_deleted');return ['deleted'=>true,'devicePurgeAck'=>$c['devicePurgeAck']];
                }
                $this->requireAlive($s,$id);
                if ($route==='/api/guest/permission' && $method==='POST') {
                    if (!in_array($body['permission']??'', ['hidden','allow'],true)) rb_fail(400,'invalid_permission');
                    $c['permission']=$body['permission'];$c['revision']++;return ['permission'=>$c['permission'],'revision'=>$c['revision']];
                }
                rb_fail(404,'not_found');
            }
            rb_fail(404,'not_found');
        });
    }
    private function mediaGrant(array $c): array {
        // Short-lived HttpOnly cookie. A delete invalidates it regardless of expiry.
        $expiry=min(time()+900,$this->cfg['mediaCookieMax']??PHP_INT_MAX);
        $value=$c['id'].'.'.$expiry.'.'.bin2hex(random_bytes(8));
        return ['id'=>$c['id'],'value'=>$value.'.'.hash_hmac('sha256',$value,$this->cfg['signingKey']),'expires'=>$expiry];
    }
    public function media(string $id,string $cookie): array {
        return $this->repo->transaction(function(array &$s) use($id,$cookie) {
            if (!preg_match('/^([a-f0-9]{32})\.([0-9]{10})\.([a-f0-9]{16})\.([a-f0-9]{64})$/D',$cookie,$m)||$m[1]!==$id||(int)$m[2]<time()) rb_fail(401,'media_authorization_required');
            $message=$m[1].'.'.$m[2].'.'.$m[3];
            if (!hash_equals(hash_hmac('sha256',$message,$this->cfg['signingKey']),$m[4])) rb_fail(401,'media_authorization_required');
            $this->requireAlive($s,$id);$c=$s['clips'][$id];if ($c['status']!=='ready') rb_fail(409,'not_ready');
            $path=$this->repo->path($id,$c['eventId']).'/video.bin';
            if (!is_file($path)||filesize($path)!==$c['size']) rb_fail(503,'media_file_unavailable');
            // Open under metadata lock. Later revocation stops new requests, not bytes already delivered.
            $handle=fopen($path,'rb');if (!$handle) rb_fail(503,'media_file_unavailable');
            return ['handle'=>$handle,'size'=>$c['size'],'mime'=>$c['mime'],'etag'=>$c['sha256']];
        });
    }
}
function rb_range(?string $header,int $size): array {
    if ($header===null || $header==='') return [0,$size-1,200];
    if (!preg_match('/^bytes=(\d*)-(\d*)$/D',$header,$m)||($m[1]===''&&$m[2]==='')) rb_fail(416,'invalid_range');
    if ($m[1]==='') {$n=(int)$m[2];if ($n<=0) rb_fail(416,'invalid_range');$start=max(0,$size-$n);$end=$size-1;}
    else {$start=(int)$m[1];$end=$m[2]===''?$size-1:min($size-1,(int)$m[2]);}
    if ($start>=$size || $end<$start) rb_fail(416,'range_out_of_bounds');
    return [$start,$end,206];
}
