package studio.luce.retrobooth;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.os.Build;
import androidx.webkit.WebResourceErrorCompat;
import org.json.JSONArray;
import java.util.ArrayDeque;
import android.provider.DocumentsContract;
import android.util.Base64;
import android.view.View;
import android.view.WindowManager;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.FrameLayout;
import android.widget.Toast;
import androidx.webkit.JavaScriptReplyProxy;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewClientCompat;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import org.json.JSONObject;
import java.io.ByteArrayInputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Experimental bundled-WebView shell. It is NOT a native recording/storage engine. */
public final class MainActivity extends Activity {
    private static final String ORIGIN = "https://appassets.androidplatform.net";
    private static final String PAGE = ORIGIN + "/assets/www/index.html";
    private static final int CAMERA_REQUEST=41, FILE_REQUEST=42, EXPORT_REQUEST=43;
    private WebView web;
    private NativePrinter printer;
    private NativeBackup backup;
    private volatile String cloudOrigin="";
    private boolean cloudApprovalPending=false;
    private FrameLayout root;
    private PermissionRequest pendingPermission;
    private PermissionRequest deferredPermission;
    private boolean activityResumed=false;
    private boolean runtimeMediaPrompt=false;
    private ValueCallback<Uri[]> fileCallback;
    private View videoView;
    private WebChromeClient.CustomViewCallback videoCallback;
    private final ExecutorService writer=Executors.newSingleThreadExecutor();
    private final Object exportLock=new Object();
    private ExportJob exportJob;
    private final ArrayDeque<JSONObject> nativeEvents=new ArrayDeque<>();
    private synchronized void nativeDiag(String name,String code){
        try{JSONObject event=new JSONObject();event.put("at",System.currentTimeMillis());
            event.put("name",name);event.put("code",code);nativeEvents.addLast(event);
            while(nativeEvents.size()>200)nativeEvents.removeFirst();}catch(Exception ignored){}
    }
    private synchronized JSONArray nativeSnapshot(){JSONArray arr=new JSONArray();for(JSONObject e:nativeEvents)arr.put(e);return arr;}
    private void sendDiagnostics(JSONObject m,JavaScriptReplyProxy reply){
        try{String id=m.getString("id");if(!id.matches("[a-f0-9]{32}")||!"snapshot".equals(m.getString("action")))return;
            JSONObject out=new JSONObject();out.put("id",id);out.put("available",true);
            out.put("androidSdk",Build.VERSION.SDK_INT);out.put("androidRelease",Build.VERSION.RELEASE);
            out.put("model",Build.MANUFACTURER+" "+Build.MODEL);
            out.put("cameraPermission",checkSelfPermission(Manifest.permission.CAMERA)==PackageManager.PERMISSION_GRANTED?"granted":"not_granted");
            out.put("micPermission",checkSelfPermission(Manifest.permission.RECORD_AUDIO)==PackageManager.PERMISSION_GRANTED?"granted":"not_granted");
            android.content.pm.PackageInfo pkg=WebView.getCurrentWebViewPackage();
            out.put("webViewVersion",pkg==null?"unavailable":pkg.versionName);
            out.put("events",nativeSnapshot());reply.postMessage(out.toString());
        }catch(Exception ignored){}
    }


