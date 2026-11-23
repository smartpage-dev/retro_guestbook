package studio.luce.retrobooth;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothSocket;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.provider.Settings;
import androidx.webkit.JavaScriptReplyProxy;
import org.json.JSONArray;
import org.json.JSONObject;
import studio.luce.retrobooth.printing.*;
import java.io.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;

/** Explicitly paired, pinned secure SPP transport. No scanning, insecure RFCOMM or raw-byte JS API. */
@SuppressLint("MissingPermission") // Every Bluetooth operation is guarded by permission(), including runtime revocation errors.
public final class NativePrinter {
    public static final int PERMISSION_REQUEST=44;
    private static final UUID SPP=UUID.fromString("00001101-0000-1000-8000-00805f9b34fb");
    private final Activity activity;
    private final ExecutorService worker=Executors.newSingleThreadExecutor();
    private final ScheduledExecutorService clock=Executors.newSingleThreadScheduledExecutor();
    private final AtomicBoolean busy=new AtomicBoolean(false);
    private final FastReturnGate fast=new FastReturnGate();
    private final Object linkLock=new Object();
    private volatile BluetoothSocket socket;
    private volatile String epoch="",pinned="",problem="",ledgerError="";
    private volatile boolean active=true,dead=false,autoEnabled=false,dialogOpen=false;
    private volatile AtomicBoolean activeCancel;
    private volatile String activePrintRequest="",activeClip="",pendingPrintRequest="",pendingClip="";
    private TicketLedger ledger;
    private TicketEngine engine;
    private String permissionId;
    private JavaScriptReplyProxy permissionReply;
    private AlertDialog dialog;

