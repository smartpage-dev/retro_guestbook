<?php
declare(strict_types=1);
/** Google Drive optional mirror for VERIFIED Hostinger recordings (v0.9.5 pilot).
 * Credentials stay under private dataDir, never in the web root, Android APK or JS.
 * OAuth always opens the SYSTEM browser. Minimal Google drive.file scope only.
 */
class DriveBridge {
    private string $file;
    private string $lockPath;
    private ?string $cachedAccessToken=null;
    private const FOLDER_MIME='application/vnd.google-apps.folder';
    public function __construct(private array $cfg, private CloudRepo $repo) {
        $data=rtrim((string)$cfg['dataDir'],'/');
        $this->file=$data.'/.google-drive.json';$this->lockPath=$data.'/.google-drive.lock';
    }
    private function emptySettings(): array {return ['schema'=>1,'account'=>null,'refreshCipher'=>'','parent'=>null,'autoForNewEvents'=>false,'oauth'=>null,'accountLockPermissionId'=>null];}
    private function readUnlocked(): array {
        if (!is_file($this->file))return $this->emptySettings();
        try{$data=json_decode((string)file_get_contents($this->file),true,32,JSON_THROW_ON_ERROR);}
        catch(Throwable $e){rb_fail(503,'google_drive_settings_corrupt_restore_backup');}
        if(!is_array($data)||($data['schema']??null)!==1)rb_fail(503,'google_drive_settings_schema_invalid');
        return $data;
    }
    /** Lock briefly for settings ONLY. No network call may run inside the lock. */
    private function settingsTxn(callable $fn): mixed {
        $h=fopen($this->lockPath,'c+b');if(!$h||!flock($h,LOCK_EX))rb_fail(503,'google_drive_settings_locked');
        try{$s=$this->readUnlocked();$before=json_encode($s);$result=$fn($s);
            if($before!==json_encode($s))rb_write($this->file,json_encode($s,JSON_THROW_ON_ERROR|JSON_UNESCAPED_SLASHES));
            return $result;
        }finally{flock($h,LOCK_UN);fclose($h);}
    }
    public function settings(): array{return $this->settingsTxn(fn(array &$s)=>$s);}
    public function autoForNewEvents(): bool {return ($this->settings()['autoForNewEvents']??false)===true;}
    public function configured(): bool {
        return strlen((string)($this->cfg['googleDriveClientId']??''))>15
            && strlen((string)($this->cfg['googleDriveClientSecret']??''))>10;
    }
    private function requireConfigured(): void {if(!$this->configured())rb_fail(409,'google_drive_oauth_client_not_configured');}
    private function cryptKey(): string {return hash_hkdf('sha256',$this->cfg['signingKey'],32,'RetroBooth Drive OAuth refresh token v1');}
    private function seal(string $value): string {
        $iv=random_bytes(12);$tag='';$encrypted=openssl_encrypt($value,'aes-256-gcm',$this->cryptKey(),OPENSSL_RAW_DATA,$iv,$tag,'RB-Drive-v1');
        if($encrypted===false)rb_fail(503,'drive_token_encryption_failed');return base64_encode($iv.$tag.$encrypted);
    }
    private function unseal(string $value): string {
        $raw=base64_decode($value,true);
        if($raw===false||strlen($raw)<29)rb_fail(503,'drive_token_cipher_invalid');
        $token=openssl_decrypt(substr($raw,28),'aes-256-gcm',$this->cryptKey(),OPENSSL_RAW_DATA,substr($raw,0,12),substr($raw,12,16),'RB-Drive-v1');
        if($token===false)rb_fail(503,'drive_token_decryption_failed_check_signing_key');return $token;
    }
    public function publicStatus(): array {
        $s=$this->settings();return ['configured'=>$this->configured(),'connected'=>!empty($s['refreshCipher']),
            'account'=>$s['account'],'parent'=>$s['parent'],
            'autoForNewEvents'=>($s['autoForNewEvents']??false)===true,
            'mode'=>'hostinger-primary-drive-mirror','scope'=>'drive.file'];
    }
    public function updateOptions(array $body): array {
        if(!is_bool($body['autoForNewEvents']??null))rb_fail(400,'invalid_drive_auto_option');
        if($body['autoForNewEvents']===true){$current=$this->settings();if(empty($current['refreshCipher'])||empty($current['parent']['id']))rb_fail(409,'connect_and_select_drive_folder_first');}
        $this->settingsTxn(function(array &$s)use($body){$s['autoForNewEvents']=$body['autoForNewEvents'];});
        return $this->publicStatus();
    }
    /** Return URL only to an authenticated Admin. OAuth flow never runs inside WebView. */
    public function begin(string $mode): array {
        $this->requireConfigured();if(!in_array($mode,['connect','pick'],true))rb_fail(400,'invalid_drive_oauth_mode');
        if($mode==='pick'&&empty($this->settings()['refreshCipher']))rb_fail(409,'connect_google_account_first');
        $state=rtrim(strtr(base64_encode(random_bytes(32)),'+/','-_'),'=');
        $this->settingsTxn(function(array &$s)use($state,$mode){$s['oauth']=['hash'=>hash('sha256',$state),'expiresAt'=>time()+600,'mode'=>$mode];});
        $q=['client_id'=>$this->cfg['googleDriveClientId'],'redirect_uri'=>$this->cfg['publicOrigin'].'/api/drive/oauth/callback',
            'response_type'=>'code','scope'=>'https://www.googleapis.com/auth/drive.file','access_type'=>'offline',
            'prompt'=>'consent','state'=>$state];
        if($mode==='pick'){$q['trigger_onepick']='true';$q['allow_folder_selection']='true';$q['mimetypes']=self::FOLDER_MIME;}
        return ['url'=>'https://accounts.google.com/o/oauth2/v2/auth?'.http_build_query($q,'','&',PHP_QUERY_RFC3986)];
    }
    /** Single-use callback state, consumed BEFORE any outbound request. */
    public function callback(array $input): array {
        $state=(string)($input['state']??'');
        if(!preg_match('/^[A-Za-z0-9_-]{42,64}$/D',$state))rb_fail(400,'drive_oauth_invalid_state');
        $mode=$this->settingsTxn(function(array &$s)use($state){$pending=$s['oauth']??null;
            if(!$pending||($pending['expiresAt']??0)<time()||!hash_equals((string)$pending['hash'],hash('sha256',$state)))rb_fail(403,'drive_oauth_state_expired_or_invalid');
            $s['oauth']=null;return $pending['mode'];});
        if(isset($input['error']))rb_fail(400,'drive_oauth_cancelled');
        $code=(string)($input['code']??'');if(strlen($code)<5||strlen($code)>4096)rb_fail(400,'drive_oauth_no_code');
        $response=$this->request('POST','https://oauth2.googleapis.com/token',[
            'Content-Type'=>'application/x-www-form-urlencoded'],http_build_query([
                'code'=>$code,'client_id'=>$this->cfg['googleDriveClientId'],
                'client_secret'=>$this->cfg['googleDriveClientSecret'],
                'redirect_uri'=>$this->cfg['publicOrigin'].'/api/drive/oauth/callback','grant_type'=>'authorization_code'
            ],'','&',PHP_QUERY_RFC3986));
        $result=$this->expectJson($response,[200]);
        $access=(string)($result['access_token']??'');$refresh=(string)($result['refresh_token']??'');
        if($access===''||($mode==='connect'&&$refresh===''))rb_fail(409,'google_offline_refresh_token_not_returned_reauthorize');
        $account=$this->expectJson($this->request('GET','https://www.googleapis.com/drive/v3/about?fields='.rawurlencode('user(permissionId,emailAddress,displayName)'),['Authorization'=>'Bearer '.$access]),[200])['user']??[];
        if(empty($account['permissionId']))rb_fail(503,'google_account_identity_unavailable');
        $lock=$this->settings()['accountLockPermissionId']??null;
        // Once any account was connected, switching account silently would send
        // past Event copies/deletions to a different owner. Require same identity.
        if($lock!==null && !hash_equals((string)$lock,(string)$account['permissionId']))rb_fail(409,'drive_account_switch_not_supported_use_same_google_account');
        if($mode==='pick'){
            $old=$this->settings();if(($old['account']['permissionId']??null)!==$account['permissionId'])rb_fail(409,'google_account_changed_reconnect_first');
            $ids=(string)($input['picked_file_ids']??'');
            if(!preg_match('/^[A-Za-z0-9_-]{8,180}$/D',$ids))rb_fail(400,'select_exactly_one_google_drive_folder');
            $folder=$this->getFolder($ids,$access); // Google Picker granted drive.file access to this folder.
            $this->settingsTxn(function(array &$s)use($folder,$refresh){$s['parent']=$folder;if($refresh!=='')$s['refreshCipher']=$this->seal($refresh);});
            return ['ok'=>true,'message'=>'Google Drive existing folder selected.','folder'=>$folder['name']];
        }
        $this->settingsTxn(function(array &$s)use($account,$refresh){
            if(($s['account']['permissionId']??null)!==$account['permissionId']){$s['parent']=null;$s['autoForNewEvents']=false;}
            $s['accountLockPermissionId']=$account['permissionId'];
            $s['account']=['permissionId'=>$account['permissionId'],'email'=>$account['emailAddress']??'','name'=>$account['displayName']??''];
            $s['refreshCipher']=$this->seal($refresh);
        });
        return ['ok'=>true,'message'=>'Google Account connected. Return to Cloud Admin to choose or create a folder.'];
    }
    /** HTTP client: pinned Google endpoints only, peer-verified HTTPS, NO redirects. Test subclass may override. */
    protected function request(string $method,string $url,array $headers=[],?string $body=null): array {
        if(!str_starts_with($url,'https://www.googleapis.com/drive/v3/')
            && !str_starts_with($url,'https://www.googleapis.com/upload/drive/v3/')
            && $url!=='https://oauth2.googleapis.com/token')rb_fail(503,'drive_endpoint_not_allowed');
        $lines=[];foreach($headers as $k=>$v){if(!preg_match('/^[A-Za-z0-9-]+$/D',$k)||str_contains((string)$v,"\n"))rb_fail(503,'invalid_drive_http_header');$lines[]=$k.': '.$v;}
        $options=['method'=>$method,'header'=>implode("\r\n",$lines),'timeout'=>25,'ignore_errors'=>true,'follow_location'=>0,'max_redirects'=>0];
        if($body!==null)$options['content']=$body;
        $ctx=stream_context_create(['http'=>$options,'ssl'=>['verify_peer'=>true,'verify_peer_name'=>true,'allow_self_signed'=>false]]);
        $data=@file_get_contents($url,false,$ctx);
        $responseHeaders=$http_response_header??[];$status=0;$out=[];
        foreach($responseHeaders as $line){if(preg_match('#^HTTP/\S+\s+(\d{3})#',$line,$m)){$status=(int)$m[1];$out=[];}
            elseif(str_contains($line,':')){[$k,$v]=explode(':',$line,2);$out[strtolower(trim($k))]=trim($v);}}
        if($data===false||$status===0)rb_fail(503,'google_drive_network_unavailable');
        return ['status'=>$status,'headers'=>$out,'body'=>$data];
    }
    private function expectJson(array $r,array $statuses): array {
        if(!in_array($r['status'],$statuses,true)){
            $error=$r['status']===401?'google_drive_authorization_expired':('google_drive_http_'.$r['status']);
            rb_fail(in_array($r['status'],[401,403],true)?409:503,$error);
        }
        try{$result=json_decode((string)$r['body'],true,32,JSON_THROW_ON_ERROR);}catch(Throwable $e){rb_fail(503,'google_drive_invalid_response');}
        if(!is_array($result))rb_fail(503,'google_drive_invalid_response');return $result;
    }
    public function accessToken(): string {
        if($this->cachedAccessToken!==null)return $this->cachedAccessToken;
        $this->requireConfigured();$s=$this->settings();if(empty($s['refreshCipher']))rb_fail(409,'google_account_not_connected');
        $result=$this->expectJson($this->request('POST','https://oauth2.googleapis.com/token',[
            'Content-Type'=>'application/x-www-form-urlencoded'],http_build_query([
                'client_id'=>$this->cfg['googleDriveClientId'],'client_secret'=>$this->cfg['googleDriveClientSecret'],
                'refresh_token'=>$this->unseal($s['refreshCipher']),'grant_type'=>'refresh_token'
            ],'','&',PHP_QUERY_RFC3986)),[200]);
        $this->cachedAccessToken=(string)($result['access_token']??'');if(!$this->cachedAccessToken)rb_fail(503,'google_drive_access_token_missing');
        if(!empty($result['refresh_token']))$this->settingsTxn(function(array &$current)use($result){$current['refreshCipher']=$this->seal($result['refresh_token']);});
        return $this->cachedAccessToken;
    }
    private function api(string $method,string $path,?array $data=null,?string $access=null): array {
        $url='https://www.googleapis.com/drive/v3/'.$path;
        $headers=['Authorization'=>'Bearer '.($access??$this->accessToken())];
        if($data!==null)$headers['Content-Type']='application/json; charset=utf-8';
        return $this->expectJson($this->request($method,$url,$headers,$data!==null?json_encode($data,JSON_THROW_ON_ERROR|JSON_UNESCAPED_SLASHES):null),[200,201]);
    }
    private function getFolder(string $id,?string $access=null): array {
        if(!preg_match('/^[A-Za-z0-9_-]{8,180}$/D',$id))rb_fail(400,'invalid_google_folder_id');
        $folder=$this->api('GET','files/'.rawurlencode($id).'?fields='.rawurlencode('id,name,mimeType,trashed,capabilities/canAddChildren'),null,$access);
        if(($folder['mimeType']??'')!==self::FOLDER_MIME||($folder['trashed']??false)===true)rb_fail(400,'google_folder_not_valid');
        if(($folder['capabilities']['canAddChildren']??false)!==true)rb_fail(403,'google_folder_not_writable');
        return ['id'=>$folder['id'],'name'=>$folder['name']??'Selected folder'];
    }
    public function createBaseFolder(string $name): array {
        if(!$this->settings()['refreshCipher'])rb_fail(409,'google_account_not_connected');
        $name=trim($name);if($name===''||strlen($name)>160||preg_match('/[\x00-\x1F]/',$name))rb_fail(400,'invalid_drive_folder_name');
        $folder=$this->api('POST','files?fields='.rawurlencode('id,name'),['name'=>$name,'mimeType'=>self::FOLDER_MIME,'parents'=>['root']]);
        if(empty($folder['id']))rb_fail(503,'google_drive_folder_create_failed');
        $selected=['id'=>$folder['id'],'name'=>$folder['name']??$name];
        $this->settingsTxn(function(array &$s)use($selected){$s['parent']=$selected;});return $selected;
    }
    public function disconnect(): array {
        $this->settingsTxn(function(array &$s){$s['refreshCipher']='';$s['account']=null;$s['parent']=null;$s['oauth']=null;$s['autoForNewEvents']=false;});
        $this->cachedAccessToken=null;return $this->publicStatus();
    }
    public function eventFolder(array $event,string $parentId): array {
        $id=$event['id'];$q="'".str_replace("'","\\'",$parentId)."' in parents and trashed = false and mimeType = '".self::FOLDER_MIME."' and appProperties has { key='retroboothEventId' and value='".$id."' }";
        $rows=$this->api('GET','files?'.http_build_query(['q'=>$q,'fields'=>'files(id,name),nextPageToken','pageSize'=>10]));
        if(!empty($rows['files']))return $rows['files'][0];
        $title=trim((string)$event['title']);$name=substr(preg_replace('/[\x00-\x1F\/\\\\]/',' ',$title),0,100).' - '.substr($id,0,8);
        $created=$this->api('POST','files?fields='.rawurlencode('id,name'),['name'=>$name,'mimeType'=>self::FOLDER_MIME,
            'parents'=>[$parentId],'appProperties'=>['retroboothEventId'=>$id,'retroboothApp'=>'retrobooth']]);
        if(empty($created['id']))rb_fail(503,'drive_event_folder_create_failed');return $created;
    }
    public function findClip(string $folderId,string $clipId): ?array {
        $q="'".$folderId."' in parents and trashed = false and appProperties has { key='retroboothClipId' and value='".$clipId."' }";
        $r=$this->api('GET','files?'.http_build_query(['q'=>$q,'fields'=>'files(id,name,size,md5Checksum),nextPageToken','pageSize'=>10]));
        return $r['files'][0]??null;
    }
    public function deleteFile(string $fileId): void {
        if(!preg_match('/^[A-Za-z0-9_-]{8,180}$/D',$fileId))rb_fail(400,'invalid_drive_file_id');
        $r=$this->request('DELETE','https://www.googleapis.com/drive/v3/files/'.rawurlencode($fileId),['Authorization'=>'Bearer '.$this->accessToken()]);
        if(!in_array($r['status'],[204,404],true))rb_fail(503,'google_drive_delete_http_'.$r['status']);
    }
    public function startUpload(string $folderId,array $c,string $filePath): string {
        $mime=$c['mime'];$ext=$mime==='video/mp4'?'mp4':'webm';$name='Message_'.str_pad((string)($c['seq']??0),4,'0',STR_PAD_LEFT).'_'.$c['id'].'.'.$ext;
        $meta=['name'=>$name,'mimeType'=>$mime,'parents'=>[$folderId],
            'appProperties'=>['retroboothClipId'=>$c['id'],'retroboothEventId'=>$c['eventId']]];
        $r=$this->request('POST','https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields='.rawurlencode('id,name,size,md5Checksum'),[
            'Authorization'=>'Bearer '.$this->accessToken(),'Content-Type'=>'application/json; charset=utf-8',
            'X-Upload-Content-Type'=>$mime,'X-Upload-Content-Length'=>(string)filesize($filePath)],json_encode($meta,JSON_THROW_ON_ERROR));
        if(!in_array($r['status'],[200,201],true))rb_fail(503,'google_drive_upload_init_http_'.$r['status']);
        $url=(string)($r['headers']['location']??'');
        if(!str_starts_with($url,'https://www.googleapis.com/upload/drive/v3/files?'))rb_fail(503,'drive_upload_session_invalid');
        return $url;
    }
    /** Resume from Google's reported offset; don't assume an uncertain PUT failed. */
    public function resumeUpload(string $url,string $filePath,int $maxBytes=33554432): array {
        if(!str_starts_with($url,'https://www.googleapis.com/upload/drive/v3/files?'))rb_fail(503,'drive_upload_session_invalid');
        $total=filesize($filePath);if(!$total)rb_fail(409,'drive_upload_source_missing');
        $authorization='Bearer '.$this->accessToken();
        $r=$this->request('PUT',$url,['Authorization'=>$authorization,'Content-Range'=>'bytes */'.$total,'Content-Length'=>'0'],'');
        if(in_array($r['status'],[200,201],true))return ['done'=>true,'file'=>$this->expectJson($r,[200,201]),'offset'=>$total];
        if($r['status']!==308)rb_fail(503,'google_drive_upload_probe_http_'.$r['status']);
        $range=$r['headers']['range']??'';$offset=0;
        if($range!==''&&preg_match('/^bytes=0-(\d+)$/D',$range,$m))$offset=(int)$m[1]+1;
        elseif($range!=='')rb_fail(503,'google_drive_invalid_resume_range');
        $endBudget=min($total,$offset+$maxBytes);
        $h=fopen($filePath,'rb');if(!$h)rb_fail(503,'drive_upload_source_unreadable');
        try{
            while($offset<$endBudget){$length=min(1048576,$total-$offset,$endBudget-$offset); // 1MiB aligned chunks
                if(fseek($h,$offset)!==0)rb_fail(503,'drive_file_seek_failed');
                $content=fread($h,$length);if($content===false||strlen($content)!==$length)rb_fail(503,'drive_file_read_failed');
                $reply=$this->request('PUT',$url,['Authorization'=>$authorization,'Content-Type'=>'application/octet-stream',
                    'Content-Length'=>(string)$length,'Content-Range'=>'bytes '.$offset.'-'.($offset+$length-1).'/'.$total],$content);
                if(in_array($reply['status'],[200,201],true))return ['done'=>true,'file'=>$this->expectJson($reply,[200,201]),'offset'=>$total];
                if($reply['status']!==308)rb_fail(503,'google_drive_upload_chunk_http_'.$reply['status']);
                $range=$reply['headers']['range']??'';if(!preg_match('/^bytes=0-(\d+)$/D',$range,$m))rb_fail(503,'google_drive_invalid_chunk_range');
                $next=(int)$m[1]+1;if($next<=$offset||$next>$total)rb_fail(503,'google_drive_upload_no_progress');$offset=$next;
            }
        }finally{fclose($h);}
        return ['done'=>false,'offset'=>$offset];
    }
}
