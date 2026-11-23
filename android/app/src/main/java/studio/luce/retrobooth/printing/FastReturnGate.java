package studio.luce.retrobooth.printing;
import java.nio.charset.StandardCharsets;
import java.util.Properties;

/** Explicit operator acceptance, never electronic confirmation of paper. Session-only. */
public final class FastReturnGate {
    private String device="",epoch="",origin="";private int maxBytes;private long until;
    public synchronized void clear(){device="";epoch="";origin="";maxBytes=0;until=0;}
    public synchronized void arm(Properties p,String scanned,String currentDevice,String currentEpoch,long now){
        if(p==null||!"guest".equals(p.getProperty("kind"))||!"sent_unconfirmed".equals(p.getProperty("state"))||!currentDevice.equals(p.getProperty("device"))||!currentEpoch.equals(p.getProperty("epoch"))||!p.getProperty("urlHash","").equals(QrTicket.sha(scanned.getBytes(StandardCharsets.US_ASCII))))
            throw new IllegalArgumentException("Scan must exactly match a guest QR sent on this connection");
        if(!scanned.matches("[\\x21-\\x7E]+"))throw new IllegalArgumentException("Scan must be unchanged ASCII");
        device=currentDevice;epoch=currentEpoch;origin=p.getProperty("origin");maxBytes=Integer.parseInt(p.getProperty("urlBytes"));until=now+4L*60*60*1000000000;
    }
    public synchronized boolean active(String dev,String ep,long now){return now<until&&device.equals(dev)&&epoch.equals(ep)&&!epoch.isEmpty();}
    public synchronized boolean permits(QrTicket t,String dev,String ep,long now,TicketEngine.Result result){
        return active(dev,ep,now)&&origin.equals(t.origin)&&t.kind.equals("guest")&&t.payload.length()<=maxBytes&&result.state.equals("sent_unconfirmed")&&!result.duplicate;
    }
}