    private static final class ExportJob {
        String id, name, mime, expectedHash;
        long expected, written;
        int sequence;
        Uri uri;
        OutputStream out;
        MessageDigest digest;
        JavaScriptReplyProxy pickerReply;
    }
    private static boolean trusted(Uri uri) {
        return uri!=null && "https".equals(uri.getScheme()) && "appassets.androidplatform.net".equals(uri.getHost())
            && (uri.getPort()==-1 || uri.getPort()==443) && uri.getUserInfo()==null;
    }
    private static WebResourceResponse blocked() {
        return new WebResourceResponse("text/plain","UTF-8",403,"Blocked",Collections.emptyMap(),
            new ByteArrayInputStream("External resource blocked in test shell".getBytes(StandardCharsets.UTF_8)));
    }
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        cloudOrigin=getPreferences(MODE_PRIVATE).getString("cloudOrigin", "");
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        root=new FrameLayout(this);setContentView(root);
        printer=new NativePrinter(this);
        backup=new NativeBackup(this);
        web=new WebView(this);root.addView(web,new FrameLayout.LayoutParams(-1,-1));
        nativeDiag("app_created","sdk_"+Build.VERSION.SDK_INT);
        WebSettings s=web.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);s.setAllowContentAccess(true); // User-selected logo content URIs only.
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);s.setMediaPlaybackRequiresUserGesture(false);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        WebViewAssetLoader loader=new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/",new WebViewAssetLoader.AssetsPathHandler(this)).build();
        web.setWebViewClient(new WebViewClientCompat(){
            @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){
                Uri u=request.getUrl();if(allowedCloudApi(u))return null;
                if(!trusted(u)||!u.getPath().startsWith("/assets/www/"))return blocked();
                WebResourceResponse response=loader.shouldInterceptRequest(u);return response!=null?response:blocked();
            }
            @Override public void onReceivedError(WebView view,WebResourceRequest request,WebResourceErrorCompat error){
                if(request.isForMainFrame())nativeDiag("webview_mainframe_error","code_"+error.getErrorCode());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){
                Uri u=request.getUrl();return !(trusted(u)&&"/assets/www/index.html".equals(u.getPath()));
            }
        });
        web.setWebChromeClient(new WebChromeClient(){
            @Override public void onPermissionRequest(PermissionRequest request){runOnUiThread(()->askMediaPermission(request));}
            @Override public void onPermissionRequestCanceled(PermissionRequest request){
                nativeDiag("webview_permission_cancelled","request_cancelled");
                if(pendingPermission==request){pendingPermission=null;runtimeMediaPrompt=false;}
                if(deferredPermission==request)deferredPermission=null;
            }
            @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params){
                if(fileCallback!=null)fileCallback.onReceiveValue(null);fileCallback=callback;
                Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("image/*");
                intent.putExtra(Intent.EXTRA_MIME_TYPES,new String[]{"image/png","image/jpeg"});
                try{startActivityForResult(intent,FILE_REQUEST);}catch(Exception e){callback.onReceiveValue(null);fileCallback=null;}
                return true;
            }
            @Override public void onShowCustomView(View view,CustomViewCallback callback){
                if(videoView!=null){callback.onCustomViewHidden();return;}videoView=view;videoCallback=callback;
                web.setVisibility(View.GONE);root.addView(view,new FrameLayout.LayoutParams(-1,-1));immersive();
            }
            @Override public void onHideCustomView(){hideVideo();}
        });
        if(WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)){
            WebViewCompat.addWebMessageListener(web,"RetroPrinterNative",Collections.singleton(ORIGIN),
                (view,message,sourceOrigin,isMainFrame,reply)->{
                    if(!isMainFrame||!trusted(sourceOrigin)||view.getUrl()==null||!"/assets/www/index.html".equals(Uri.parse(view.getUrl()).getPath()))return;
                    try{
                        String data=message.getData();if(data==null||data.length()>65536)return;
                        JSONObject command=new JSONObject(data);
                        // QR-only control commands remain 4 KiB. Only the two print operations
                        // may carry a bounded 384x216/288/336 photo PLUS at most three 384-dot Unicode text raster blocks.
                        // Strict total envelope 64 KiB; no other operation gains this larger cap.
                        if(data.length()>4096&&!("print".equals(command.optString("op"))||"test".equals(command.optString("op"))))return;
                        printer.handle(command,reply);
                    }catch(Exception e){toast("Printer request rejected.");}
                });
            WebViewCompat.addWebMessageListener(web,"RetroCloudNative",Collections.singleton(ORIGIN),
                (view,message,sourceOrigin,isMainFrame,reply)->{
                    if(!isMainFrame||!trusted(sourceOrigin))return;
                    try{approveCloud(new JSONObject(message.getData()),reply);}catch(Exception e){toast("Cloud approval rejected.");}
                });
            WebViewCompat.addWebMessageListener(web,"RetroDiagnosticsNative",Collections.singleton(ORIGIN),
                (view,message,sourceOrigin,isMainFrame,reply)->{
                    if(!isMainFrame||!trusted(sourceOrigin)||view.getUrl()==null||!"/assets/www/index.html".equals(Uri.parse(view.getUrl()).getPath()))return;
                    try{String data=message.getData();if(data!=null&&data.length()<512)sendDiagnostics(new JSONObject(data),reply);}catch(Exception ignored){}
                });
            WebViewCompat.addWebMessageListener(web,"RetroBackupNative",Collections.singleton(ORIGIN),
                (view,message,sourceOrigin,isMainFrame,reply)->{
                    if(!isMainFrame||!trusted(sourceOrigin)||view.getUrl()==null||!"/assets/www/index.html".equals(Uri.parse(view.getUrl()).getPath()))return;
                    try {String data=message.getData();if(data!=null&&data.length()<48000)backup.handle(new JSONObject(data),reply);}catch(Exception e){nativeDiag("backup_message_rejected","invalid_envelope");}
                });
            WebViewCompat.addWebMessageListener(web,"RetroNative",Collections.singleton(ORIGIN),
                (view,message,sourceOrigin,isMainFrame,reply)->{
                    if(!isMainFrame||!trusted(sourceOrigin))return;
                    try{handleExport(new JSONObject(message.getData()),reply);}catch(Exception e){toast("Export request rejected.");}
                });
        }else toast("Update Android System WebView. File export is unavailable on this WebView.");
        web.setDownloadListener((url,agent,disposition,mime,length)->toast("Use Play / export in Tape library. Unsupported download on this WebView."));
        web.loadUrl(PAGE);immersive();
    }
    private boolean allowedCloudApi(Uri uri){
        if(cloudOrigin.isEmpty()||uri==null||!"https".equals(uri.getScheme())||uri.getUserInfo()!=null||uri.getPath()==null||!uri.getPath().startsWith("/api/"))return false;
        Uri approved=Uri.parse(cloudOrigin);
        return approved.getHost().equals(uri.getHost()) && (uri.getPort()==-1||uri.getPort()==443);
    }
    private void approveCloud(JSONObject m,JavaScriptReplyProxy reply) throws Exception {
        String id=m.getString("id"),origin=m.getString("origin");
        if(!id.matches("[a-f0-9]{32}"))throw new IllegalArgumentException("Invalid request ID");
        Uri u=Uri.parse(origin);
        if(!"https".equals(u.getScheme())||u.getHost()==null||u.getUserInfo()!=null||u.getQuery()!=null||u.getFragment()!=null||u.getPort()!=-1||(u.getPath()!=null&&!u.getPath().isEmpty())){answer(reply,id,"Use a root HTTPS origin without a port or path.",0);return;}
        if(origin.equals(cloudOrigin)){answer(reply,id,null,0);return;}
        if(cloudApprovalPending){answer(reply,id,"Another cloud approval is open.",0);return;}
        cloudApprovalPending=true;
        new AlertDialog.Builder(this).setTitle("Allow private cloud delivery?")
            .setMessage("Recordings and a scoped device credential may be sent to:\n"+origin+"\n\nOnly /api/ requests are allowed. This does not enable a printer. Verify this is your server.")
            .setNegativeButton("Cancel",(d,w)->{cloudApprovalPending=false;answer(reply,id,"Cloud origin not approved.",0);})
            .setPositiveButton("Allow this server",(d,w)->{cloudApprovalPending=false;
                if(!getPreferences(MODE_PRIVATE).edit().putString("cloudOrigin",origin).commit()){answer(reply,id,"Could not save approved origin.",0);return;}
                cloudOrigin=origin;answer(reply,id,null,0);})
            .setOnCancelListener(d->{cloudApprovalPending=false;answer(reply,id,"Cloud origin not approved.",0);}).show();
    }
    private void askMediaPermission(PermissionRequest request){
        if(!trusted(request.getOrigin())||pendingPermission!=null){nativeDiag("media_permission_denied","untrusted_or_pending");request.deny();return;}
        List<String> required=new ArrayList<>();
        for(String resource:request.getResources()){
            if(PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource))required.add(Manifest.permission.CAMERA);
            else if(PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource))required.add(Manifest.permission.RECORD_AUDIO);
            else{request.deny();return;} // Never grant unknown web resources.
        }
        if(required.isEmpty()){nativeDiag("media_permission_denied","no_known_resources");request.deny();return;}
        nativeDiag("media_permission_requested",(required.contains(Manifest.permission.CAMERA)?"video":"")+(required.contains(Manifest.permission.RECORD_AUDIO)?"_audio":""));
        pendingPermission=request;
        List<String> missing=new ArrayList<>();for(String permission:required)if(checkSelfPermission(permission)!=PackageManager.PERMISSION_GRANTED)missing.add(permission);
        if(missing.isEmpty()){pendingPermission=null;nativeDiag("media_permission_granted","already_granted");request.grant(request.getResources());}
        else {
            // Android may pause the Activity to display its permission dialog.
            // Keep WebView media alive for this transient system prompt; onStop
            // still suspends it if the Activity actually leaves the foreground.
            runtimeMediaPrompt=true;
            requestPermissions(missing.toArray(new String[0]),CAMERA_REQUEST);
        }
    }
    @Override public void onRequestPermissionsResult(int requestCode,String[] permissions,int[] grants){
        super.onRequestPermissionsResult(requestCode,permissions,grants);
        if(requestCode==NativePrinter.PERMISSION_REQUEST){printer.permissionResult();return;}
        if(requestCode!=CAMERA_REQUEST||pendingPermission==null)return;
        PermissionRequest request=pendingPermission;pendingPermission=null;boolean ok=grants.length>0;
        for(String resource:request.getResources()){
            String permission=PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)?Manifest.permission.CAMERA:Manifest.permission.RECORD_AUDIO;
            ok &= checkSelfPermission(permission)==PackageManager.PERMISSION_GRANTED;
        }
        runtimeMediaPrompt=false;
        nativeDiag(ok?"media_permission_granted":"media_permission_denied",ok?"runtime_granted":"runtime_denied");
        if(!ok){request.deny();return;}
        if(!activityResumed){
            // Do not resume Chromium capture before its host Activity has resumed.
            deferredPermission=request;nativeDiag("media_permission_deferred","awaiting_activity_resume");
        }else request.grant(request.getResources());
    }
    private void handleExport(JSONObject m,JavaScriptReplyProxy reply) throws Exception {
        String id=m.getString("id"),type=m.getString("type");
        if(!id.matches("[a-f0-9]{32}"))throw new IllegalArgumentException("Bad export ID");
        if("begin".equals(type)){
            synchronized(exportLock){
                if(exportJob!=null){answer(reply,id,"An export is already active.",0);return;}
                ExportJob job=new ExportJob();job.id=id;job.expected=m.getLong("size");job.name=m.getString("name").replaceAll("[^a-zA-Z0-9._-]","_");
                job.mime=m.getString("mime").split(";",2)[0];job.expectedHash=m.optString("sha256","");
                if(job.expected<=0||job.expected>268435456||job.name.length()>180||!java.util.Arrays.asList("video/mp4","video/webm","image/png","application/json").contains(job.mime)
                    ||(!job.expectedHash.isEmpty()&&!job.expectedHash.matches("[a-f0-9]{64}"))){answer(reply,id,"Invalid export metadata.",0);return;}
                job.digest=MessageDigest.getInstance("SHA-256");job.pickerReply=reply;exportJob=job;
                Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType(job.mime).putExtra(Intent.EXTRA_TITLE,job.name);
                try{startActivityForResult(intent,EXPORT_REQUEST);}catch(Exception e){exportJob=null;answer(reply,id,"No Android document provider is available.",0);}
            }return;
        }
        writer.execute(()->{
            synchronized(exportLock){
                ExportJob job=exportJob;if(job==null||!job.id.equals(id)){answer(reply,id,"No matching export.",0);return;}
                try{
                    if("abort".equals(type)){cancelExport();return;}
                    if(job.out==null)throw new IllegalStateException("Choose a save destination first.");
                    if("chunk".equals(type)){
                        if(m.getInt("index")!=job.sequence)throw new IllegalStateException("Out-of-order export chunk.");
                        String base64=m.getString("base64");if(base64.length()>65536)throw new IllegalArgumentException("Chunk too large.");
                        byte[] data=Base64.decode(base64,Base64.DEFAULT);if(job.written+data.length>job.expected)throw new IllegalArgumentException("Export length exceeded.");
                        job.out.write(data);job.digest.update(data);job.written+=data.length;job.sequence++;answer(reply,id,null,job.written);
                    }else if("finish".equals(type)){
                        if(job.written!=job.expected)throw new IllegalStateException("Export length mismatch.");
                        StringBuilder hash=new StringBuilder();for(byte b:job.digest.digest())hash.append(String.format(java.util.Locale.ROOT,"%02x",b&255));
                        if(!job.expectedHash.isEmpty()&&!job.expectedHash.equals(hash.toString()))throw new IllegalStateException("Export checksum mismatch.");
                        job.out.flush();job.out.close();job.out=null;long bytes=job.written;exportJob=null;answer(reply,id,null,bytes);
                    }else throw new IllegalArgumentException("Unknown export command.");
                }catch(Exception e){cancelExport();answer(reply,id,"Export failed: "+e.getMessage(),0);}
            }
        });
    }
    private void answer(JavaScriptReplyProxy reply,String id,String error,long bytes){
        try{JSONObject m=new JSONObject();m.put("id",id);m.put("bytes",bytes);if(error!=null)m.put("error",error);
            String data=m.toString();runOnUiThread(()->{try{reply.postMessage(data);}catch(Exception ignored){}});
        }catch(Exception ignored){}
    }
    private void cancelExport(){ // Must hold exportLock. Only deletes the file created by this export.
        ExportJob job=exportJob;exportJob=null;if(job==null)return;
        try{if(job.out!=null)job.out.close();}catch(Exception ignored){}
        try{if(job.uri!=null)DocumentsContract.deleteDocument(getContentResolver(),job.uri);}catch(Exception ignored){}
    }
    @Override protected void onActivityResult(int code,int result,Intent data){
        super.onActivityResult(code,result,data);
        if(code==NativeBackup.PICK_TREE_REQUEST){backup.pickerResult(result,data);return;}
        if(code==FILE_REQUEST&&fileCallback!=null){fileCallback.onReceiveValue(result==RESULT_OK&&data!=null&&data.getData()!=null?new Uri[]{data.getData()}:null);fileCallback=null;}
        if(code==EXPORT_REQUEST){synchronized(exportLock){
            ExportJob job=exportJob;if(job==null)return;
            if(result!=RESULT_OK||data==null||data.getData()==null){exportJob=null;answer(job.pickerReply,job.id,"Export cancelled. Original clip is still in the library.",0);return;}
            try{job.uri=data.getData();job.out=getContentResolver().openOutputStream(job.uri,"w");if(job.out==null)throw new IllegalStateException("Could not open destination.");answer(job.pickerReply,job.id,null,0);}
            catch(Exception e){cancelExport();answer(job.pickerReply,job.id,"Cannot open selected destination.",0);}
        }}
    }
    private void hideVideo(){if(videoView!=null){root.removeView(videoView);videoView=null;web.setVisibility(View.VISIBLE);if(videoCallback!=null)videoCallback.onCustomViewHidden();videoCallback=null;}}
    private void immersive(){getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN|View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY|View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN|View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_LAYOUT_STABLE);}
    private void toast(String text){runOnUiThread(()->Toast.makeText(this,text,Toast.LENGTH_LONG).show());}
    @Override public void onWindowFocusChanged(boolean focus){super.onWindowFocusChanged(focus);if(focus)immersive();}
    @Override protected void onPause(){
        activityResumed=false;nativeDiag("app_lifecycle","paused");if(printer!=null)printer.pause();
        if(web!=null){
            if(runtimeMediaPrompt&&pendingPermission!=null){
                nativeDiag("webview_media_pause_suppressed","android_runtime_permission_dialog");
            }else{
                web.evaluateJavascript("window.dispatchEvent(new Event('retro-native-pause'))",null);
                web.onPause();
            }
        }
        super.onPause();
    }
    @Override protected void onStop(){
        // A system permission overlay normally produces only onPause. If the
        // Activity is genuinely stopped, never keep its mic/camera running.
        if(web!=null){web.evaluateJavascript("window.dispatchEvent(new Event('retro-native-pause'))",null);web.onPause();}
        if(pendingPermission!=null){pendingPermission.deny();pendingPermission=null;}
        if(deferredPermission!=null){deferredPermission.deny();deferredPermission=null;}
        runtimeMediaPrompt=false;
        nativeDiag("app_lifecycle","stopped");super.onStop();
    }
    @Override protected void onResume(){
        super.onResume();activityResumed=true;nativeDiag("app_lifecycle","resumed");
        if(printer!=null)printer.resume();if(web!=null)web.onResume();
        if(deferredPermission!=null){
            PermissionRequest request=deferredPermission;deferredPermission=null;
            boolean valid=true;
            for(String resource:request.getResources()){
                String permission=PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)?Manifest.permission.CAMERA:Manifest.permission.RECORD_AUDIO;
                valid &= checkSelfPermission(permission)==PackageManager.PERMISSION_GRANTED;
            }
            nativeDiag(valid?"media_permission_resume_granted":"media_permission_resume_denied","after_activity_resume");
            if(valid)request.grant(request.getResources());else request.deny();
        }
        immersive();
    }
    @Override public void onBackPressed(){if(videoView!=null){hideVideo();return;}new AlertDialog.Builder(this).setTitle("Exit RetroBooth TEST?").setMessage("Export recordings before clearing data or uninstalling. This is not an event-ready recorder.").setNegativeButton("Stay",null).setPositiveButton("Exit",(d,w)->finish()).show();}
    @Override protected void onDestroy(){if(backup!=null)backup.destroy();if(printer!=null)printer.destroy();if(pendingPermission!=null)pendingPermission.deny();if(deferredPermission!=null)deferredPermission.deny();if(fileCallback!=null)fileCallback.onReceiveValue(null);synchronized(exportLock){cancelExport();}writer.shutdownNow();if(web!=null){web.stopLoading();web.destroy();}super.onDestroy();}
}
