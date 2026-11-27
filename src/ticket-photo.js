/* Locally captured ticket still. 4:3 or 16:9; legacy 8:7 retained for saved v0.9.5 clips. */
(function(root){
 'use strict';
 const WIDTH=384;
 const PROFILES=Object.freeze({
  '4:3':Object.freeze({width:WIDTH,height:288,encoding:'escpos-gsv0-384x288-1bpp-v2',captureHeight:384}),
  '16:9':Object.freeze({width:WIDTH,height:216,encoding:'escpos-gsv0-384x216-1bpp-v2',captureHeight:288}),
  legacy:Object.freeze({width:WIDTH,height:336,encoding:'escpos-gsv0-384x336-1bpp-v1',captureHeight:448})
 });
 function profile(aspect){const p=PROFILES[aspect];if(!p)throw new Error('Unknown ticket screenshot aspect ratio.');return p;}
 function capture(source,aspect='4:3'){
  if(!source||!(source.width>0&&source.height>0))throw new Error('No live camera frame for ticket.');
  const p=profile(aspect),crop=root.RetroCore.cropRect(source.width,source.height,p.width/p.height);
  const c=document.createElement('canvas');c.width=512;c.height=p.captureHeight;
  c.getContext('2d',{alpha:false}).drawImage(source,crop.x,crop.y,crop.w,crop.h,0,0,c.width,c.height);
  return c.toDataURL('image/jpeg',.82);
 }
 function raster(source,aspect='4:3'){
  if(!source||!(source.width>0&&source.height>0))throw new Error('Ticket photo has no pixels.');
  const p=profile(aspect),monochrome=root.Receipt.pixelPhoto(source,aspect);
  if(monochrome.width!==p.width||monochrome.height!==p.height)throw new Error('Unexpected ticket image size.');
  const pixels=monochrome.getContext('2d',{willReadFrequently:true}).getImageData(0,0,p.width,p.height).data;
  const bytes=new Uint8Array(p.width*p.height/8);
  for(let y=0;y<p.height;y++)for(let x=0;x<p.width;x++){
   const offset=(y*p.width+x)*4;
   if(pixels[offset]<128)bytes[y*(p.width/8)+(x>>3)]|=0x80>>(x&7);
  }
  let data='';for(let i=0;i<bytes.length;i+=2048)data+=String.fromCharCode(...bytes.subarray(i,i+2048));
  return {photoEncoding:p.encoding,photoWidth:p.width,photoHeight:p.height,photoBase64:btoa(data)};
 }
 async function fromDataURL(url,aspect='legacy'){
  if(typeof url!=='string'||url.length>600000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(url))throw new Error('Saved ticket still missing or unsupported.');
  const im=new Image();im.src=url;
  await Promise.race([im.decode(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Ticket still decode timed out.')),5000))]);
  if(im.width<16||im.height<16||im.width>2048||im.height>2048)throw new Error('Ticket still dimensions invalid.');
  return raster(im,aspect);
 }
 async function fromClip(clip){
  if(clip?.settings?.receipt==='qr')return {};
  const photo=clip?.ticketSnapshot || clip?.rawSnapshot;
  if(!photo)throw new Error('No saved still for this photo ticket.');
  // v0.9.5 clips did not record a ratio; DO NOT reinterpret their saved paper layout.
  const aspect=clip.settings&&Object.hasOwn(clip.settings,'ticketPhotoAspect')?clip.settings.ticketPhotoAspect:'legacy';
  const result=await fromDataURL(photo,aspect);
  const moment=clip.ticketSnapshot?clip.ticketPhotoMoment||'T-2':'LEGACY';
  if(!/^(T-[123]|REC START|LEGACY)$/.test(moment))throw new Error('Unknown saved photo capture point.');
  return {...result,photoMoment:moment};
 }
 /** Android rasterizes Unicode label text on its own system font canvas before SPP.
     Native QR remains a model-2 QR and is validated separately, never raster-only. */
 function textRaster(value,maximum=80,maxLines=3){
  const v=String(value||'').trim();if(!v||v.length>maximum||/[\x00-\x1f\x7f]/.test(v))throw new Error('Invalid printer caption text.');
  const ascii=/^[\x20-\x7e]*$/.test(v);if(ascii)return null;
  if(typeof document==='undefined')throw new Error('Unicode printer labels require the Android/web canvas.');
  const c=document.createElement('canvas'),fontSize=23,lineHeight=31,padding=13;
  c.width=384;let scratch=c.getContext('2d');scratch.font='bold 23px "Noto Sans CJK TC","PingFang HK","Microsoft JhengHei",sans-serif';
  const lines=[];let line='';for(const char of v){if(scratch.measureText(line+char).width>350&&line){lines.push(line);line=char;}else line+=char;}
  if(line)lines.push(line);
  if(lines.length>maxLines)throw new Error('Chinese printer text is too long for this 58mm ticket block. Shorten the label.');
  const height=Math.ceil((lines.length*lineHeight+padding*2)/8)*8;
  if(height>152)throw new Error('Printer label block too tall.');
  c.height=height;scratch=c.getContext('2d',{willReadFrequently:true});scratch.fillStyle='#fff';scratch.fillRect(0,0,384,height);
  scratch.fillStyle='#000';scratch.font='bold 23px "Noto Sans CJK TC","PingFang HK","Microsoft JhengHei",sans-serif';scratch.textAlign='center';scratch.textBaseline='top';
  lines.forEach((text,i)=>scratch.fillText(text,192,padding+i*lineHeight));
  const px=scratch.getImageData(0,0,384,height).data,bytes=new Uint8Array(height*48);
  for(let y=0;y<height;y++)for(let x=0;x<384;x++)if(px[(y*384+x)*4]<128)bytes[y*48+(x>>3)]|=0x80>>(x&7);
  let binary='';for(let i=0;i<bytes.length;i+=2048)binary+=String.fromCharCode(...bytes.subarray(i,i+2048));
  return {base64:btoa(binary),height};
 }
 const api={WIDTH,PROFILES,profile,capture,raster,fromDataURL,fromClip,textRaster};
 root.RetroTicketPhoto=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window==='undefined'?globalThis:window);
