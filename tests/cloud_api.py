"""Actual loopback PHP HTTP integration, real files/locks/hashes/cookies; no mocked backend."""
from pathlib import Path
import tempfile,subprocess,os,sys,time,json,hashlib,urllib.request,urllib.error,signal,concurrent.futures,struct,socket
R=Path(__file__).resolve().parents[1];Q=R/'qa';Q.mkdir(exist_ok=True);checks=[]
def check(n,v):
 if not v: raise AssertionError(n)
 checks.append(n);print('PASS '+n,flush=True)
def digest(b):return hashlib.sha256(b).hexdigest()
with tempfile.TemporaryDirectory(prefix='retro-cloud-api-') as tmp:
 T=Path(tmp);sock=socket.socket();sock.bind(('127.0.0.1',0));port=sock.getsockname()[1];sock.close();origin=f'http://127.0.0.1:{port}'
 admin='a'*64;config=T/'config.php';data=T/'private-data'
 config.write_text("<?php return "+"['publicOrigin'=>'"+origin+"','adminKey'=>'"+admin+"','signingKey'=>'"+'s'*64+"','dataDir'=>'"+str(data)+"','quotaBytes'=>33554432,'corsOrigins'=>['http://127.0.0.1:4173','retrobooth://app'],'allowLoopbackHttp'=>true];")
 env={**os.environ,'RETRO_CONFIG':str(config),'PHP_CLI_SERVER_WORKERS':'4'};log=open(Q/'cloud-http-server.log','w')
 server=subprocess.Popen(['php','-S',f'127.0.0.1:{port}','-t',str(R/'cloud/public_html'),str(R/'cloud/router.php')],env=env,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
 def request(route,token='',body=None,method=None,raw=None,headers=None):
  h={'Authorization':'Bearer '+token} if token else {}
  method=method or ('POST' if body is not None else 'GET')
  content=None
  if body is not None:h['Content-Type']='application/json';content=json.dumps(body).encode()
  if raw is not None:h['Content-Type']='application/octet-stream';content=raw
  h.update(headers or {})
  req=urllib.request.Request(origin+route,data=content,headers=h,method=method)
  try:res=urllib.request.urlopen(req,timeout=20)
  except urllib.error.HTTPError as e:res=e
  buf=res.read();status=res.code;hs=dict(res.headers)
  try:answer=json.loads(buf)
  except:answer=buf
  return status,answer,hs
 try:
  for _ in range(70):
   try:
    if request('/api/health')[0]==200:break
   except OSError:pass
   time.sleep(.1)
  else:raise RuntimeError('PHP test server unavailable')
  check('real health endpoint',request('/api/health')[1]['api']==1)
  check('unauthenticated admin denied',request('/api/admin/events')[0]==401)
  check('wrong admin denied',request('/api/admin/events','b'*64)[0]==401)
  check('unknown CORS origin denied',request('/api/health',headers={'Origin':'https://evil.invalid'})[0]==403)
  check('approved local test origin accepted',request('/api/health',headers={'Origin':'http://127.0.0.1:4173'})[2].get('Access-Control-Allow-Origin')=='http://127.0.0.1:4173')
  check('exact desktop CORS origin accepted',request('/api/health',headers={'Origin':'retrobooth://app'})[2].get('Access-Control-Allow-Origin')=='retrobooth://app')
  pre=request('/api/device/verify',method='OPTIONS',headers={'Origin':'retrobooth://app','Access-Control-Request-Method':'GET','Access-Control-Request-Headers':'authorization'})
  check('desktop authenticated preflight allowed',pre[0]==204 and pre[2].get('Access-Control-Allow-Origin')=='retrobooth://app')
  check('lookalike desktop origin denied',request('/api/health',headers={'Origin':'retrobooth://other'})[0]==403)
  check('opaque null origin denied',request('/api/health',headers={'Origin':'null'})[0]==403)
  check('spoofed host denied',request('/api/health',headers={'Host':'evil.invalid'})[0]==400)
  check('public filesystem traversal blocked',request('/retrobooth_private/config.php')[0]==404)
  check('invalid title rejected',request('/api/admin/events',admin,{'title':'','days':30})[0]==400)
  code,event,_=request('/api/admin/events',admin,{'title':'SYNTHETIC TEST EVENT','days':30});check('event creation',code==200)
  eid=event['id']
  check('new event permissions are private and disabled by default',event['showEnabled'] is False and event['allowGuestDelete'] is False and event['autoApproveShow'] is False)
  check('duplicate event name case-insensitive rejected',request('/api/admin/events',admin,{'title':'synthetic test event','days':30})[0]==409)
  check('event starts at Cloud settings revision 1',event['settingsRevision']==1)
  settings1={**event['settings'],'duration':30,'screenStyle':'bubble','lookMode':'vhs','receiptCaption':'STAY A WHILE'}
  code,updated,_=request('/api/admin/event/'+eid+'/settings',admin,{'expectedRevision':1,'settings':settings1})
  check('Cloud Event Master accepts and versions safe kiosk settings',code==200 and updated['settingsRevision']==2 and updated['settings']['screenStyle']=='bubble')
  check('stale Cloud settings edits fail rather than overwrite',request('/api/admin/event/'+eid+'/settings',admin,{'expectedRevision':1,'settings':settings1})[0]==409)
  check('unsafe look mode rejected',request('/api/admin/event/'+eid+'/settings',admin,{'expectedRevision':2,'settings':{'lookMode':'arbitrary-js'}})[0]==400)
  check('Web slideshow route exists but token required for playlist',request('/show/')[0]==200 and request('/api/show/playlist')[0]==401)
  _,bundle,_=request('/api/admin/device',admin,{'eventId':eid,'label':'TEST ONLY'});device=bundle['deviceToken']
  check('device scoped verify',request('/api/device/verify',device)[1]['event']['id']==eid)
  check('desktop device authorization remains required',request('/api/device/verify',headers={'Origin':'retrobooth://app'})[0]==401)
  check('desktop device auth and CORS together',request('/api/device/verify',device,headers={'Origin':'retrobooth://app'})[1]['event']['id']==eid)
  check('device cannot administer',request('/api/admin/events',device)[0]==401)
  code,slots,_=request('/api/device/reserve',device,{'count':6});check('reserved pending identities',code==200 and len(slots['slots'])==6)
  a,b,c,d,e,f=slots['slots'];cid=a['id'];owner=a['ownerToken'];view=a['viewToken'];base='/api/device/clip/'+cid
  check('192-bit separate owner and viewer secrets',len(owner.split('.')[1])==32 and owner!=view)
  check('guest pending before upload',request('/api/guest/status',owner)[1]['status']=='reserved')
  check('disabled big screen denies guest consent',request('/api/guest/permission',owner,{'permission':'allow'})[0]==403)
  check('disabled guest deletion denies DELETE even for owner',request('/api/guest/delete',owner,{'confirm':'DELETE'})[0]==403)
  check('disabled slideshow cannot issue a link',request('/api/admin/event/'+eid+'/slideshow',admin,{'confirm':'ROTATE'})[0]==409)
  check('device receives cloud-master screen style and revision',request('/api/device/verify',device)[1]['event']['settings']['screenStyle']=='bubble' and request('/api/device/verify',device)[1]['event']['settingsRevision']==2)
  check('view-only role enforced',request('/api/guest/status',view)[1]['canManage'] is False)
  check('view-only cannot delete',request('/api/guest/delete',view,{'confirm':'DELETE'})[0]==403)
  check('view-only cannot grant show consent',request('/api/guest/permission',view,{'permission':'allow'})[0]==403)
  check('unknown guest token denied',request('/api/guest/status','0'*32+'.'+'Z'*32)[0]==401)
  check('media has no unauthenticated URL',request('/api/media/'+cid)[0]==401)
  # A real H.264/AAC test chart, padded with a legal MP4 free box to exercise multiple chunks.
  video=T/'synthetic.mp4'
  subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-f','lavfi','-i','testsrc2=size=320x240:rate=12','-f','lavfi','-i','sine=frequency=440:sample_rate=44100','-t','2','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-movflags','+faststart',str(video)],check=True)
  filler=bytes((i*73)%256 for i in range(1100000));blob=video.read_bytes()+struct.pack('>I4s',len(filler)+8,b'free')+filler
  sha=digest(blob);meta={'size':len(blob),'sha256':sha,'mime':'video/mp4','sourceId':'c'*32,'seq':1}
  check('init binds immutable media metadata',request(base+'/init',device,meta)[0]==200)
  check('identical init is idempotent',request(base+'/init',device,meta)[0]==200)
  check('conflicting metadata rejected',request(base+'/init',device,{**meta,'sourceId':'d'*32})[0]==409)
  check('premature complete rejected',request(base+'/complete',device,{})[0]==409)
  chunks=[blob[i:i+524288] for i in range(0,len(blob),524288)]
  check('bad chunk hash rejected',request(base+'/chunk/0',device,method='PUT',raw=chunks[0],headers={'X-Chunk-SHA256':'0'*64})[0]==400)
  check('oversized payload rejected',request(base+'/chunk/0',device,method='PUT',raw=blob,headers={'X-Chunk-SHA256':sha})[0]==413)
  put=lambda i:request(base+'/chunk/'+str(i),device,method='PUT',raw=chunks[i],headers={'X-Chunk-SHA256':digest(chunks[i])})
  check('first chunk persisted',put(0)[0]==200)
  check('resume reports persisted indices',request(base+'/status',device)[1]['received']==[0])
  with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:duplicates=list(pool.map(lambda _:put(0),range(4)))
  check('parallel identical chunk retries are idempotent',all(r[0]==200 and r[1]['duplicate'] for r in duplicates))
  for i in range(1,len(chunks)):check('chunk '+str(i)+' accepted',put(i)[0]==200)
  code,complete,_=request(base+'/complete',device,{});check('whole-file hash and size verified',code==200 and complete=={'ready':True,'sha256':sha,'size':len(blob)})
  check('completed file matches original bytes',(data/'clips'/cid/'video.bin').read_bytes()==blob)
  check('duplicate complete safe',request(base+'/complete',device,{})[1]==complete)
  check('upload chunks cleaned after committed final file',not list((data/'clips'/cid).glob('part-*')))
  check('viewer can read ready status',request('/api/guest/status',view)[1]['status']=='ready')
  code,g,headers=request('/api/guest/open',owner,{});cookie=headers.get('Set-Cookie','').split(';')[0]
  check('media session uses HttpOnly cookie',code==200 and 'HttpOnly' in headers.get('Set-Cookie','') and 'SameSite=Strict' in headers.get('Set-Cookie',''))
  check('full media download matches hash',digest(request('/api/media/'+cid,headers={'Cookie':cookie})[1])==sha)
  code,content,headers=request('/api/media/'+cid,headers={'Cookie':cookie,'Range':'bytes=10-99'});check('range bytes and headers exact',code==206 and content==blob[10:100] and headers.get('Content-Range')==f'bytes 10-99/{len(blob)}')
  check('suffix range',request('/api/media/'+cid,headers={'Cookie':cookie,'Range':'bytes=-25'})[1]==blob[-25:])
  check('open-ended range',request('/api/media/'+cid,headers={'Cookie':cookie,'Range':f'bytes={len(blob)-20}-'})[1]==blob[-20:])
  code,_,headers=request('/api/media/'+cid,headers={'Cookie':cookie,'Range':f'bytes={len(blob)}-'});check('invalid range is 416',code==416 and headers.get('Content-Range')==f'bytes */{len(blob)}')
  check('multi-range intentionally rejected',request('/api/media/'+cid,headers={'Cookie':cookie,'Range':'bytes=0-9,20-29'})[0]==416)
  check('mismatched If-Range returns full body',request('/api/media/'+cid,headers={'Cookie':cookie,'Range':'bytes=0-9','If-Range':'"wrong"'})[0]==200)
  check('HEAD is authorized and length correct',request('/api/media/'+cid,method='HEAD',headers={'Cookie':cookie})[2].get('Content-Length')==str(len(blob)))
  check('no public media path',request('/clips/'+cid+'/video.bin')[0]==404)
  # Private thumbnail on top of verified video, never public thumbnail.jpg.
  picture=T/'ticket.jpg'
  subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(video),'-frames:v','1','-vf','scale=384:216','-q:v','6',str(picture)],check=True)
  jpeg=picture.read_bytes()
  check('thumbnail requires hash verification',request(base+'/thumbnail',device,method='PUT',raw=jpeg,headers={'X-Chunk-SHA256':'0'*64})[0]==400)
  check('thumbnail requires valid connected device',request(base+'/thumbnail',method='PUT',raw=jpeg,headers={'X-Chunk-SHA256':digest(jpeg)})[0]==401)
  check('verified ticket screenshot uploaded',request(base+'/thumbnail',device,method='PUT',raw=jpeg,headers={'X-Chunk-SHA256':digest(jpeg)})[1]['thumbnailReady'] is True)
  check('thumbnail idempotent replay',request(base+'/thumbnail',device,method='PUT',raw=jpeg,headers={'X-Chunk-SHA256':digest(jpeg)})[1].get('duplicate') is True)
  check('Admin thumbnail requires auth',request('/api/admin/clip/'+cid+'/thumbnail')[0]==401)
  check('Admin thumbnail matches original JPEG bytes',request('/api/admin/clip/'+cid+'/thumbnail',admin)[1]==jpeg)
  check('private thumbnail path not web accessible',request('/clips/'+cid+'/thumbnail.jpg')[0]==404)
  # Cloud policy is enforced separately for owner, staff and big-screen playback.
  check('show playlist remains disabled until staff event enables it',request('/api/show/playlist')[0]==401)
  code,updated,_=request('/api/admin/event/'+eid,admin,{'showEnabled':True,'allowGuestDelete':True})
  check('permission switches bump device-observed revision',code==200 and updated['settingsRevision']==4)
  check('new device verify reflects switched permissions',request('/api/device/verify',device)[1]['event']['showEnabled'] is True)
  code,show,_=request('/api/admin/event/'+eid+'/slideshow',admin,{'confirm':'ROTATE'})
  showtoken=show['showUrl'].rsplit('#',1)[1]
  check('private slideshow link issued with unguessable token',code==200 and len(showtoken.split('.')[1])==32)
  check('slideshow starts empty while guest has not consented',request('/api/show/playlist',showtoken)[1]['clips']==[])
  check('bogus slideshow token cannot read list',request('/api/show/playlist',eid+'.'+'X'*32)[0]==403)
  check('hide is reversible without deleting',request('/api/guest/permission',owner,{'permission':'hidden'})[1]['permission']=='hidden' and request('/api/guest/status',owner)[1]['status']=='ready')
  check('allow does not imply staff approval',request('/api/guest/permission',owner,{'permission':'allow'})[0]==200 and request('/api/guest/status',owner)[1]['moderation']=='pending')
  check('staff approval independent',request('/api/admin/clip/'+cid+'/moderate',admin,{'approved':True})[0]==200 and request('/api/guest/status',owner)[1]['permission']=='allow')
  _,playlist,_=request('/api/show/playlist',showtoken)
  check('slideshow lists ONLY owner-consented AND staff-approved ready video',len(playlist['clips'])==1 and playlist['clips'][0]['id']==cid)
  check('slideshow preview thumbnail authorized after consent',request('/api/show/clip/'+cid+'/thumbnail',showtoken)[1]==jpeg)
  code,showopen,showheaders=request('/api/show/clip/'+cid+'/open',showtoken,{})
  showcookie=showheaders.get('Set-Cookie','').split(';')[0]
  check('show playback issues short-lived scoped cookie',code==200 and '.show.' in showcookie and digest(request('/api/media/'+cid,headers={'Cookie':showcookie})[1])==sha)
  check('private event gallery link includes viewer controls only',request('/api/guest/status',view)[1]['canManage'] is False)
  code,share,_=request('/api/admin/clip/'+cid+'/share',admin,{})
  sharetoken=share['viewOnlyUrl'].rsplit('#',1)[1]
  check('reprint guest ticket creates expiring VIEW-ONLY link',code==200 and request('/api/guest/status',sharetoken)[1]['canManage'] is False)
  check('view-only share cannot delete',request('/api/guest/delete',sharetoken,{'confirm':'DELETE'})[0]==403)
  check('owner hide removes video from show immediately',request('/api/guest/permission',owner,{'permission':'hidden'})[0]==200 and request('/api/show/playlist',showtoken)[1]['clips']==[])
  check('previous slideshow playback cookie revoked by hide',request('/api/media/'+cid,headers={'Cookie':showcookie})[0]==403)
  request('/api/guest/permission',owner,{'permission':'allow'})
  check('explicit owner re-consent restores approved show entry',len(request('/api/show/playlist',showtoken)[1]['clips'])==1)
  request('/api/admin/event/'+eid,admin,{'showEnabled':False})
  check('event show off hides guest section and closes playlist',request('/api/guest/status',owner)[1]['showEnabled'] is False and request('/api/show/playlist',showtoken)[0]==403)
  request('/api/admin/event/'+eid,admin,{'showEnabled':True})
  code,rotated,_=request('/api/admin/event/'+eid+'/slideshow',admin,{'confirm':'ROTATE'})
  check('regenerating slideshow revokes prior private URL',code==200 and rotated['showUrl']!=show['showUrl'] and request('/api/show/playlist',showtoken)[0]==403)
  # Automatic staff approval must still require explicit guest permission.
  code,updated,_=request('/api/admin/event/'+eid,admin,{'autoApproveShow':True})
  check('auto approve only enables optional moderation policy',code==200 and request('/api/guest/status',b['ownerToken'])[1]['permission']=='private')
  check('automatic staff approval follows guest action',request('/api/guest/permission',b['ownerToken'],{'permission':'allow'})[1]['moderation']=='approved')
  check('reserved auto-approved clip is NOT listed before verified upload',not any(x['id']==b['id'] for x in request('/api/show/playlist',rotated['showUrl'].rsplit('#',1)[1])[1]['clips']))
  check('delete requires reconfirmation',request('/api/guest/delete',owner,{})[0]==400)
  check('guest delete persists tombstone',request('/api/guest/delete',owner,{'confirm':'DELETE'})[0]==200)
  check('old media cookie immediately denied on new request',request('/api/media/'+cid,headers={'Cookie':cookie})[0]==410)
  check('deleted server media removed',not (data/'clips'/cid).exists())
  check('remote local cleanup honestly pending',request('/api/guest/status',owner)[1]['devicePurgeAck'] is False)
  check('stale upload init cannot resurrect',request(base+'/init',device,meta)[0]==410)
  check('stale upload chunk cannot resurrect',put(0)[0]==410)
  check('stale complete cannot resurrect',request(base+'/complete',device,{})[0]==410)
  check('deletion remains idempotent',request('/api/guest/delete',owner,{'confirm':'DELETE'})[0]==200)
  check('device acknowledges local cleanup',request(base+'/ack-delete',device,{})[0]==200 and request('/api/guest/status',owner)[1]['devicePurgeAck'] is True)
  # Isolation and drain lifecycle.
  _,event2,_=request('/api/admin/events',admin,{'title':'OTHER EVENT','days':7});_,b2,_=request('/api/admin/device',admin,{'eventId':event2['id']});device2=b2['deviceToken']
  check('cross-event device read blocked',request('/api/device/clip/'+b['id']+'/status',device2)[0]==404)
  check('close issue does not close upload drain',request('/api/admin/event/'+eid,admin,{'issueOpen':False})[1]['uploadOpen'] is True)
  check('new reservations fail after close',request('/api/device/reserve',device,{'count':1})[0]==409)
  check('existing reservation still uploads after event close',request('/api/device/clip/'+b['id']+'/init',device,meta)[0]==200)
  check('explicit drain pause blocks writes',request('/api/admin/event/'+eid,admin,{'uploadOpen':False})[0]==200 and request('/api/device/clip/'+b['id']+'/complete',device,{})[1]['error']=='upload_drain_closed')
  request('/api/admin/event/'+eid,admin,{'uploadOpen':True})
  # Delete DURING partial upload.
  base2='/api/device/clip/'+b['id'];request(base2+'/chunk/0',device,method='PUT',raw=chunks[0],headers={'X-Chunk-SHA256':digest(chunks[0])})
  check('delete partial upload',request('/api/guest/delete',b['ownerToken'],{'confirm':'DELETE'})[0]==200 and not (data/'clips'/b['id']).exists())
  check('late completion after partial delete fails',request(base2+'/complete',device,{})[0]==410)
  # Corruption must never be mistaken for a new database.
  statefile=data/'state.json';before=statefile.read_bytes();statefile.write_text('{BROKEN')
  check('corrupt metadata fails closed',request('/api/admin/events',admin)[0]==503)
  check('corrupt metadata is not reset',statefile.read_text()=='{BROKEN');statefile.write_bytes(before)
  check('restore resumes stored records',request('/api/admin/events',admin)[0]==200)
  # A missing metadata file must not silently reset an initialized deployment.
  before=statefile.read_bytes();statefile.unlink()
  check('missing initialized metadata fails closed',request('/api/admin/events',admin)[0]==503)
  check('missing metadata not recreated',not statefile.exists());statefile.write_bytes(before)
  # Expiry is enforced on access; cleanup persists a no-resurrection tombstone.
  state=json.loads(statefile.read_text());state['events'][eid]['expiresAt']=int(time.time())-1;statefile.write_text(json.dumps(state))
  check('expired reserved link becomes tombstone',request('/api/guest/status',c['ownerToken'])[1]['status']=='deleted')
  check('expired event cannot reserve new links',request('/api/device/reserve',device,{'count':1})[0]==409)
  cp=subprocess.run(['php',str(R/'cloud/retrobooth_private/tools/cleanup.php')],env=env,capture_output=True,text=True)
  check('cleanup CLI succeeds on real private storage',cp.returncode==0)
  check('cleanup keeps tombstones rather than removing identities',c['id'] in json.loads(statefile.read_text())['clips'])
  # Revocation and credentials not exposed by Admin lists.
  check('admin list never returns device secret hash','tokenHash' not in json.dumps(request('/api/admin/devices',admin)[1]))
  request('/api/admin/device/'+bundle['deviceId']+'/revoke',admin,{})
  check('revoked device refused',request('/api/device/verify',device)[0]==401)
  check('guest ownership independent of device revocation',request('/api/guest/status',c['ownerToken'])[0]==200)
  check('downloaded evidence is synthetically generated',b'ftyp' in blob[:16])
  (Q/'cloud-api-results.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'backend':'real PHP HTTP with four workers and real temporary private filesystem','media':'generated test chart H264/AAC + legal free box; no user content','hosting':'localhost only, not Hostinger'},indent=2)+'\n')
  print('TOTAL',len(checks),'PASSED',flush=True)
 finally:
  os.killpg(server.pid,signal.SIGTERM);server.wait(timeout=10);log.close()
