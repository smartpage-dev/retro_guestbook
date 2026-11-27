import studio.luce.retrobooth.printing.QrTicket;
import java.util.Arrays;

public final class TicketUnicodeRasterTest {
    private static int passed=0;
    private static void check(String description,boolean condition){if(!condition)throw new AssertionError(description);passed++;System.out.println("PASS "+description);}
    private static boolean includes(byte[] whole,byte[] part){outer:for(int i=0;i+part.length<=whole.length;i++){for(int j=0;j<part.length;j++)if(whole[i+j]!=part[j])continue outer;return true;}return false;}
    public static void main(String[] args){
        byte[] text=new byte[48*64];Arrays.fill(text,(byte)0x55);
        String clip="0123456789abcdef0123456789abcdef";
        QrTicket t=new QrTicket(clip,clip,"https://example.invalid/retrobooth-printer-test/"+clip,"0","","test","",null,"","",0,"","","","premiere",text,64,text,64,text,64);
        byte[] h={(byte)0x1d,0x76,0x30,0,48,0,64,0};
        check("Unicode blocks encoded as 384-dot raster",includes(t.bytes,h));
        check("Multilingual label data exactly included",includes(t.bytes,text));
        check("Exact native QR model 2 command preserved",includes(t.bytes,new byte[]{29,40,107,4,0,49,65,50,0}));
        check("Native QR print command preserved",includes(t.bytes,new byte[]{29,40,107,3,0,49,81,48}));
        check("Extra Unicode blocks do not alter photo flag",!t.hasPhoto);
        check("Raster changes journal fingerprint",!t.fingerprint.equals(new QrTicket(clip,clip,t.payload,"0","","test","",null,"","",0,"","","","premiere").fingerprint));
        QrTicket alternate=new QrTicket(clip,clip,t.payload,"0","","test","",null,"","",0,"","","","filmstrip",text,64,text,64,text,64);
        check("Unicode ticket style updates fingerprint without breaking old journal",!t.fingerprint.equals(alternate.fingerprint));
        boolean rejected=false;try{new QrTicket(clip,clip,t.payload,"0","","test","",null,"","",0,"","","","classic",new byte[13],64,null,0,null,0);}catch(IllegalArgumentException e){rejected=true;}
        check("Malformed raster blocked before transmission",rejected);
        rejected=false;try{new QrTicket(clip,clip,t.payload,"0","","test","",null,"","",0,"A","","","classic",text,64,null,0,null,0);}catch(IllegalArgumentException e){rejected=true;}
        check("Native and raster duplicate text blocked",rejected);
        System.out.println("TOTAL "+passed+" UNICODE TICKET TESTS PASSED");
    }
}
