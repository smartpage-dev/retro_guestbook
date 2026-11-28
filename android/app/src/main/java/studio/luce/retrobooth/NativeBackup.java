package studio.luce.retrobooth;

import android.app.Activity;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.UriPermission;
import android.database.Cursor;
import android.net.Uri;
import android.provider.DocumentsContract;
import android.util.Base64;
import androidx.webkit.JavaScriptReplyProxy;
import org.json.JSONObject;
import java.io.InputStream;
import java.io.OutputStream;
import java.security.MessageDigest;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Explicit Android SAF folder backup. NEVER moves or deletes IndexedDB originals.
 * No all-files permission or USB root path access. Only a selected persisted tree.
 * Completed files are re-read and SHA-256 checked before being marked verified.
 */
final class NativeBackup {
    static final int PICK_TREE_REQUEST = 44;
    static final long MAX_BYTES = 268435456L;
    private static final String PREFS = "retrobooth_usb_backup_v1";
    private static final String TREE = "tree";
    private static final String ENABLED = "enabled";
    private final Activity activity;
    private final ContentResolver resolver;
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private final SharedPreferences prefs;
    private volatile boolean selecting;
    private volatile boolean transferActive;
    private JavaScriptReplyProxy selectReply;
    private String selectId;
    private Job job; // accessed only from worker thread

    static final class Job {
        String id, name, expectedSha, mime;
        long length, written;
        int nextIndex;
        Uri temporary;
        OutputStream out;
        MessageDigest digest;
    }

    NativeBackup(Activity host) {
        activity = host;
        resolver = host.getContentResolver();
        prefs = host.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    void handle(JSONObject message, JavaScriptReplyProxy reply) {
        final String id = message.optString("id", ""), op = message.optString("op", "");
        if (!id.matches("[a-f0-9]{32}")) return;
        if ("select".equals(op)) {
            activity.runOnUiThread(() -> pick(id, reply));
            return;
        }
        if (selecting) { respond(reply, id, "Finish the Android folder picker first.", null); return; }
        worker.execute(() -> {
            try {
                switch (op) {
                    case "status": respond(reply, id, null, status()); break;
                    case "enable": {
                        if (job != null) throw new IllegalStateException("Copy in progress.");
                        if (!readyTree()) throw new IllegalStateException("Select a writable Android folder again.");
                        if (!prefs.edit().putBoolean(ENABLED, true).commit()) throw new IllegalStateException("Settings not saved.");
                        respond(reply, id, null, status()); break;
                    }
                    case "pause": {
                        if (job != null) throw new IllegalStateException("Wait for current copy to finish or abort.");
                        if (!prefs.edit().putBoolean(ENABLED, false).commit()) throw new IllegalStateException("Settings not saved.");
                        respond(reply, id, null, status()); break;
                    }
                    case "forget": {
                        if (job != null) throw new IllegalStateException("Wait for current copy to finish or abort.");
                        Uri old = tree();
                        if (!prefs.edit().remove(TREE).putBoolean(ENABLED, false).commit()) throw new IllegalStateException("Settings not saved.");
                        if (old != null) try {resolver.releasePersistableUriPermission(old, Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);}catch(Exception ignored){}
                        respond(reply, id, null, status()); break;
                    }
                    case "begin": begin(message, id, reply); break;
                    case "chunk": chunk(message, id, reply); break;
                    case "finish": finish(id, reply); break;
                    case "abort": {
                        if (job != null && job.id.equals(id)) abortPartial();
                        respond(reply, id, null, new JSONObject().put("aborted", true)); break;
                    }
                    case "verify": verify(message, id, reply); break;
                    default: throw new IllegalArgumentException("Unsupported backup command.");
                }
            } catch(Exception e) {
                // Never allow a failed write to look like a successful complete file.
                if (job != null && job.id.equals(id)) abortPartial();
                respond(reply, id, e.getMessage() == null ? "USB backup failed." : e.getMessage(), null);
            }
        });
    }

    private void pick(String id, JavaScriptReplyProxy reply) {
        if (selecting || transferActive) {respond(reply, id, "Another folder selection/copy is active.", null);return;}
        selecting = true;selectId = id;selectReply = reply;
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION |
            Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION | Intent.FLAG_GRANT_PREFIX_URI_PERMISSION);
        try {activity.startActivityForResult(intent, PICK_TREE_REQUEST);}
        catch(Exception e) {selecting = false;selectReply = null;selectId = null;respond(reply, id, "Android folder picker unavailable.", null);}
    }

