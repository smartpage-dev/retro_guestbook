import studio.luce.retrobooth.printing.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

/** Real JVM + temporary disk tests. Fake transport, no Android/Bluetooth/paper claims. */
public class TicketCoreTest {
 static int checks=0;
 static String id(int n){return String.format("%032x",n);}
 static String url="https://retro.example.test/guest/#"+id(91)+"."+"A".repeat(32);
 static String origin="https://retro.example.test";
 static void check(String name,boolean ok){if(!ok)throw new AssertionError(name);checks++;System.out.println("PASS "+name);}
 interface Throwing{void run()throws Exception;}
 static void rejects(String name,Throwing r){try{r.run();throw new AssertionError(name);}catch(AssertionError e){throw e;}catch(Exception e){check(name,true);}}
 static QrTicket ticket(int n){return new QrTicket(id(n),id(n),url,"47","","guest",origin);}
 static TicketEngine.Link sink(ByteArrayOutputStream b){return new TicketEngine.Link(){public void write(byte[] a,int s,int n){b.write(a,s,n);}public void flush(){}};}
 static long deadline(){return System.nanoTime()+TimeUnit.SECONDS.toNanos(5);}
 static byte[] qrBytes(byte[] b){for(int i=0;i<b.length-8;i++)if((b[i]&255)==29&&b[i+1]==40&&b[i+2]==107&&b[i+5]==49&&b[i+6]==80&&b[i+7]==48){int n=(b[i+3]&255)+256*(b[i+4]&255)-3;return Arrays.copyOfRange(b,i+8,i+8+n);}throw new AssertionError("QR command absent");}
 public static void main(String[]args)throws Exception{
  Path root=Files.createTempDirectory("retro-qr-tests-");QrTicket a=ticket(1);
  check("native QR stores the EXACT fragment-bearing URL",Arrays.equals(qrBytes(a.bytes),url.getBytes(StandardCharsets.US_ASCII)));
  check("encoder profile stable",QrTicket.PROFILE.equals("native-qr-model2-m-size4-v1"));
  check("idempotency hash excludes reprint job ID",new QrTicket(id(2),id(1),url,"47",id(1),"guest",origin).fingerprint.equals(a.fingerprint));
  check("byte profile starts initialize/center",a.bytes[0]==27&&a.bytes[1]==64&&a.bytes[2]==27&&a.bytes[3]==97&&a.bytes[4]==1);
  String raw=new String(a.bytes,StandardCharsets.ISO_8859_1);check("no cutter or raster commands",!raw.contains("\u001dV")&&!raw.contains("\u001dv"));
  for(String bad:List.of("http://retro.example.test/guest/#"+id(91)+"."+"A".repeat(32),url+"\n",url.replace("retro.example.test","wrong.example.test"),url.replace("/guest/","/admin/"),url.replace("https://","https://user@"),url.replace("guest/#","guest/?x=1#"),url.replace(".","\n")))rejects("reject unsafe payload "+checks,()->new QrTicket(id(1),id(1),bad,"47","","guest",origin));
  rejects("reject Unicode before encoding",()->new QrTicket(id(1),id(1),url+"\u4e2d","47","","guest",origin));
  rejects("reject escape injection in text",()->new QrTicket(id(1),id(1),url,"47\n\u001b@","","guest",origin));
  rejects("reject nonhex identity",()->new QrTicket("../bad",id(1),url,"47","","guest",origin));
  String longHost="https://"+"a".repeat(190)+".test";
  rejects("reject oversize QR",()->new QrTicket(id(1),id(1),longHost+"/guest/#"+id(91)+"."+"A".repeat(32),"47","","guest",longHost));
  QrTicket diagnostic=new QrTicket(id(50),id(50),"https://example.invalid/retrobooth-printer-test/"+id(50),"0","","test","");
  check("diagnostic explicitly NOT a video",new String(diagnostic.bytes,StandardCharsets.ISO_8859_1).contains("NOT A VIDEO"));
  byte[] pixels=new byte[QrTicket.PHOTO_BYTES];for(int i=0;i<pixels.length;i++)pixels[i]=(byte)(i%5==0?0x81:0x24);
  QrTicket photo=new QrTicket(id(60),id(60),url,"47","","guest",origin,pixels,"T-2");
  check("photo ticket declares raster profile",photo.hasPhoto&&QrTicket.PHOTO_ENCODING.equals("escpos-gsv0-384x336-1bpp-v1"));
  byte[] header=new byte[]{29,118,48,0,48,0,80,1};int imageAt=-1;
  for(int j=0;j<=photo.bytes.length-header.length;j++){boolean same=true;for(int k=0;k<header.length;k++)if(photo.bytes[j+k]!=header[k]){same=false;break;}if(same){imageAt=j;break;}}
  check("ESC/POS GS v 0 raster header exact 384x336",imageAt>0);
  check("raster payload exact bit order and length",Arrays.equals(Arrays.copyOfRange(photo.bytes,imageAt+header.length,imageAt+header.length+pixels.length),pixels));
  check("native model-2 QR remains scannable after raster",Arrays.equals(qrBytes(photo.bytes),url.getBytes(StandardCharsets.US_ASCII)));
  check("photo and QR-only fingerprints cannot collide",!photo.fingerprint.equals(new QrTicket(id(60),id(60),url,"47","","guest",origin).fingerprint));
  check("same photo layout intentional reprint preserves fingerprint",new QrTicket(id(61),id(60),url,"47",id(60),"guest",origin,pixels,"T-2").fingerprint.equals(photo.fingerprint));
  byte[] modified=Arrays.copyOf(pixels,pixels.length);modified[0]^=1;
  check("changed snapshot changes print identity",!new QrTicket(id(62),id(60),url,"47",id(60),"guest",origin,modified,"T-2").fingerprint.equals(photo.fingerprint));
  // v0.9.6 printed ticket supports physically different 4:3/16:9 photo heights, retaining native QR.
  byte[] p43=new byte[384*288/8];Arrays.fill(p43,(byte)0xAA);
  QrTicket t43=new QrTicket(id(501),id(501),url,"47","","guest",origin,p43,"T-2",QrTicket.PHOTO_ENCODING_43,288,"ALEX & SAM","THANK YOU","LUCE STUDIO","ticket");
  check("4:3 profile is 384x288 1bpp",t43.hasPhoto&&t43.photoHeight==288&&t43.photoEncoding.equals(QrTicket.PHOTO_ENCODING_43));
  check("4:3 GS v0 image uses correct height bytes",new String(t43.bytes,StandardCharsets.ISO_8859_1).contains("\u001dv0\u0000\u0030\u0000\u0020\u0001"));
  check("4:3 retains ORIGINAL private native QR",Arrays.equals(qrBytes(t43.bytes),url.getBytes(StandardCharsets.US_ASCII)));
  String str43=new String(t43.bytes,StandardCharsets.ISO_8859_1);
  check("04 paper title caption footer included",str43.contains("ALEX & SAM")&&str43.contains("THANK YOU")&&str43.contains("LUCE STUDIO"));
  check("04 cinema paper style header",str43.contains("CINEMA MEMORY TICKET"));
  check("4:3 raster only changes photo size, not QR payload",str43.contains("SNAPSHOT T-2"));
  byte[] p169=new byte[384*216/8];Arrays.fill(p169,(byte)0x55);
  QrTicket t169=new QrTicket(id(502),id(502),url,"47","","guest",origin,p169,"T-1",QrTicket.PHOTO_ENCODING_169,216,"","CAPTION","FOOTER","classic");
  check("16:9 profile is 384x216 1bpp",t169.hasPhoto&&t169.photoHeight==216&&t169.photoEncoding.equals(QrTicket.PHOTO_ENCODING_169));
  check("16:9 GS v0 correct height bytes",new String(t169.bytes,StandardCharsets.ISO_8859_1).contains("\u001dv0\u0000\u0030\u0000\u00d8\u0000"));
  check("16:9 retains native private QR",Arrays.equals(qrBytes(t169.bytes),url.getBytes(StandardCharsets.US_ASCII)));
  QrTicket sample=new QrTicket(id(503),id(503),"https://example.invalid/retrobooth-printer-test/"+id(503),"0","","test","",p169,"TEST SAMPLE",QrTicket.PHOTO_ENCODING_169,216,"TITLE","CAPTION","FOOTER","minimal");
  check("04 sample test clearly not real video",new String(sample.bytes,StandardCharsets.ISO_8859_1).contains("PRINTER TEST - NOT A VIDEO")&&new String(sample.bytes,StandardCharsets.ISO_8859_1).contains("SNAPSHOT TEST SAMPLE"));
  check("style caption changes fingerprint",!new QrTicket(id(504),id(502),url,"47",id(502),"guest",origin,p169,"T-1",QrTicket.PHOTO_ENCODING_169,216,"","NEW CAPTION","FOOTER","classic").fingerprint.equals(t169.fingerprint));
  rejects("invalid width/ratio profile fails closed",()->new QrTicket(id(505),id(505),url,"47","","guest",origin,p169,"T-1",QrTicket.PHOTO_ENCODING_43,216,"","","","classic"));
  rejects("wrong image payload byte length fails closed",()->new QrTicket(id(506),id(506),url,"47","","guest",origin,p43,"T-1",QrTicket.PHOTO_ENCODING_169,216,"","","","classic"));
  rejects("printable label cannot contain ESC control injection",()->new QrTicket(id(507),id(507),url,"47","","guest",origin,p43,"T-2",QrTicket.PHOTO_ENCODING_43,288,"HELLO\u001b@","","","classic"));
  rejects("no image rejects spurious ratio metadata",()->new QrTicket(id(508),id(508),url,"47","","guest",origin,null,"",QrTicket.PHOTO_ENCODING_43,288,"","","","classic"));
  // Old QR-only byte stream and 384x336 fingerprints validated earlier in same test.
  rejects("reject too-short raster",()->new QrTicket(id(63),id(63),url,"47","","guest",origin,new byte[10],"T-2"));
  rejects("reject invalid moment",()->new QrTicket(id(64),id(64),url,"47","","guest",origin,pixels,"\u001b@"));
  rejects("reject moment without raster",()->new QrTicket(id(65),id(65),url,"47","","guest",origin,null,"T-2"));
  check("photo data does not embed cut command",!new String(photo.bytes,StandardCharsets.ISO_8859_1).contains("\u001dV"));
  try(TicketLedger ledger=new TicketLedger(root)){
   TicketEngine.Result photoResult=new TicketEngine(ledger).send(photo,"D","E",sink(new ByteArrayOutputStream()),new AtomicBoolean(),System.nanoTime()+TimeUnit.SECONDS.toNanos(12));
   check("photo bytes sent on fake physical transport (unconfirmed)",photoResult.state.equals("sent_unconfirmed")&&photoResult.bytes==photo.bytes.length);
   String ledgerFile=Files.readString(root.resolve(photo.id+".job"));
   check("photo is NOT persisted to private journal",!ledgerFile.contains(java.util.Base64.getEncoder().encodeToString(pixels)));
   rejects("same-process second ledger lock rejected",()->{try(TicketLedger ignored=new TicketLedger(root)) {}});
   TicketEngine engine=new TicketEngine(ledger);ByteArrayOutputStream bytes=new ByteArrayOutputStream();AtomicInteger writes=new AtomicInteger();
   TicketEngine.Link checking=new TicketEngine.Link(){public void write(byte[] b,int s,int n)throws IOException{check("sending journal precedes chunk "+writes.incrementAndGet(),"sending".equals(ledger.get(a.id).getProperty("state")));bytes.write(b,s,n);}public void flush(){}};
   TicketEngine.Result r=engine.send(a,"AA:BB:CC:DD:EE:FF","epoch-1",checking,new AtomicBoolean(),deadline());
   check("success is unconfirmed paper",r.state.equals("sent_unconfirmed")&&!r.duplicate);
   check("all bytes exact",Arrays.equals(bytes.toByteArray(),a.bytes));
   check("journal contains NO guest URL",!Files.readString(root.resolve(a.id+".job")).contains("/guest/"));
   check("journal contains NO guest secret",!Files.readString(root.resolve(a.id+".job")).contains("A".repeat(32)));
   int before=bytes.size();r=engine.send(a,"OTHER","epoch-new",sink(bytes),new AtomicBoolean(),deadline());check("duplicate never retransmits even on new printer",r.duplicate&&bytes.size()==before);
   QrTicket conflict=new QrTicket(id(1),id(1),url.replace("A","B"),"47","","guest",origin);rejects("same ID changed link rejected",()->engine.send(conflict,"D","E",sink(bytes),new AtomicBoolean(),deadline()));
   QrTicket reprint=new QrTicket(id(2),id(1),url,"47",id(1),"guest",origin);r=engine.send(reprint,"AA:BB:CC:DD:EE:FF","epoch-1",sink(bytes),new AtomicBoolean(),deadline());check("intentional same-link reprint is new send",!r.duplicate&&r.state.equals("sent_unconfirmed"));
   QrTicket wrongParent=new QrTicket(id(3),id(3),url,"47",id(1),"guest",origin);rejects("parent must match original clip and payload",()->engine.send(wrongParent,"D","E",sink(bytes),new AtomicBoolean(),deadline()));
   QrTicket expired=ticket(4);before=bytes.size();r=engine.send(expired,"D","E",sink(bytes),new AtomicBoolean(),System.nanoTime()-1);check("expired operation sends zero bytes",r.state.equals("failed_before_send")&&bytes.size()==before);
   check("expired job never automatically restarts",engine.send(expired,"D","E",sink(bytes),new AtomicBoolean(),deadline()).duplicate);
   QrTicket partial=ticket(5);AtomicInteger calls=new AtomicInteger();r=engine.send(partial,"D","E",new TicketEngine.Link(){public void write(byte[] b,int s,int n)throws IOException{if(calls.incrementAndGet()==2)throw new IOException("unplugged");}public void flush(){}},new AtomicBoolean(),deadline());check("partial send becomes unknown",r.state.equals("outcome_unknown")&&calls.get()==2);
   before=bytes.size();r=engine.send(partial,"D","E",sink(bytes),new AtomicBoolean(),deadline());check("unknown never resends",r.duplicate&&bytes.size()==before);
   QrTicket flush=ticket(6);r=engine.send(flush,"D","E",new TicketEngine.Link(){public void write(byte[] b,int s,int n){}public void flush()throws IOException{throw new IOException();}},new AtomicBoolean(),deadline());check("flush failure is unknown",r.state.equals("outcome_unknown"));
   QrTicket cancelled=ticket(7);before=bytes.size();r=engine.send(cancelled,"D","E",sink(bytes),new AtomicBoolean(true),deadline());check("pre-cancel sends zero bytes",r.state.equals("failed_before_send")&&bytes.size()==before);
   QrTicket during=ticket(8);AtomicBoolean token=new AtomicBoolean();calls.set(0);r=engine.send(during,"D","E",new TicketEngine.Link(){public void write(byte[] b,int s,int n){calls.incrementAndGet();token.set(true);}public void flush(){}},token,deadline());check("cancel between writes stops later chunks",r.state.equals("outcome_unknown")&&calls.get()==1);
   FastReturnGate gate=new FastReturnGate();long now=System.nanoTime();Properties p=ledger.get(a.id);
   check("fast return defaults OFF",!gate.active("AA:BB:CC:DD:EE:FF","epoch-1",now));
   rejects("partial scan cannot arm",()->gate.arm(p,url.substring(0,url.length()-1),"AA:BB:CC:DD:EE:FF","epoch-1",now));
   rejects("another printer cannot arm",()->gate.arm(p,url,"OTHER","epoch-1",now));
   rejects("reconnect invalidates observation",()->gate.arm(p,url,"AA:BB:CC:DD:EE:FF","epoch-2",now));
   gate.arm(p,url,"AA:BB:CC:DD:EE:FF","epoch-1",now);check("exact observation arms current connection",gate.active("AA:BB:CC:DD:EE:FF","epoch-1",now));
   check("qualifying accepted send can use fast return",gate.permits(ticket(9),"AA:BB:CC:DD:EE:FF","epoch-1",now,new TicketEngine.Result("sent_unconfirmed",false,10)));
   check("duplicates cannot bypass",!gate.permits(a,"AA:BB:CC:DD:EE:FF","epoch-1",now,new TicketEngine.Result("sent_unconfirmed",true,0)));
   check("unknown cannot bypass",!gate.permits(a,"AA:BB:CC:DD:EE:FF","epoch-1",now,new TicketEngine.Result("outcome_unknown",false,12)));
   check("test QR cannot bypass",!gate.permits(diagnostic,"AA:BB:CC:DD:EE:FF","epoch-1",now,new TicketEngine.Result("sent_unconfirmed",false,12)));
   String longerOrigin="https://longer.retro.example.test";QrTicket longer=new QrTicket(id(10),id(10),url.replace(origin,longerOrigin),"47","","guest",longerOrigin);
   check("different origin cannot bypass",!gate.permits(longer,"AA:BB:CC:DD:EE:FF","epoch-1",now,new TicketEngine.Result("sent_unconfirmed",false,10)));
   check("acceptance expires after four hours",!gate.active("AA:BB:CC:DD:EE:FF","epoch-1",now+TimeUnit.HOURS.toNanos(4)));
   gate.clear();check("explicit disable clears gate",!gate.active("AA:BB:CC:DD:EE:FF","epoch-1",now));
   QrTicket revoked=ticket(11);ledger.revoke(revoked.clipId);before=bytes.size();rejects("revoked clip cannot send",()->engine.send(revoked,"D","E",sink(bytes),new AtomicBoolean(),deadline()));check("revoke sends zero bytes",bytes.size()==before);
   QrTicket midRevoke=ticket(12);calls.set(0);r=engine.send(midRevoke,"D","E",new TicketEngine.Link(){public void write(byte[] b,int s,int n)throws IOException{calls.incrementAndGet();ledger.revoke(midRevoke.clipId);}public void flush(){}},new AtomicBoolean(),deadline());check("revocation during send stops subsequent chunks",r.state.equals("outcome_unknown")&&calls.get()==1);
   ledger.reserve(ticket(13),"D","E");ledger.state(id(13),"sending","test interruption");ledger.reserve(ticket(14),"D","E");
  }
  try(TicketLedger restored=new TicketLedger(root)){
   check("interrupted send recovers as unknown","outcome_unknown".equals(restored.get(id(13)).getProperty("state")));
   check("interrupted prepared entry never auto sends","outcome_unknown".equals(restored.get(id(14)).getProperty("state")));
   check("confirmed transport terminal state retained","sent_unconfirmed".equals(restored.get(id(1)).getProperty("state")));
   check("revocation persists across restart",restored.revoked(id(11)));
   ByteArrayOutputStream b=new ByteArrayOutputStream();check("restart duplicate emits zero bytes",new TicketEngine(restored).send(ticket(13),"D","E",sink(b),new AtomicBoolean(),deadline()).duplicate&&b.size()==0);
  }
  Files.writeString(root.resolve(id(99)+".job"),"corrupt=true\n");rejects("corrupt ledger fails closed",()->{try(TicketLedger ignored=new TicketLedger(root)) {}});
  Path parent=Files.createTempDirectory("retro-not-directory-");Path bad=parent.resolve("file");Files.writeString(bad,"not directory");rejects("unwritable store blocks construction",()->{try(TicketLedger ignored=new TicketLedger(bad)) {}});
  System.out.println("TOTAL "+checks+" PASSED (real JVM/filesystem; fake transport, no Android/paper)");
 }
}
