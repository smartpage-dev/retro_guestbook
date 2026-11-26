/* Ticket photo is a separately captured local still. Never include raster in diagnostics or cloud API. */
(function(root){
 'use strict';
 const WIDTH=384, HEIGHT=336, ENCODING='escpos-gsv0-384x336-1bpp-v1';
 function capture(source){
  if(!source||!(source.width>0&&source.height>0))throw new Error('No live camera frame for ticket.');
  const crop=root.RetroCore.cropRect(source.width,source.height,8/7);
  const c=document.createElement('canvas');c.width=512;c.height=448;
  c.getContext('2d',{alpha:false}).drawImage(source,crop.x,crop.y,crop.w,crop.h,0,0,512,448);
  return c.toDataURL('image/jpeg',.82);
 }
 function raster(source){
  if(!source||!(source.width>0&&source.height>0))throw new Error('Ticket photo has no pixels.');
  const monochrome=root.Receipt.pixelPhoto(source);
  if(monochrome.width!==WIDTH||monochrome.height!==HEIGHT)throw new Error('Unexpected ticket image size.');
  const pixels=monochrome.getContext('2d',{willReadFrequently:true}).getImageData(0,0,WIDTH,HEIGHT).data;
  const bytes=new Uint8Array(WIDTH*HEIGHT/8);
  for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++){
   const offset=(y*WIDTH+x)*4;
   if(pixels[offset]<128)bytes[y*(WIDTH/8)+(x>>3)]|=0x80>>(x&7);
  }
  let data='';for(let i=0;i<bytes.length;i+=2048)data+=String.fromCharCode(...bytes.subarray(i,i+2048));
  return {photoEncoding:ENCODING,photoWidth:WIDTH,photoHeight:HEIGHT,photoBase64:btoa(data)};
 }
 async function fromDataURL(url){
  if(typeof url!=='string'||url.length>600000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(url))throw new Error('Saved ticket still missing or unsupported.');
  const im=new Image();im.src=url;
  await Promise.race([im.decode(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Ticket still decode timed out.')),5000))]);
  if(im.width<16||im.height<16||im.width>2048||im.height>2048)throw new Error('Ticket still dimensions invalid.');
  return raster(im);
 }
 async function fromClip(clip){
  if(clip?.settings?.receipt==='qr')return {};
  const photo=clip?.ticketSnapshot || clip?.rawSnapshot;
  if(!photo)throw new Error('No saved still for this photo ticket.');
  const result=await fromDataURL(photo);
  const moment=clip.ticketSnapshot?clip.ticketPhotoMoment||'T-2':'LEGACY';
  if(!/^(T-[123]|REC START|LEGACY)$/.test(moment))throw new Error('Unknown saved photo capture point.');
  return {...result,photoMoment:moment};
 }
 const api={WIDTH,HEIGHT,ENCODING,capture,raster,fromDataURL,fromClip};
 root.RetroTicketPhoto=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window==='undefined'?globalThis:window);