    void pickerResult(int result, Intent data) {
        if (!selecting) return;
        JavaScriptReplyProxy reply = selectReply;String id = selectId;
        selecting = false;selectReply = null;selectId = null;
        if (result != Activity.RESULT_OK || data == null || data.getData() == null) {
            respond(reply, id, "Folder selection cancelled; existing backup destination is unchanged.", null);return;
        }
        final Uri chosen = data.getData();
        final int flags = data.getFlags() & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        worker.execute(() -> {
            boolean acquired = false;
            try {
                if (job != null) throw new IllegalStateException("Copy already in progress.");
                if ((flags & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION)) !=
                        (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION))
                    throw new IllegalStateException("This folder did not grant both reading and writing.");
                resolver.takePersistableUriPermission(chosen, flags);acquired = true;
                String label = directoryName(chosen); // checks the folder is currently mounted and accessible
                String previous = prefs.getString(TREE, "");
                if (!prefs.edit().putString(TREE, chosen.toString()).putBoolean(ENABLED, true).commit())
                    throw new IllegalStateException("Could not persist selected folder.");
                if (!previous.isEmpty() && !previous.equals(chosen.toString())) {
                    try {resolver.releasePersistableUriPermission(Uri.parse(previous), Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);}catch(Exception ignored){}
                }
                respond(reply, id, null, status());
            } catch(Exception e) {
                if (acquired && !chosen.toString().equals(prefs.getString(TREE, ""))) {
                    try {resolver.releasePersistableUriPermission(chosen, flags);}catch(Exception ignored){}
                }
                respond(reply, id, "Cannot use selected folder: " + e.getMessage(), null);
            }
        });
    }

    private Uri tree() {String v = prefs.getString(TREE, "");return v.isEmpty()?null:Uri.parse(v);}
    private boolean permitted(Uri u) {
        if (u == null) return false;
        for(UriPermission p:resolver.getPersistedUriPermissions()) {
            if(p.getUri().equals(u) && p.isReadPermission() && p.isWritePermission())return true;
        }
        return false;
    }
    private Uri directory(Uri tree) {
        return DocumentsContract.buildDocumentUriUsingTree(tree, DocumentsContract.getTreeDocumentId(tree));
    }
    private String directoryName(Uri tree) throws Exception {
        if (!permitted(tree)) throw new IllegalStateException("Android folder permission expired; select it again.");
        try (Cursor c = resolver.query(directory(tree),new String[]{DocumentsContract.Document.COLUMN_DISPLAY_NAME,DocumentsContract.Document.COLUMN_MIME_TYPE},null,null,null)) {
            if(c==null || !c.moveToFirst() || !DocumentsContract.Document.MIME_TYPE_DIR.equals(c.getString(1)))
                throw new IllegalStateException("Folder is not available; reconnect the USB drive.");
            String label = c.getString(0);return label==null?"Selected folder":label;
        }
    }
    private boolean readyTree(){try {Uri u=tree();if(u==null)return false;directoryName(u);return true;}catch(Exception e){return false;}}
    private String key(Uri uri) throws Exception {
        byte[] hash = MessageDigest.getInstance("SHA-256").digest(uri.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8));
        StringBuilder s=new StringBuilder();for(int i=0;i<12;i++)s.append(String.format(Locale.ROOT,"%02x",hash[i]&255));return s.toString();
    }
    private JSONObject status() throws Exception {
        JSONObject result = new JSONObject();Uri u = tree();boolean ready = readyTree();
        result.put("available",true).put("configured",u!=null).put("enabled",prefs.getBoolean(ENABLED,false)).put("ready",ready);
        result.put("busy",transferActive);
        if(u!=null) {
            result.put("folderKey",key(u));
            if(ready) result.put("folderName",directoryName(u));
            else result.put("folderName","Unavailable / USB disconnected or permission expired");
        }
        return result;
    }
    private Uri requireDestination() throws Exception {
        Uri u=tree();if(u==null || !prefs.getBoolean(ENABLED,false) || !permitted(u))
            throw new IllegalStateException("USB backup is not enabled or folder permission has expired.");
        directoryName(u);return u;
    }
    private static String safeName(JSONObject m) throws Exception {
        String name=m.getString("name");
        if(name.length()>120 || !name.matches("RetroBooth_[A-Za-z0-9._-]{8,110}\\.(webm|mp4)") || name.contains(".."))
            throw new IllegalArgumentException("Unsafe backup filename.");
        return name;
    }
    private static String mimeName(String name) {return name.endsWith(".mp4")?"video/mp4":"video/webm";}
    private Uri findNamed(Uri tree,String filename) throws Exception {
        Uri children=DocumentsContract.buildChildDocumentsUriUsingTree(tree,DocumentsContract.getTreeDocumentId(tree));
        Uri found=null;
        try(Cursor c=resolver.query(children,new String[]{DocumentsContract.Document.COLUMN_DOCUMENT_ID,DocumentsContract.Document.COLUMN_DISPLAY_NAME},null,null,null)) {
            if(c==null)throw new IllegalStateException("Cannot list the selected USB folder.");
            int count=0;
            while(c.moveToNext()) {
                if(++count>25000)throw new IllegalStateException("Selected folder has too many files; use a new event folder.");
                if(filename.equals(c.getString(1))) {
                    if(found!=null)throw new IllegalStateException("Multiple same-named USB files; review the folder manually.");
                    found=DocumentsContract.buildDocumentUriUsingTree(tree,c.getString(0));
                }
            }
        }
        return found;
    }
    private static final class Check {long count;String sha;}
    private Check readVerify(Uri uri,long expected,String sha) throws Exception {
        MessageDigest digest=MessageDigest.getInstance("SHA-256");Check r=new Check();byte[] buffer=new byte[65536];
        try(InputStream in=resolver.openInputStream(uri)) {
            if(in==null)throw new IllegalStateException("Cannot read backup from selected folder.");
            for(int n;(n=in.read(buffer))!=-1;) {
                r.count+=n;if(r.count>expected)throw new IllegalStateException("USB file is larger than original.");
                digest.update(buffer,0,n);
            }
        }
        StringBuilder hex=new StringBuilder();for(byte b:digest.digest())hex.append(String.format(Locale.ROOT,"%02x",b&255));r.sha=hex.toString();
        if(r.count!=expected || !r.sha.equals(sha))throw new IllegalStateException("USB file did not match SHA-256 / size; keep original in app.");
        return r;
    }
    private static void validateSizeHash(JSONObject m) throws Exception {
        long size=m.getLong("size");String hash=m.getString("sha256");
        if(size<=0 || size>MAX_BYTES || !hash.matches("[a-f0-9]{64}"))throw new IllegalArgumentException("Invalid video size or SHA-256.");
    }
    private void begin(JSONObject m,String id,JavaScriptReplyProxy reply) throws Exception {
        if(job!=null)throw new IllegalStateException("Another USB copy is already active.");
        Uri tree=requireDestination();String name=safeName(m);validateSizeHash(m);
        String mime=m.getString("mime");if(!mimeName(name).equals(mime))throw new IllegalArgumentException("File type does not match filename.");
        long size=m.getLong("size");String hash=m.getString("sha256");
        Uri previous=findNamed(tree,name);
        if(previous!=null) {
            readVerify(previous,size,hash); // idempotent retry after an app crash / interrupted acknowledgement
            respond(reply,id,null,new JSONObject().put("alreadyVerified",true).put("verified",true).put("bytes",size));return;
        }
        Job created=new Job();created.id=id;created.name=name;created.mime=mime;created.expectedSha=hash;created.length=size;
        created.digest=MessageDigest.getInstance("SHA-256");
        try {
            created.temporary=DocumentsContract.createDocument(resolver,directory(tree),mime,"INCOMPLETE_"+name);
            if(created.temporary==null)throw new IllegalStateException("USB drive refused to create a file.");
            created.out=resolver.openOutputStream(created.temporary,"w");
            if(created.out==null)throw new IllegalStateException("Cannot open USB file for writing.");
            job=created;transferActive=true;
            respond(reply,id,null,new JSONObject().put("bytes",0));
        }catch(Exception e){job=created;abortPartial();throw e;}
    }
    private Job matching(String id) {
        if(job==null || !job.id.equals(id))throw new IllegalStateException("No matching USB transfer; retry from the local clip.");
        return job;
    }
    private void chunk(JSONObject m,String id,JavaScriptReplyProxy reply) throws Exception {
        Job j=matching(id);if(m.getInt("index")!=j.nextIndex)throw new IllegalStateException("USB chunk out of order.");
        String encoded=m.getString("base64");if(encoded.length()>45000)throw new IllegalStateException("USB chunk too large.");
        byte[] bytes=Base64.decode(encoded,Base64.NO_WRAP);
        if(bytes.length==0 || bytes.length>32768 || j.written+bytes.length>j.length)throw new IllegalStateException("Invalid USB chunk length.");
        j.out.write(bytes);j.digest.update(bytes);j.written+=bytes.length;j.nextIndex++;
        respond(reply,id,null,new JSONObject().put("bytes",j.written));
    }
    private void finish(String id,JavaScriptReplyProxy reply) throws Exception {
        Job j=matching(id);
        if(j.written!=j.length)throw new IllegalStateException("USB copy incomplete.");
        byte[] hash=j.digest.digest();StringBuilder hex=new StringBuilder();for(byte b:hash)hex.append(String.format(Locale.ROOT,"%02x",b&255));
        if(!j.expectedSha.equals(hex.toString()))throw new IllegalStateException("Source checksum mismatch. Original remains in app.");
        j.out.flush();j.out.close();j.out=null;
        // Some USB providers buffer writes. Read the destination back, not only the bytes sent over the bridge.
        readVerify(j.temporary,j.length,j.expectedSha);
        Uri finalUri=DocumentsContract.renameDocument(resolver,j.temporary,j.name);
        if(finalUri==null)throw new IllegalStateException("USB provider cannot finalize/rename this file; select a writable folder.");
        j.temporary=finalUri;
        // Verify the final named item as the client will see it; reject providers that silently change names.
        Uri visible=findNamed(requireDestination(),j.name);
        if(visible==null)throw new IllegalStateException("Final file not visible on USB; keep original.");
        readVerify(visible,j.length,j.expectedSha);
        long bytes=j.written;job=null;transferActive=false;
        respond(reply,id,null,new JSONObject().put("verified",true).put("bytes",bytes).put("name",j.name));
    }
    private void verify(JSONObject m,String id,JavaScriptReplyProxy reply) throws Exception {
        if(job!=null)throw new IllegalStateException("Wait for USB copy to finish.");
        Uri tree=requireDestination();String name=safeName(m);validateSizeHash(m);
        Uri found=findNamed(tree,name);if(found==null)throw new IllegalStateException("Backup file missing on USB: " + name);
        Check checked=readVerify(found,m.getLong("size"),m.getString("sha256"));
        respond(reply,id,null,new JSONObject().put("verified",true).put("bytes",checked.count).put("name",name));
    }
    private void abortPartial() {
        Job j=job;job=null;transferActive=false;
        if(j==null)return;
        try {if(j.out!=null)j.out.close();}catch(Exception ignored){}
        // Only the temporary file created by THIS invocation is eligible for deletion.
        // If a provider refuses deletion, it remains named INCOMPLETE_ for manual cleanup.
        try {if(j.temporary!=null)DocumentsContract.deleteDocument(resolver,j.temporary);}catch(Exception ignored){}
    }
    private void respond(JavaScriptReplyProxy reply,String id,String error,JSONObject payload) {
        try {
            JSONObject out=payload==null?new JSONObject():payload;
            out.put("id",id);
            if(error!=null)out.put("error",error);
            String text=out.toString();activity.runOnUiThread(()->{try{reply.postMessage(text);}catch(Exception ignored){}});
        }catch(Exception ignored){}
    }
    void destroy() {
        worker.execute(this::abortPartial);
        worker.shutdown();
    }
}
