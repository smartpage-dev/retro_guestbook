package studio.luce.retrobooth.printing;

import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Locale;

/** Independent QR-only ESC/POS profile. NOT a port of the inaccessible H5.3 driver. */
public final class QrTicket {
    public static final String PROFILE="native-qr-model2-m-size4-v1";
    public static final int MAX_URL_BYTES=256;
    public static final int PHOTO_WIDTH=384, PHOTO_HEIGHT=336, PHOTO_BYTES=PHOTO_WIDTH*PHOTO_HEIGHT/8;
    public static final String PHOTO_ENCODING="escpos-gsv0-384x336-1bpp-v1";
    public static final String PHOTO_ENCODING_43="escpos-gsv0-384x288-1bpp-v2";
    public static final String PHOTO_ENCODING_169="escpos-gsv0-384x216-1bpp-v2";
    public static boolean validPhotoProfile(String encoding,int width,int height) {
        return width==PHOTO_WIDTH && ((height==336&&PHOTO_ENCODING.equals(encoding)) || (height==288&&PHOTO_ENCODING_43.equals(encoding)) || (height==216&&PHOTO_ENCODING_169.equals(encoding)));
    }
    private static String safeAscii(String value,int max) {
        if(value==null||value.length()>max)throw new IllegalArgumentException("Ticket label exceeds limit");
        for(int i=0;i<value.length();i++)if(value.charAt(i)<32||value.charAt(i)>126)throw new IllegalArgumentException("Ticket label contains nonprintable text");
        return value;
    }
    public final String id, clipId, payload, origin, label, parent, kind;
    public final byte[] bytes;
    public final boolean hasPhoto;
    public final String photoMoment, photoEncoding, title, caption, footer, style;
    public final int photoHeight;
    public final String fingerprint;
    public QrTicket(String id,String clipId,String payload,String label,String parent,String kind,String approvedOrigin) {
        this(id,clipId,payload,label,parent,kind,approvedOrigin,null,"");
    }
    /** Legacy entrypoint preserves the exact v0.9.5 raster and journal identity. */
    public QrTicket(String id,String clipId,String payload,String label,String parent,String kind,String approvedOrigin,byte[] photo,String moment) {
        this(id,clipId,payload,label,parent,kind,approvedOrigin,photo,moment,photo==null?"":PHOTO_ENCODING,photo==null?0:PHOTO_HEIGHT,"","","","classic");
    }
    /** Compatibility constructor: fingerprints of existing v0.9.7 tickets remain stable. */
    public QrTicket(String id,String clipId,String payload,String label,String parent,String kind,String approvedOrigin,byte[] photo,String moment,String encoding,int height,String title,String caption,String footer,String style) {
        this(id,clipId,payload,label,parent,kind,approvedOrigin,photo,moment,encoding,height,title,caption,footer,style,null,0,null,0,null,0);
    }
    /** Optional bounded 384-dot Unicode raster blocks; native exact QR command is unchanged. */
    public QrTicket(String id,String clipId,String payload,String label,String parent,String kind,String approvedOrigin,byte[] photo,String moment,String encoding,int height,String title,String caption,String footer,String style,byte[] titleRaster,int titleRasterHeight,byte[] captionRaster,int captionRasterHeight,byte[] footerRaster,int footerRasterHeight) {
        if(!hex(id,32)||!hex(clipId,32))throw new IllegalArgumentException("Invalid ticket identity");
        if(!parent.isEmpty()&&!hex(parent,32))throw new IllegalArgumentException("Invalid parent identity");
        if(!kind.equals("guest")&&!kind.equals("test"))throw new IllegalArgumentException("Invalid ticket kind");
        if(label==null||!label.matches("[0-9]{1,7}"))throw new IllegalArgumentException("Invalid numeric message label");
        if(payload==null||payload.length()>MAX_URL_BYTES||!payload.matches("[\\x21-\\x7E]+"))throw new IllegalArgumentException("QR must be bounded printable ASCII");
        URI u;
        try {u=new URI(payload);}catch(Exception e){throw new IllegalArgumentException("Invalid QR URL");}
        if(!"https".equals(u.getScheme())||u.getHost()==null||u.getUserInfo()!=null||u.getRawQuery()!=null||u.getPort()!=-1)
            throw new IllegalArgumentException("Root HTTPS origin required; no userinfo, query or non-default port");
        this.origin="https://"+u.getHost().toLowerCase(Locale.ROOT);
        if(kind.equals("test")) {
            if(!this.origin.equals("https://example.invalid")||!u.getRawPath().equals("/retrobooth-printer-test/"+clipId)||u.getRawFragment()!=null)
                throw new IllegalArgumentException("Invalid diagnostic QR");
        } else {
            if(!this.origin.equals(approvedOrigin)||!"/guest/".equals(u.getRawPath())||u.getRawFragment()==null||!u.getRawFragment().matches("[a-f0-9]{32}\\.[A-Za-z0-9_-]{32}"))
                throw new IllegalArgumentException("QR is not an exact guest capability on the approved cloud origin");
        }
        if(photo!=null&&(!validPhotoProfile(encoding,PHOTO_WIDTH,height)||photo.length!=PHOTO_WIDTH*height/8))throw new IllegalArgumentException("Ticket raster aspect profile/length invalid");
        if(photo!=null&&!String.valueOf(moment).matches("T-[123]|REC START|LEGACY|TEST LIVE|TEST SAMPLE"))throw new IllegalArgumentException("Invalid capture moment");
        if(photo==null&&((moment!=null&&!moment.isEmpty())||(encoding!=null&&!encoding.isEmpty())||height!=0))throw new IllegalArgumentException("Photo metadata without photo");
        if(!java.util.Arrays.asList("classic","minimal","ticket","premiere","filmstrip","boarding").contains(style))throw new IllegalArgumentException("Invalid ticket style");
        checkTextRaster(titleRaster,titleRasterHeight);checkTextRaster(captionRaster,captionRasterHeight);checkTextRaster(footerRaster,footerRasterHeight);
        if(titleRaster!=null&&!title.isEmpty()||captionRaster!=null&&!caption.isEmpty()||footerRaster!=null&&!footer.isEmpty())throw new IllegalArgumentException("Duplicate native and bitmap text");
        this.title=safeAscii(title,60);this.caption=safeAscii(caption,80);this.footer=safeAscii(footer,100);this.style=style;
        this.id=id;this.clipId=clipId;this.payload=payload;this.label=label;this.parent=parent;this.kind=kind;
        this.hasPhoto=photo!=null;this.photoMoment=photo==null?"":moment;this.photoHeight=photo==null?0:height;this.photoEncoding=photo==null?"":encoding;
        this.bytes=encode(payload,label,kind.equals("test"),photo,photoMoment,photoHeight,this.title,this.caption,this.footer,this.style,titleRaster,titleRasterHeight,captionRaster,captionRasterHeight,footerRaster,footerRasterHeight);
        String identity=PROFILE+"\n"+clipId+"\n"+payload+"\n"+label+"\n"+kind;
        // Keep QR-only fingerprints identical to the v0.9.4 journal; preserve old tickets.
        if(photo!=null)identity+="\nphoto:"+photoEncoding+":"+sha(photo)+":"+photoMoment;
        if(!this.title.isEmpty()||!this.caption.isEmpty()||!this.footer.isEmpty())identity+="\ndesign:"+this.style+":"+this.title+":"+this.caption+":"+this.footer;
        if(titleRaster!=null)identity+="\ntext-title:"+sha(titleRaster);
        if(captionRaster!=null)identity+="\ntext-caption:"+sha(captionRaster);
        if(footerRaster!=null)identity+="\ntext-footer:"+sha(footerRaster);
        // Do not change historical fingerprints without raster labels; with Unicode bitmap
        // labels, style changes alter physical header even when text pixels are identical.
        if(titleRaster!=null||captionRaster!=null||footerRaster!=null)identity+="\nunicode-style:"+style;
        this.fingerprint=sha(identity.getBytes(StandardCharsets.UTF_8));
    }
    public static boolean hex(String x,int n){return x!=null&&x.length()==n&&x.matches("[a-f0-9]+");}
    public static String sha(byte[] b){try{byte[] d=MessageDigest.getInstance("SHA-256").digest(b);StringBuilder s=new StringBuilder();for(byte x:d)s.append(String.format(Locale.ROOT,"%02x",x&255));return s.toString();}catch(Exception e){throw new IllegalStateException(e);}}
    private static void checkTextRaster(byte[] b,int height){
        if(b==null){if(height!=0)throw new IllegalArgumentException("Raster height without pixels");return;}
        if(height<16||height>152||height%8!=0||b.length!=48*height)throw new IllegalArgumentException("Invalid 384-dot Unicode text block");
    }
    private static void image(ByteArrayOutputStream b,byte[] pixels,int height){
        if(pixels==null)return;
        emit(b,0x1d,0x76,0x30,0,PHOTO_WIDTH/8,0,height&255,(height>>>8)&255);
        b.write(pixels,0,pixels.length);
        text(b,"\n");
    }
    private static byte[] encode(String value,String label,boolean test,byte[] photo,String moment,int height,String title,String caption,String footer,String style,byte[] titleRaster,int titleRasterHeight,byte[] captionRaster,int captionRasterHeight,byte[] footerRaster,int footerRasterHeight){
        ByteArrayOutputStream b=new ByteArrayOutputStream();
        emit(b,0x1b,0x40,0x1b,0x61,1); // initialize; centered ASCII only
        text(b,"RETROBOOTH\n"+(test?"PRINTER TEST - NOT A VIDEO":"PRIVATE VIDEO TICKET")+"\n");
        if(titleRaster!=null)image(b,titleRaster,titleRasterHeight);else if(!title.isEmpty())text(b,title+"\n");
        if("ticket".equals(style))text(b,"- CINEMA MEMORY TICKET -\n");
        if("premiere".equals(style))text(b,"* * WORLD PREMIERE * *\n");
        if("filmstrip".equals(style))text(b,"[ 35MM / FILM MEMORY ]\n");
        if("boarding".equals(style))text(b,"[ MEMORY BOARDING PASS ]\n");
        text(b,"MESSAGE "+label+"\n\n");
        if(photo!=null){
            text(b,"SNAPSHOT "+moment+"\n");
            // ESC/POS GS v 0: 48 bytes/row, 216/288/336 rows. m=0 (no scaling).
            // Compatibility profile only; printers lacking GS v 0 won't print the photo.
            emit(b,0x1d,0x76,0x30,0,PHOTO_WIDTH/8,0,height&255,height>>8);
            b.write(photo,0,photo.length);
            text(b,"\n");
        }
        if(captionRaster!=null)image(b,captionRaster,captionRasterHeight);else if(!caption.isEmpty())text(b,caption+"\n\n");
        emit(b,0x1d,0x28,0x6b,4,0,49,65,50,0); // Model 2
        emit(b,0x1d,0x28,0x6b,3,0,49,67,4); // 4 dots/module
        emit(b,0x1d,0x28,0x6b,3,0,49,69,49); // error correction M
        byte[] data=value.getBytes(StandardCharsets.US_ASCII);int n=data.length+3;
        emit(b,0x1d,0x28,0x6b,n&255,n>>8,49,80,48);b.write(data,0,data.length);
        emit(b,0x1d,0x28,0x6b,3,0,49,81,48);
        text(b,"\n"+(test?"Scan and check the EXACT content":"Keep private - includes delete access")+"\n");
        if(footerRaster!=null)image(b,footerRaster,footerRasterHeight);else if(!footer.isEmpty())text(b,footer+"\n");
        emit(b,0x1b,0x64,4,0x1b,0x61,0); // feed; no cutter command
        return b.toByteArray();
    }
    private static void emit(ByteArrayOutputStream b,int... values){for(int v:values)b.write(v);}
    private static void text(ByteArrayOutputStream b,String s){byte[] d=s.getBytes(StandardCharsets.US_ASCII);b.write(d,0,d.length);}
}