    public NativePrinter(Activity a){
        activity=a;pinned=a.getPreferences(Activity.MODE_PRIVATE).getString("qrPrinterAddress","");
        worker.execute(()->{try{ledger=new TicketLedger(new File(a.getFilesDir(),"qr-ticket-ledger-v1").toPath());engine=new TicketEngine(ledger);}catch(Exception e){ledgerError="Private ticket journal unavailable. Printing is blocked; do not clear app data.";}});
    }
    private BluetoothAdapter adapter(){BluetoothManager m=(BluetoothManager)activity.getSystemService(Activity.BLUETOOTH_SERVICE);return m==null?null:m.getAdapter();}
    private boolean permission(){return Build.VERSION.SDK_INT<31||activity.checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT)==PackageManager.PERMISSION_GRANTED;}
    private boolean connected(){try{return permission()&&socket!=null&&socket.isConnected()&&!epoch.isEmpty();}catch(Exception e){return false;}}
    private void needReady() throws IOException {if(dead||!active||ledger==null||!ledgerError.isEmpty())throw new IOException("Adapter unavailable");}
    private void reply(JavaScriptReplyProxy r,String id,JSONObject data,String error){
        try{JSONObject o=new JSONObject();o.put("id",id);o.put("version",1);if(error!=null)o.put("error",error);else o.put("data",data==null?new JSONObject():data);String text=o.toString();activity.runOnUiThread(()->{try{if(!dead)r.postMessage(text);}catch(Exception ignored){}});}catch(Exception ignored){}
    }
    private JSONObject status() throws Exception {
        JSONObject o=new JSONObject();o.put("available",true);o.put("profile",QrTicket.PROFILE);o.put("permission",permission());o.put("supported",adapter()!=null);o.put("pinned",pinned);o.put("connected",connected());o.put("connectionEpoch",epoch);o.put("busy",busy.get());o.put("automaticEnabled",autoEnabled);o.put("fastReturnArmed",fast.active(pinned,epoch,System.nanoTime()));o.put("paperStatus","unavailable");o.put("qrOnly",true);o.put("error",ledgerError.isEmpty()?problem:ledgerError);
        return o;
    }
    public void handle(JSONObject m,JavaScriptReplyProxy r){
        final String id=m.optString("id"),op=m.optString("op");
        if(!QrTicket.hex(id,32)||dead)return;
        if(!active){reply(r,id,null,"Printer unavailable while the app is not active.");return;}
        try{
            if(op.equals("permission")){
                if(permission()){reply(r,id,status(),null);return;}
                if(permissionReply!=null){reply(r,id,null,"A permission request is already open.");return;}
                permissionReply=r;permissionId=id;activity.requestPermissions(new String[]{Manifest.permission.BLUETOOTH_CONNECT},PERMISSION_REQUEST);return;
            }
            if(op.equals("settings")){if(busy.get()){reply(r,id,null,"Finish the current print first.");return;}activity.startActivity(new Intent(Settings.ACTION_BLUETOOTH_SETTINGS));reply(r,id,new JSONObject(),null);return;}
            if(op.equals("cancel")){
                String target=m.optString("requestId");
                if(!target.isEmpty()&&(target.equals(activePrintRequest)||target.equals(pendingPrintRequest))){cancelAndDisconnect();if(dialog!=null&&target.equals(pendingPrintRequest))dialog.cancel();}
                reply(r,id,status(),null);return;
            }
            if(op.equals("revoke")){
                String clip=m.optString("clipId");if(!QrTicket.hex(clip,32)){reply(r,id,null,"Invalid clip identity.");return;}
                if(clip.equals(activeClip)){cancelAndDisconnect();}if(clip.equals(pendingClip)&&dialog!=null)dialog.cancel();
                worker.execute(()->{try{needReady();ledger.revoke(clip);reply(r,id,new JSONObject(),null);}catch(Exception e){reply(r,id,null,"Native revocation could not be committed; disconnect the printer before further use.");}});return;
            }
            if(op.equals("disconnect")){cancelAndDisconnect();reply(r,id,status(),null);return;}
            if(op.equals("status")){worker.execute(()->{try{reply(r,id,status(),null);}catch(Exception e){reply(r,id,null,"Status unavailable.");}});return;}
            if(op.equals("list")){
                if(!permission()){reply(r,id,null,"Grant Nearby devices permission first.");return;}
                worker.execute(()->{try{BluetoothAdapter a=adapter();if(a==null||!a.isEnabled())throw new IOException();JSONArray rows=new JSONArray();List<BluetoothDevice> devices=new ArrayList<>(a.getBondedDevices());devices.sort(Comparator.comparing(BluetoothDevice::getAddress));
                    for(BluetoothDevice d:devices){JSONObject row=new JSONObject();row.put("address",d.getAddress());row.put("name",d.getName()==null?"Paired device":d.getName());rows.put(row);}JSONObject o=status();o.put("devices",rows);reply(r,id,o,null);
                }catch(Exception e){reply(r,id,null,"Bluetooth unavailable. Pair the printer in Android Settings first.");}});return;
            }
            if(op.equals("pin")){
                if(busy.get()||dialogOpen||!permission()){reply(r,id,null,"Finish current operation and grant Bluetooth permission first.");return;}
                String address=m.optString("address");BluetoothAdapter a=adapter();if(a==null||!BluetoothAdapter.checkBluetoothAddress(address)||a.getRemoteDevice(address).getBondState()!=BluetoothDevice.BOND_BONDED){reply(r,id,null,"Choose an already paired printer.");return;}
                confirm("Pin this ticket printer?","Dedicated device: "+address+"\nNo automatic switching to another device with the same name.",()->{
                    cancelAndDisconnect();boolean saved=activity.getPreferences(Activity.MODE_PRIVATE).edit().putString("qrPrinterAddress",address).commit();if(saved)pinned=address;
                    try{reply(r,id,saved?status():null,saved?null:"Could not save pinned printer.");}catch(Exception e){reply(r,id,null,"Printer setup failed.");}
                },()->reply(r,id,null,"Printer selection cancelled."));return;
            }
            if(op.equals("connect")){connect(r,id);return;}
            if(op.equals("automatic")){
                if(!m.optBoolean("enabled")){autoEnabled=false;fast.clear();reply(r,id,status(),null);return;}
                if(!connected()||busy.get()||dialogOpen||!ledgerError.isEmpty()){reply(r,id,null,"Connect and check the dedicated printer first.");return;}
                confirm("Allow automatic QR tickets?","This app may send one QR-only ticket after each saved cloud recording. No snapshot, cutter or paper sensor. Keep screen QR enabled until tested. Permission resets when disconnected or the app pauses.",()->{try{autoEnabled=connected()&&active;reply(r,id,status(),null);}catch(Exception e){reply(r,id,null,"Could not enable automatic tickets.");}},()->reply(r,id,null,"Automatic tickets remain off."));return;
            }
            if(op.equals("ledger")){
                worker.execute(()->{try{needReady();List<Properties> jobs=ledger.all();jobs.sort((x,y)->Long.compare(Long.parseLong(y.getProperty("created")),Long.parseLong(x.getProperty("created"))));JSONArray a=new JSONArray();for(Properties p:jobs.subList(0,Math.min(30,jobs.size()))){JSONObject j=new JSONObject();for(String key:Arrays.asList("id","clip","state","label","kind","created","parent"))j.put(key,p.getProperty(key));a.put(j);}JSONObject o=status();o.put("jobs",a);reply(r,id,o,null);}catch(Exception e){reply(r,id,null,"Ticket journal unavailable; no jobs were sent.");}});return;
            }
            if(op.equals("observe")){observe(m,r,id);return;}
            if(op.equals("fastOff")){fast.clear();reply(r,id,status(),null);return;}
            if(op.equals("print")||op.equals("test")){print(m,r,id,op.equals("test"));return;}
            reply(r,id,null,"Unknown printer operation.");
        }catch(Exception e){reply(r,id,null,"Printer request rejected; check permissions and current operation.");}
    }
    private void confirm(String title,String message,Runnable yes,Runnable no){
        if(dialogOpen||dead||!active){no.run();return;}dialogOpen=true;
        dialog=new AlertDialog.Builder(activity).setTitle(title).setMessage(message).setNegativeButton("Cancel",(d,w)->{dialogOpen=false;dialog=null;no.run();}).setPositiveButton("Continue",(d,w)->{dialogOpen=false;dialog=null;if(active&&!dead)yes.run();else no.run();}).setOnCancelListener(d->{dialogOpen=false;dialog=null;no.run();}).create();dialog.show();
    }
    public void permissionResult(){JavaScriptReplyProxy r=permissionReply;String id=permissionId;permissionReply=null;permissionId=null;if(r!=null)try{reply(r,id,status(),permission()?null:"Nearby devices permission denied. Screen QR remains available.");}catch(Exception e){reply(r,id,null,"Bluetooth permission unavailable.");}}
    private void connect(JavaScriptReplyProxy r,String id){
        if(dialogOpen||!permission()||pinned.isEmpty()||!busy.compareAndSet(false,true)){reply(r,id,null,"Choose a paired printer and finish the current operation first.");return;}
        worker.execute(()->{
            AtomicBoolean cancel=new AtomicBoolean(false);activeCancel=cancel;BluetoothSocket candidate=null;ScheduledFuture<?> timeout=null;
            try{
                needReady();closeSocket();fast.clear();autoEnabled=false;BluetoothAdapter a=adapter();if(a==null||!a.isEnabled())throw new IOException();BluetoothDevice d=a.getRemoteDevice(pinned);if(d.getBondState()!=BluetoothDevice.BOND_BONDED)throw new IOException();
                candidate=d.createRfcommSocketToServiceRecord(SPP);final BluetoothSocket target=candidate;
                synchronized(linkLock){if(cancel.get()||!active)throw new IOException();socket=candidate;}
                timeout=clock.schedule(()->{cancel.set(true);try{target.close();}catch(Exception ignored){}},8,TimeUnit.SECONDS);
                candidate.connect();
                synchronized(linkLock){if(cancel.get()||!active||socket!=candidate)throw new IOException();epoch=UUID.randomUUID().toString();}
                problem="";
            }catch(Exception e){closeSocket();problem="Secure SPP connection failed. Check power, pairing and protocol; no insecure fallback.";}
            finally{if(timeout!=null)timeout.cancel(false);if(activeCancel==cancel)activeCancel=null;busy.set(false);try{reply(r,id,status(),connected()?null:problem);}catch(Exception ignored){}}
        });
    }
    private void print(JSONObject m,JavaScriptReplyProxy r,String requestId,boolean test){
        if(dialogOpen||busy.get()){reply(r,requestId,null,"Printer busy. No ticket queued.");return;}
        if(!connected()||!permission()){reply(r,requestId,null,"Printer disconnected. Use the screen QR.");return;}
        boolean automatic=m.optBoolean("automatic",false);
        if(automatic&&(test||!autoEnabled)){reply(r,requestId,null,"Automatic QR tickets are not enabled for this connection.");return;}
        final QrTicket ticket;
        try{
            String origin=activity.getPreferences(Activity.MODE_PRIVATE).getString("cloudOrigin","");
            String job=m.optString("jobId"),clip=m.optString("clipId");
            if(test){job=UUID.randomUUID().toString().replace("-","");clip=job;}
            ticket=new QrTicket(job,clip,test?"https://example.invalid/retrobooth-printer-test/"+clip:m.optString("payload"),test?"0":m.optString("label"),test?"":m.optString("parent"),test?"test":"guest",origin);
            if(automatic&&(!ticket.id.equals(ticket.clipId)||!ticket.parent.isEmpty()))throw new IllegalArgumentException();
        }catch(Exception e){reply(r,requestId,null,"QR ticket rejected. Use a saved, non-deleted cloud clip on the approved HTTPS origin; maximum 256 ASCII bytes.");return;}
        int waitMs=Math.max(1000,Math.min(15000,m.optInt("waitMs",4000)));
        long deadlineEpoch=automatic?m.optLong("deadlineEpochMs",0):0;
        if(automatic&&(deadlineEpoch<=System.currentTimeMillis()||deadlineEpoch>System.currentTimeMillis()+16000)){reply(r,requestId,null,"Expired or invalid automatic print deadline.");return;}
        Runnable send=()->{pendingPrintRequest="";pendingClip="";int left=automatic?(int)Math.min(waitMs,deadlineEpoch-System.currentTimeMillis()):waitMs;if(left<=0){reply(r,requestId,null,"Print deadline expired; no ticket sent.");return;}send(ticket,automatic,left,r,requestId);};
        if(!automatic){pendingPrintRequest=requestId;pendingClip=ticket.clipId;}
        if(automatic)send.run();else confirm(ticket.parent.isEmpty()?"Send QR ticket?":"Reprint the SAME private link?",test?"This sends a diagnostic QR. It is NOT a video link. No photo or cutter command is sent.":"Message "+ticket.label+" to pinned printer "+pinned+".\nThis is a PRIVATE owner QR with delete access.\n"+(ticket.parent.isEmpty()?"An existing ticket ID is never automatically sent again.":"The original may already have printed. This intentionally creates another copy of the SAME link."),send,()->{pendingPrintRequest="";pendingClip="";reply(r,requestId,null,"Print cancelled. Nothing queued.");});
    }
    private void send(QrTicket ticket,boolean automatic,int waitMs,JavaScriptReplyProxy r,String requestId){
        if(!active||!connected()||(automatic&&!autoEnabled)||!busy.compareAndSet(false,true)){reply(r,requestId,null,"Printer no longer ready. No ticket queued.");return;}
        final String device=pinned,connection=epoch;final BluetoothSocket target=socket;
        final AtomicBoolean cancel=new AtomicBoolean(false);activeCancel=cancel;activePrintRequest=requestId;activeClip=ticket.clipId;final long deadline=System.nanoTime()+waitMs*1000000L;
        final ScheduledFuture<?> timeout=clock.schedule(()->{cancel.set(true);fast.clear();autoEnabled=false;try{target.close();}catch(Exception ignored){}},waitMs,TimeUnit.MILLISECONDS);
        worker.execute(()->{
            try{
                needReady();if(cancel.get()||!permission()||!connection.equals(epoch)||socket!=target||!active)throw new IOException();
                OutputStream out=target.getOutputStream();
                TicketEngine.Result result=engine.send(ticket,device,connection,new TicketEngine.Link(){public void write(byte[] b,int start,int n)throws IOException{out.write(b,start,n);}public void flush()throws IOException{out.flush();}},cancel,deadline);
                boolean eligible=!cancel.get()&&System.nanoTime()<deadline&&active&&connected()&&connection.equals(epoch)&&fast.permits(ticket,device,connection,System.nanoTime(),result);
                if(!result.state.equals("sent_unconfirmed")){fast.clear();autoEnabled=false;closeSocket();}
                JSONObject o=new JSONObject();o.put("jobId",ticket.id);o.put("clipId",ticket.clipId);o.put("urlHash",QrTicket.sha(ticket.payload.getBytes(java.nio.charset.StandardCharsets.US_ASCII)));o.put("state",result.state);o.put("duplicate",result.duplicate);o.put("bytes",result.bytes);o.put("connectionEpoch",connection);o.put("transport","android_secure_spp");o.put("simulated",false);o.put("paperConfirmed",false);o.put("fastReturnEligible",eligible);o.put("status",status());reply(r,requestId,o,null);
            }catch(Exception e){fast.clear();autoEnabled=false;closeSocket();reply(r,requestId,null,"Print not completed. Outcome may be unknown; inspect the ticket journal and paper. Never automatically retry.");}
            finally{timeout.cancel(false);if(activeCancel==cancel)activeCancel=null;activePrintRequest="";activeClip="";busy.set(false);}
        });
    }
    private void observe(JSONObject m,JavaScriptReplyProxy r,String id){
        if(busy.get()||dialogOpen||!connected()||!autoEnabled){reply(r,id,null,"Connect and enable automatic tickets before requesting fast return.");return;}
        String jobId=m.optString("jobId"),scanned=m.optString("scanned");if(!QrTicket.hex(jobId,32)||scanned.length()>256){reply(r,id,null,"Invalid scan observation.");return;}
        String device=pinned,connection=epoch;
        worker.execute(()->{
            try{needReady();Properties p=ledger.get(jobId);FastReturnGate probe=new FastReturnGate();probe.arm(p,scanned,device,connection,System.nanoTime());
                activity.runOnUiThread(()->confirm("Accept unconfirmed-paper fast return?","The pasted scan exactly matches a guest QR sent on THIS connection. This is your observation, not an electronic paper sensor.\n\nFast return can hide the screen QR after transmission even if paper runs out or becomes unreadable. Staff must watch the printer. This acceptance expires on disconnect/pause or after four hours.",()->{try{if(!active||!connected()||!autoEnabled||!device.equals(pinned)||!connection.equals(epoch))throw new IOException();fast.arm(p,scanned,device,connection,System.nanoTime());reply(r,id,status(),null);}catch(Exception e){reply(r,id,null,"Connection changed. Repeat the paper test.");}},()->reply(r,id,null,"Fast return remains disabled.")));
            }catch(Exception e){reply(r,id,null,"Scan mismatch or unsuitable ticket. Paste the COMPLETE unchanged guest URL from a QR just printed on this connection.");}
        });
    }
    private void closeSocket(){synchronized(linkLock){BluetoothSocket s=socket;socket=null;epoch="";if(s!=null)try{s.close();}catch(Exception ignored){}}}
    private void cancelAndDisconnect(){AtomicBoolean c=activeCancel;if(c!=null)c.set(true);autoEnabled=false;fast.clear();closeSocket();}
    public void pause(){active=false;cancelAndDisconnect();if(dialog!=null){dialog.cancel();dialog=null;dialogOpen=false;}}
    public void resume(){active=true;}
    public void destroy(){dead=true;active=false;cancelAndDisconnect();if(dialog!=null)dialog.dismiss();clock.shutdownNow();worker.execute(()->{if(ledger!=null)try{ledger.close();}catch(Exception ignored){}});worker.shutdown();}
}
