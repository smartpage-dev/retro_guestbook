/* The visible canvas is the sole encoded source. Both backends share grade math,
   moving snow and scanline composition. The shell/REC/countdown remain DOM-only. */
(function(){
 'use strict';
 class RetroRenderer {
  constructor(canvas,video,settings,options={}){
   this.canvas=canvas;this.video=video;this.settings=settings;this.effectsOverride=null;
   this.raw=document.createElement('canvas');this.stage=document.createElement('canvas');
   this.rawCtx=this.raw.getContext('2d',{willReadFrequently:true});this.ctx=this.stage.getContext('2d',{willReadFrequently:true});
   this.output=canvas.getContext('2d',{alpha:false});
   this.noise=document.createElement('canvas');this.noise.width=this.noise.height=128;
   this.nc=this.noise.getContext('2d');this.nd=this.nc.createImageData(128,128);this.noiseTick=-1;
   this.scanlines=document.createElement('canvas');this.vignette=document.createElement('canvas');
   this.active=true;this.live=false;this.recording=false;this.frameCount=0;this.last=0;this.running=true;this.fps=0;
   this.fpsStart=performance.now();this.fpsCount=0;this.backendWarning='';
   this.glCanvas=document.createElement('canvas');this.gl=null;
   if(options.backend!=='2d'){
    try{this.gl=this.glCanvas.getContext('webgl2',{alpha:false,antialias:false,preserveDrawingBuffer:false});if(this.gl)this.setupGL();}
    catch(e){this.backendWarning=String(e.message||e);this.gl=null;}
   }
   this.mode=this.gl?'WebGL2 + shared CRT compositor':'Canvas 2D + shared CRT compositor';
   this.glCanvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.gl=null;this.mode='Canvas 2D (GPU context lost)';this.backendWarning='GPU lost; CPU fallback active.';});
   this.setAspect(13/9);
   this.loop=t=>{if(!this.running)return;requestAnimationFrame(this.loop);if(!this.active||document.hidden)return;
    const wanted=Number(this.settings.renderMaxFps);const interval=Number.isFinite(wanted)&&wanted>0?1000/wanted:(this.recording?30:60);
    if(t-this.last<interval-1)return;this.last=t;
    try{this.draw(t/1000);}catch(e){this.running=false;window.dispatchEvent(new CustomEvent('rendererfailure',{detail:'Image processing failed: '+e.message}));return;}
    this.frameCount++;this.fpsCount++;if(t-this.fpsStart>1000){this.fps=this.fpsCount*1000/(t-this.fpsStart);this.fpsCount=0;this.fpsStart=t;}
   };requestAnimationFrame(this.loop);
  }
  setAspect(aspect){
   if(this.recording)return;const h=[360,540,720].includes(Number(this.settings.renderHeight))?Number(this.settings.renderHeight):720,w=Math.round(h*Math.max(.8,Math.min(3,aspect))/2)*2;
   if(w===this.w&&h===this.h)return;this.w=w;this.h=h;
   for(const c of [this.raw,this.canvas,this.scanlines,this.vignette]){c.width=w;c.height=h;}
   const sc=this.scanlines.getContext('2d');sc.fillStyle='#000';for(let y=0;y<h;y+=4)sc.fillRect(0,y,w,1);
   const vc=this.vignette.getContext('2d'),g=vc.createRadialGradient(w/2,h/2,h*.13,w/2,h/2,Math.max(w,h)*.67);
   g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.65,'rgba(0,0,0,.02)');g.addColorStop(1,'rgba(0,0,0,.25)');vc.fillStyle=g;vc.fillRect(0,0,w,h);
   this.draw(performance.now()/1000);
  }
  setupGL(){
   const gl=this.gl;
   const vertex=`#version 300 es
    in vec2 pos;out vec2 uv;void main(){uv=vec2((pos.x+1.)*.5,(1.-pos.y)*.5);gl_Position=vec4(pos,0.,1.);}`;
   const fragment=`#version 300 es
    precision highp float;uniform sampler2D frame;uniform mat3 grade;uniform vec3 lift;in vec2 uv;out vec4 outColor;
    void main(){outColor=vec4(clamp(grade*texture(frame,uv).rgb+lift,0.,1.),1.);}`;
   const shader=(kind,text)=>{const s=gl.createShader(kind);gl.shaderSource(s,text);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};
   const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);
   if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));gl.useProgram(program);
   const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
   const pos=gl.getAttribLocation(program,'pos');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
   this.u={grade:gl.getUniformLocation(program,'grade'),lift:gl.getUniformLocation(program,'lift')};
   this.texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  }
  updateNoise(t){
   const tick=Math.floor(t*15);if(tick===this.noiseTick)return;this.noiseTick=tick;let seed=(tick*747796405+2891336453)>>>0;
   const d=this.nd.data;for(let i=0;i<d.length;i+=4){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;const v=seed>>>24;d[i]=d[i+1]=d[i+2]=v;d[i+3]=255;}this.nc.putImageData(this.nd,0,0);
  }
    artwork(t){
      if(this.settings.screenStyle==='heritage'){this.heritageArtwork(t);return;}
      const c=this.rawCtx,w=this.w,h=this.h;
      const grad=c.createRadialGradient(w*.5,h*.43,10,w*.5,h*.43,w*.8);grad.addColorStop(0,'#63745c');grad.addColorStop(.5,'#3f5847');grad.addColorStop(1,'#233a30');c.fillStyle=grad;c.fillRect(0,0,w,h);
      c.strokeStyle='rgba(222,230,189,.045)';c.lineWidth=1;
      for(let x=w/2%60;x<w;x+=60){c.beginPath();c.moveTo(x,0);c.lineTo(x,h);c.stroke();}
      for(let y=0;y<h;y+=60){c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke();}
      c.save();c.translate(w/2,h*(this.compact?.36:.43));const scale=Math.min(w/1040,h/720)*(this.compact?.86:1);c.scale(scale,scale);
      c.strokeStyle='rgba(224,231,189,.22)';c.lineWidth=.8;
      [230,264,292].forEach((r,i)=>{c.beginPath();c.ellipse(0,-4,r,r*.70,0,0,Math.PI*2);c.stroke();});
      const a=t*.07;c.fillStyle='#ded8ae';c.beginPath();c.arc(Math.cos(a)*292,Math.sin(a)*204-4,3,0,Math.PI*2);c.fill();
      c.strokeStyle='rgba(222,230,189,.18)';c.beginPath();c.moveTo(-362,-4);c.lineTo(-295,-4);c.moveTo(295,-4);c.lineTo(362,-4);c.stroke();
      c.textAlign='center';c.fillStyle='#d0d9b8';c.font='11px monospace';c.fillText('L U C E   B R O A D C A S T I N G   S E R V I C E',0,-170);
      c.fillStyle='#efead0';c.shadowColor='rgba(226,234,188,.16)';c.shadowBlur=15;c.font='italic 102px Georgia,serif';c.fillText('Love,',-7,-47);c.fillText('on tape.',0,53);c.shadowBlur=0;
      c.font='10px monospace';c.fillStyle='#d7dcb7';c.fillText('A  L I T T L E  M O M E N T .  F O R E V E R  Y O U R S .',0,112);
      const shades=['#b27051','#cbb474','#d6d5a2','#9faf80','#739176','#426753'];shades.forEach((color,i)=>{c.fillStyle=color;c.fillRect(-99+i*33,141,32,8);});
      if(!this.compact){c.font='8px monospace';c.fillStyle='#bbc9a1';c.fillText('S I N C E  T H I S  V E R Y  M O M E N T',0,178);}c.restore();
    }
    heritageArtwork(t){
      const c=this.rawCtx,w=this.w,h=this.h;
      const g=c.createRadialGradient(w*.49,h*.40,10,w*.5,h*.42,w*.77);
      g.addColorStop(0,'#4c4a36');g.addColorStop(.47,'#2f382b');g.addColorStop(1,'#141f19');
      c.fillStyle=g;c.fillRect(0,0,w,h);
      // Quiet broadcast calibration grid. Original artwork, not a reference photo.
      c.strokeStyle='rgba(222,194,124,.045)';c.lineWidth=.6;
      for(let x=w/2%48;x<w;x+=48){c.beginPath();c.moveTo(x,0);c.lineTo(x,h);c.stroke();}
      for(let y=0;y<h;y+=48){c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke();}
      c.save();c.translate(w/2,h*(this.compact?.37:.42));
      const s=Math.min(w/1040,h/720)*(this.compact?.83:1);c.scale(s,s);
      c.strokeStyle='rgba(228,202,141,.22)';c.lineWidth=1;
      for(const r of [264,278]){c.beginPath();c.ellipse(0,-6,r,r*.68,0,0,Math.PI*2);c.stroke();}
      // The sparse side ticks suggest an old tuning scale, not a dashboard.
      c.strokeStyle='rgba(216,193,137,.25)';
      for(let i=-3;i<=3;i++){const y=i*12;c.beginPath();c.moveTo(-360,y);c.lineTo(i===0?-295:-335,y);c.moveTo(i===0?295:335,y);c.lineTo(360,y);c.stroke();}
      c.textAlign='center';c.fillStyle='#ccb985';c.font='10px monospace';
      c.fillText('L U C E   T E L E V I S I O N   S E R V I C E',0,-160);
      c.shadowColor='rgba(255,196,89,.28)';c.shadowBlur=15;c.fillStyle='#efcf8f';
      c.font='italic 101px Georgia,serif';c.fillText('Love,',-8,-44);c.fillText('on tape.',0,57);c.shadowBlur=0;
      c.strokeStyle='rgba(225,196,128,.35)';c.lineWidth=1;c.beginPath();c.moveTo(-111,88);c.lineTo(111,88);c.stroke();
      c.fillStyle='#ccba8d';c.font='9px monospace';c.fillText('Y O U R   V O I C E .   A   T I M E L E S S   K E E P S A K E .',0,118);
      const shades=['#9e734c','#b49558','#dbc28a','#c5c09a','#989f7a','#677e64'];
      shades.forEach((col,i)=>{c.fillStyle=col;c.fillRect(-78+i*26,143,25,7);});
      if(!this.compact){c.fillStyle='#b09e71';c.font='8px monospace';c.fillText('A N A L O G U E   H E A R T .   D I G I T A L   M E M O R I E S .',0,196);}
      c.restore();
      // Subtle moving scan energy only; no flashing full-screen transition.
      c.fillStyle='rgba(238,206,139,.016)';c.fillRect(0,(t*12)%(h+80)-80,w,70);
    }
  draw(t){
   const r=this.rawCtx,w=this.w,h=this.h;if(!w||!h)return;
   if(this.live&&this.video.readyState>=2&&this.video.videoWidth){const cr=RetroCore.cropRect(this.video.videoWidth,this.video.videoHeight,w/h);r.drawImage(this.video,cr.x,cr.y,cr.w,cr.h,0,0,w,h);}else this.artwork(t);
   const p=RetroEffects.resolve(this.effectsOverride?{...this.settings,...this.effectsOverride}:this.settings),grade=RetroEffects.grade(p);
   const pw=Math.min(w,grade.width),ph=Math.round(pw*h/w);if(this.stage.width!==pw||this.stage.height!==ph){this.stage.width=pw;this.stage.height=ph;this.glCanvas.width=pw;this.glCanvas.height=ph;}
   this.ctx.drawImage(this.raw,0,0,pw,ph);
   const o=this.output;o.globalAlpha=1;o.globalCompositeOperation='source-over';o.imageSmoothingEnabled=true;
   let gpuDone=false;
   if(this.gl){try{
    const g=this.gl,m=grade.matrix;g.viewport(0,0,pw,ph);g.bindTexture(g.TEXTURE_2D,this.texture);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,g.RGBA,g.UNSIGNED_BYTE,this.stage);
    g.uniformMatrix3fv(this.u.grade,false,new Float32Array([m[0],m[3],m[6],m[1],m[4],m[7],m[2],m[5],m[8]]));g.uniform3fv(this.u.lift,new Float32Array(grade.offset));g.drawArrays(g.TRIANGLES,0,6);
    o.drawImage(this.glCanvas,0,0,w,h);gpuDone=true;
   }catch(e){this.gl=null;this.mode='Canvas 2D (GPU fallback)';this.backendWarning=String(e.message||e);}}
   if(!gpuDone){
    const im=this.ctx.getImageData(0,0,pw,ph),d=im.data,m=grade.matrix,a=grade.offset.map(x=>x*255);
    for(let i=0;i<d.length;i+=4){const rr=d[i],gg=d[i+1],bb=d[i+2];d[i]=m[0]*rr+m[1]*gg+m[2]*bb+a[0];d[i+1]=m[3]*rr+m[4]*gg+m[5]*bb+a[1];d[i+2]=m[6]*rr+m[7]*gg+m[8]*bb+a[2];}
    this.ctx.putImageData(im,0,0);o.drawImage(this.stage,0,0,w,h);
   }
   // Optional date OSD is the only text burned in. The kiosk shell is never encoded.
   if(this.settings.osd&&this.live){const d=new Date(),stamp=d.getFullYear()+'.'+String(d.getMonth()+1).padStart(2,'0')+'.'+String(d.getDate()).padStart(2,'0')+' '+d.toLocaleTimeString('en-GB',{hour12:false});o.font='20px monospace';o.textAlign='right';o.fillStyle='rgba(0,0,0,.45)';o.fillRect(w-330,h-49,312,29);o.fillStyle='#eee8d2';o.fillText(stamp,w-27,h-28);}
   o.globalAlpha=p.scan;o.drawImage(this.scanlines,0,0);o.globalAlpha=1;
   if(p.grain>0){this.updateNoise(t);o.globalAlpha=p.grain*(this.recording?1:1.35);o.globalCompositeOperation='soft-light';o.fillStyle=o.createPattern(this.noise,'repeat');o.fillRect(0,0,w,h);o.globalAlpha=1;o.globalCompositeOperation='source-over';}
   o.drawImage(this.vignette,0,0);this.currentLook=p;
  }
  snapshot(){const c=document.createElement('canvas');c.width=this.w;c.height=this.h;c.getContext('2d').drawImage(this.raw,0,0);return c;}
  thumbnail(){return this.canvas.toDataURL('image/jpeg',.78);}
  sharpness(canvas){const s=document.createElement('canvas');s.width=128;s.height=96;const c=s.getContext('2d',{willReadFrequently:true});c.drawImage(canvas,0,0,128,96);const d=c.getImageData(0,0,128,96).data,gray=new Float32Array(128*96);for(let i=0;i<gray.length;i++)gray[i]=.299*d[i*4]+.587*d[i*4+1]+.114*d[i*4+2];let sum=0,sum2=0,n=0;for(let y=1;y<95;y++)for(let x=1;x<127;x++){const i=y*128+x,v=gray[i-1]+gray[i+1]+gray[i-128]+gray[i+128]-4*gray[i];sum+=v;sum2+=v*v;n++;}return sum2/n-(sum/n)**2;}
 }
 window.RetroRenderer=RetroRenderer;
})();
