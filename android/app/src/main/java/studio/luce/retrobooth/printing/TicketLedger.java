package studio.luce.retrobooth.printing;

import java.io.*;
import java.nio.channels.*;
import java.nio.file.*;
import java.util.*;

/** Private hash-only journal. Never stores the guest capability or raster data. */
public final class TicketLedger implements AutoCloseable {
    private final Path root;
    private final FileChannel channel;
    private final FileLock lock;
    private boolean healthy=true,closed=false;
    public TicketLedger(Path root) throws IOException {
        Files.createDirectories(root);this.root=root;
        channel=FileChannel.open(root.resolve("ledger.lock"),StandardOpenOption.CREATE,StandardOpenOption.WRITE);
        FileLock acquired;
        try{acquired=channel.tryLock();}catch(OverlappingFileLockException e){channel.close();throw new IOException("Ticket ledger is already active");}
        if(acquired==null){channel.close();throw new IOException("Ticket ledger is already active");}lock=acquired;
        try {
            for(Properties p:all()){
                String state=p.getProperty("state");
                if(state.equals("prepared")||state.equals("sending")){p.setProperty("state","outcome_unknown");p.setProperty("detail","Interrupted process; never auto-resend");write(p);}
            }
        }catch(IOException|RuntimeException e){healthy=false;lock.release();channel.close();throw new IOException("Ticket ledger corrupt or unavailable; printing blocked",e);}
    }
    private void check() throws IOException {if(closed||!healthy)throw new IOException("Ticket ledger is not writable");}
    public synchronized Properties get(String id) throws IOException {
        check();if(!QrTicket.hex(id,32))throw new IOException("Invalid ticket ID");Path p=root.resolve(id+".job");
        if(!Files.exists(p))return null;return read(p);
    }
    private Properties read(Path f) throws IOException {
        if(Files.size(f)>16384)throw new IOException("Oversize ledger entry");Properties p=new Properties();try(InputStream in=Files.newInputStream(f)){p.load(in);}
        if(!f.getFileName().toString().equals(p.getProperty("id")+".job")||!QrTicket.hex(p.getProperty("id"),32)||!QrTicket.hex(p.getProperty("clip"),32)||!QrTicket.hex(p.getProperty("fingerprint"),64)||!QrTicket.hex(p.getProperty("urlHash"),64)||!QrTicket.PROFILE.equals(p.getProperty("profile"))||!Arrays.asList("prepared","sending","sent_unconfirmed","failed_before_send","outcome_unknown").contains(p.getProperty("state")))throw new IOException("Invalid ledger entry");
        return p;
    }
    public synchronized List<Properties> all() throws IOException {
        check();List<Properties> out=new ArrayList<>();try(DirectoryStream<Path> ds=Files.newDirectoryStream(root,"*.job")){for(Path f:ds){if(out.size()>=10000)throw new IOException("Ticket journal limit; export app records before maintenance");out.add(read(f));}}
        return out;
    }
    public synchronized boolean reserve(QrTicket t,String device,String epoch) throws IOException {
        check();if(revoked(t.clipId))throw new IOException("Recording was revoked; no ticket sent");Properties old=get(t.id);
        if(old!=null){if(!old.getProperty("fingerprint").equals(t.fingerprint))throw new IOException("Ticket identity conflict");return false;}
        if(!t.parent.isEmpty()){
            Properties parent=get(t.parent);if(parent==null||!parent.getProperty("fingerprint").equals(t.fingerprint))throw new IOException("Reprint must preserve the original link and message");
        }
        if(all().size()>=9999)throw new IOException("Ticket journal full; no printing attempted");
        Properties p=new Properties();p.setProperty("id",t.id);p.setProperty("clip",t.clipId);p.setProperty("fingerprint",t.fingerprint);p.setProperty("urlHash",QrTicket.sha(t.payload.getBytes(java.nio.charset.StandardCharsets.US_ASCII)));p.setProperty("profile",QrTicket.PROFILE);p.setProperty("origin",t.origin);p.setProperty("urlBytes",Integer.toString(t.payload.length()));p.setProperty("label",t.label);p.setProperty("kind",t.kind);p.setProperty("parent",t.parent);p.setProperty("device",device);p.setProperty("epoch",epoch);p.setProperty("created",Long.toString(System.currentTimeMillis()));p.setProperty("state","prepared");p.setProperty("detail","Committed before any printer bytes");write(p);return true;
    }
    public synchronized boolean revoked(String clip) throws IOException {check();if(!QrTicket.hex(clip,32))throw new IOException("Invalid clip ID");return Files.exists(root.resolve(clip+".revoked"));}
    public synchronized void revoke(String clip) throws IOException {
        check();if(!QrTicket.hex(clip,32))throw new IOException("Invalid clip ID");Path f=root.resolve(clip+".revoked");
        try(FileOutputStream out=new FileOutputStream(f.toFile())){out.write(1);out.getFD().sync();}
        try(FileChannel dir=FileChannel.open(root,StandardOpenOption.READ)){dir.force(true);}
    }
    public synchronized void state(String id,String state,String detail) throws IOException {
        check();Properties p=get(id);if(p==null)throw new IOException("Missing ticket record");String before=p.getProperty("state");
        boolean allowed=before.equals("prepared")&&(state.equals("sending")||state.equals("failed_before_send"))||before.equals("sending")&&(state.equals("sent_unconfirmed")||state.equals("outcome_unknown"));
        if(!allowed)throw new IOException("Invalid ticket state transition");p.setProperty("state",state);p.setProperty("detail",detail);write(p);
    }
    private void write(Properties p) throws IOException {
        Path tmp=null;
        try{
            tmp=Files.createTempFile(root,"ticket-",".tmp");
            try(FileOutputStream out=new FileOutputStream(tmp.toFile())){p.store(out,"RetroBooth hash-only ticket journal v1");out.getFD().sync();}
            Files.move(tmp,root.resolve(p.getProperty("id")+".job"),StandardCopyOption.REPLACE_EXISTING,StandardCopyOption.ATOMIC_MOVE);
            // Unsupported directory sync blocks the adapter; no unsafe non-atomic fallback.
            try(FileChannel dir=FileChannel.open(root,StandardOpenOption.READ)){dir.force(true);}
        }catch(IOException|RuntimeException e){healthy=false;throw new IOException("Ticket commit failed; adapter disabled",e);}
        finally{if(tmp!=null)Files.deleteIfExists(tmp);}
    }
    @Override public synchronized void close() throws IOException {if(!closed){closed=true;try{lock.release();}finally{channel.close();}}}
}
