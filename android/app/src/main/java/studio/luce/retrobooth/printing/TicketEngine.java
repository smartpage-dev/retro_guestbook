package studio.luce.retrobooth.printing;

import java.io.*;
import java.util.Properties;
import java.util.concurrent.atomic.AtomicBoolean;

/** Synchronous single-ticket engine. Native wrapper supplies socket + hard-close watchdog. */
public final class TicketEngine {
    public interface Link {void write(byte[] b,int start,int length) throws IOException;void flush() throws IOException;}
    public static final class Result {
        public final String state;public final boolean duplicate;public final int bytes;
        public Result(String s,boolean d,int n){state=s;duplicate=d;bytes=n;}
    }
    private final TicketLedger ledger;
    public TicketEngine(TicketLedger l){ledger=l;}
    public synchronized Result send(QrTicket t,String device,String epoch,Link link,AtomicBoolean cancelled,long deadlineNanos) throws IOException {
        if(!ledger.reserve(t,device,epoch)){Properties p=ledger.get(t.id);return new Result(p.getProperty("state"),true,0);}
        if(cancelled.get()||System.nanoTime()>=deadlineNanos){ledger.state(t.id,"failed_before_send","Deadline expired before first write");return new Result("failed_before_send",false,0);}
        ledger.state(t.id,"sending","Write intent committed; partial output may follow");int sent=0;
        try {
            while(sent<t.bytes.length){check(cancelled,deadlineNanos);if(ledger.revoked(t.clipId))throw new IOException("Recording revoked");int n=Math.min(128,t.bytes.length-sent);link.write(t.bytes,sent,n);sent+=n;
                if(sent<t.bytes.length)try{Thread.sleep(20);}catch(InterruptedException e){Thread.currentThread().interrupt();throw new IOException("Interrupted");}}
            check(cancelled,deadlineNanos);link.flush();check(cancelled,deadlineNanos);
            ledger.state(t.id,"sent_unconfirmed","Bytes accepted by transport; paper not confirmed");return new Result("sent_unconfirmed",false,sent);
        }catch(IOException|RuntimeException e){
            ledger.state(t.id,"outcome_unknown","Possible partial output; no automatic resend");return new Result("outcome_unknown",false,sent);
        }
    }
    private static void check(AtomicBoolean cancelled,long deadline) throws IOException {if(cancelled.get()||System.nanoTime()>=deadline)throw new IOException("Cancelled or expired");}
}
