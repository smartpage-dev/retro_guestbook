/* Screen receipt compositor; native physical ticket uses a separate QR command + the same pixelPhoto dither. */
(function () {
  'use strict';
  const PHOTO_ASPECTS=Object.freeze({'4:3':{width:384,height:288,lowHeight:96},'16:9':{width:384,height:216,lowHeight:72},legacy:{width:384,height:336,lowHeight:112}});
  function pixelPhoto(source,aspect='4:3') {
    const p=PHOTO_ASPECTS[aspect];if(!p)throw new Error('Unsupported ticket photo aspect.');
    const low=document.createElement('canvas');low.width=128;low.height=p.lowHeight;
    const c=low.getContext('2d',{willReadFrequently:true});
    const cr=RetroCore.cropRect(source.width,source.height,p.width/p.height);c.drawImage(source,cr.x,cr.y,cr.w,cr.h,0,0,128,p.lowHeight);
    const d=c.getImageData(0,0,128,p.lowHeight).data;const gray=new Uint8Array(128*p.lowHeight);const hist=new Uint32Array(256);
    for(let i=0;i<gray.length;i++){gray[i]=Math.round(.299*d[4*i]+.587*d[4*i+1]+.114*d[4*i+2]);hist[gray[i]]++;}
    let lo=0,hi=255,acc=0;for(let i=0;i<256;i++){acc+=hist[i];if(acc>=gray.length*.02){lo=i;break;}}
    acc=0;for(let i=255;i>=0;i--){acc+=hist[i];if(acc>=gray.length*.02){hi=i;break;}}
    const out=document.createElement('canvas');out.width=p.width;out.height=p.height;const ctx=out.getContext('2d');
    const img=ctx.createImageData(p.width,p.height);const bayer=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
    const order=[0,7,3,6,4,1,2,5,8],counts=[9,6,3,0];
    for(let y=0;y<p.lowHeight;y++)for(let x=0;x<128;x++){
      const n=hi-lo>10?Math.max(0,Math.min(1,(gray[y*128+x]-lo)/(hi-lo))):gray[y*128+x]/255;
      const level=Math.max(0,Math.min(3,Math.round(n*3+(bayer[(y%4)*4+x%4]/16-.5)*.65)));
      for(let yy=0;yy<3;yy++)for(let xx=0;xx<3;xx++){
        const index=(((y*3+yy)*p.width)+x*3+xx)*4;const val=order[yy*3+xx]<counts[level]?0:255;
        img.data[index]=img.data[index+1]=img.data[index+2]=val;img.data[index+3]=255;
      }
    }
    ctx.putImageData(img,0,0);return out;
  }
  const logoCache=new Map();
  async function prepare(settings){
    const src=settings.logoData;if(!src||logoCache.has(src))return;
    const image=new Image();image.src=src;await image.decode();logoCache.set(src,image);
    if(logoCache.size>8)logoCache.delete(logoCache.keys().next().value);
  }
  function renderReceipt(canvas,clip,source,settings){
    const payload=RetroCore.qrPayload(clip.id,clip.cloud),qr=new RetroQR(0,0);qr.addData(payload);qr.make();
    const module=5,quiet=4,qrSize=(qr.getModuleCount()+quiet*2)*module;
    const photo=settings.receipt!=='qr',showQR=settings.receipt!=='photo',style=settings.receiptStyle||'classic',landscape=settings.ticketOrientation==='landscape';
    // Landscape is a browser/preview ticket layout. Native 58mm SPP output keeps the native QR upright.
    const paperWidth=landscape?624:384,center=paperWidth/2;
    const paper=document.createElement('canvas');paper.width=paperWidth;paper.height=2400;
    const c=paper.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,paperWidth,2400);c.fillStyle='#000';c.textAlign='center';
    let y=24;
    function text(value,size=17,bold=false,maxLines=4){
      c.font=(bold?'bold ':'')+size+'px monospace';let line='',lines=[];
      for(const char of String(value||'')){if(c.measureText(line+char).width>paperWidth-36){lines.push(line);line=char;}else line+=char;}
      if(line)lines.push(line);lines=lines.slice(0,maxLines);
      lines.forEach(s=>{c.fillText(s,center,y+size);y+=size+7;});
    }
    function divider(){y+=10;c.beginPath();c.setLineDash(style==='minimal'?[]:[5,5]);c.moveTo(18,y);c.lineTo(paperWidth-18,y);c.stroke();c.setLineDash([]);y+=18;}
    const logo=logoCache.get(settings.logoData);
    if(logo){const scale=Math.min(280/logo.width,80/logo.height);const w=Math.round(logo.width*scale),h=Math.round(logo.height*scale);c.drawImage(logo,Math.round((paperWidth-w)/2),y,w,h);y+=h+18;}
    if(['ticket','premiere','boarding'].includes(style)){
      c.fillRect(14,y,paperWidth-28,style==='premiere'?50:36);c.fillStyle='#fff';
      c.font=(style==='premiere'?'bold 23px':'bold 18px')+' monospace';
      c.fillText(style==='premiere'?(landscape?'WORLD PREMIERE / YOUR MEMORY':'WORLD PREMIERE'):style==='boarding'?'MEMORY BOARDING PASS':'ADMIT ONE LITTLE MEMORY',center,y+(style==='premiere'?34:24));c.fillStyle='#000';y+=style==='premiere'?66:52;
    }
    if(style==='filmstrip'){
      c.fillStyle='#161616';c.fillRect(14,y,paperWidth-28,43);c.fillStyle='#fff';c.font='bold 20px monospace';c.fillText('35mm / RETROBOOTH FILM',center,y+28);c.fillStyle='#000';y+=61;
    }
    text(settings.title,style==='minimal'?28:25,true,3);text(settings.date,16,false,1);
    if(style!=='minimal')text('LOVE, ON TAPE.',14,false,1);
    divider();text(clip.cloud?'PRIVATE VIDEO / KEEP THIS TICKET':'PROTOTYPE / NOT A LIVE TICKET',16,true,1);y+=10;
    if(photo){const image=pixelPhoto(source,settings.ticketPhotoAspect||'legacy');c.drawImage(image,Math.floor((paperWidth-image.width)/2),y);y+=image.height+14;}
    text(settings.receiptCaption||'A LITTLE LOVE, TO KEEP.',18,true,3);divider();
    text('MESSAGE No. '+String(clip.seq).padStart(3,'0'),25,true,1);
    text('TAPE '+RetroCore.timeLabel(clip.durationMs)+' / '+(clip.kind==='demo'?'DEMO':'LOCAL'),17,false,1);y+=16;
    if(showQR){
      const left=Math.floor((paperWidth-qrSize)/2);
      for(let r=0;r<qr.getModuleCount();r++)for(let col=0;col<qr.getModuleCount();col++)if(qr.isDark(r,col))c.fillRect(left+(col+quiet)*module,y+(r+quiet)*module,module,module);
      y+=qrSize+15;text(clip.cloud?'SCAN TO VIEW / MAY BE UPLOADING':'DEMO QR / NO ONLINE VIDEO',16,true,1);text('Review and manage later',15,false,1);
    }
    divider();text(settings.receiptFooter||'THANK YOU FOR BEING HERE',17,false,5);
    text('RETROBOOTH BY @LUCE.STUDIOHK',14,false,1);text('LOCAL REF '+clip.id.slice(0,12).toUpperCase(),13,false,1);y+=20;
    if(y>2400)throw new Error('Receipt exceeded safe canvas height.');
    canvas.width=paperWidth;canvas.height=Math.ceil(y);const ctx=canvas.getContext('2d');ctx.drawImage(paper,0,0);
    const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
    for(let i=0;i<pixels.data.length;i+=4){const v=(pixels.data[i]*.299+pixels.data[i+1]*.587+pixels.data[i+2]*.114)<128?0:255;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=v;pixels.data[i+3]=255;}
    ctx.putImageData(pixels,0,0);
    return {payload,width:paperWidth,height:canvas.height,estimatedLengthMm:canvas.height/203*25.4,orientation:landscape?'landscape':'portrait',native58mmCompatible:!landscape};
  }
  window.Receipt={pixelPhoto,render:renderReceipt,prepare};
})();
