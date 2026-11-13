/* Bounded app-owned WebGL2 lens for the ImageToText home hero.
   It distorts its own generated backdrop only; it never samples arbitrary DOM pixels. */
(function(){
"use strict";
const host=document.getElementById("heroVisual"),canvas=document.getElementById("heroGlassCanvas");
if(!host||!canvas)return;
const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
const vertex=[
"#version 300 es","in vec2 a_position;","void main(){gl_Position=vec4(a_position,0.0,1.0);}"
].join("\n");
const fragment=[
"#version 300 es","precision highp float;out vec4 outColor;",
"uniform vec2 uResolution;uniform float uTime;uniform vec2 uLens;uniform float uStrength;",
"float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}",
"vec3 backdrop(vec2 uv){float aspect=uResolution.x/max(1.0,uResolution.y);vec2 p=(uv-.5)*vec2(aspect,1.0);float t=uTime*.19;",
"vec3 c=mix(vec3(.012,.027,.067),vec3(.035,.075,.145),smoothstep(-.45,.7,p.y));",
"float a=exp(-length((uv-vec2(.18,.26))*vec2(1.25,1.0))*3.5);float b=exp(-length((uv-vec2(.83,.72))*vec2(1.1,1.0))*3.2);float d=exp(-length((uv-vec2(.52,.11))*vec2(1.0,1.3))*4.0);",
"c+=vec3(.035,.18,.22)*a+vec3(.12,.075,.21)*b+vec3(.035,.09,.19)*d;",
"float wave=sin(p.x*6.2+sin(p.y*7.0+t*1.3)*.65-t);float ribbon=1.0-smoothstep(0.0,.055,abs(wave));c+=vec3(.055,.20,.24)*ribbon*.23;",
"vec2 gp=uv*vec2(27.0*aspect,23.0);vec2 gc=abs(fract(gp-.5)-.5);float grid=1.0-smoothstep(0.0,.022,min(gc.x,gc.y));c+=vec3(.24,.37,.56)*grid*.12;",
"vec2 cells=uv*vec2(52.0*aspect,36.0);vec2 id=floor(cells);vec2 local=fract(cells)-.5;float star=(1.0-smoothstep(.018,.065,length(local)))*step(.991,hash21(id));c+=vec3(.48,.63,.9)*star*(.48+.52*sin(t*1.8+hash21(id)*18.0));",
"float v=1.0-smoothstep(.42,1.0,length(p*vec2(.76,1.0)));return clamp(c*(.76+v*.28),0.0,1.0);}",
"float ellipse(vec2 p,vec2 r){vec2 q=abs(p)/r;return(length(q)-1.0)*min(r.x,r.y);}",
"float smoothMin(float a,float b,float k){float h=max(k-abs(a-b),0.0)/max(k,.0001);return min(a,b)-h*h*k*.25;}",
"float lens(vec2 uv){float aspect=uResolution.x/max(1.0,uResolution.y);vec2 p=(uv-uLens)*vec2(aspect,1.0);float core=ellipse(p,vec2(.255,.30));float lobe=length(p-vec2(.205,.045))-.12;return smoothMin(core,lobe,.075);}",
"void main(){vec2 uv=gl_FragCoord.xy/uResolution;float aspect=uResolution.x/max(1.0,uResolution.y);vec3 original=backdrop(uv);float sd=lens(uv);float e=1.7/max(1.0,uResolution.y);",
"vec2 grad=vec2(lens(uv+vec2(e/aspect,0.0))-lens(uv-vec2(e/aspect,0.0)),lens(uv+vec2(0.0,e))-lens(uv-vec2(0.0,e)));vec2 n=normalize(grad+vec2(.00001));",
"float thick=pow(max(0.0,1.0-abs(sd)/.25),.78);float inside=1.0-smoothstep(0.0,.012,sd);vec2 off=n*(.009+.052*thick)*(.58+uStrength*.42)/vec2(aspect,1.0);",
"vec3 rr=backdrop(clamp(uv+off*1.10,.001,.999));vec3 rg=backdrop(clamp(uv+off,.001,.999));vec3 rb=backdrop(clamp(uv+off*.91,.001,.999));vec3 refracted=vec3(rr.r,rg.g,rb.b);",
"vec3 body=mix(original,refracted,.94);body=mix(body,body*vec3(.72,.83,.98)+vec3(.025,.045,.075),.12+thick*.035);",
"float rim=1.0-smoothstep(.002,.024,abs(sd));float inner=exp(-abs(sd+.024)*44.0)*inside;float spec=pow(max(0.0,dot(n,normalize(vec2(-.56,.83)))),12.0)*thick;",
"float spec2=pow(max(0.0,dot(n,normalize(vec2(.82,-.34)))),19.0)*thick;float reflection=exp(-length((uv-(uLens+vec2(-.10,.17)))*vec2(aspect*1.3,1.0))*17.0)*inside;",
"vec3 col=mix(original,body,inside);col+=vec3(.64,.83,1.0)*rim*(.18+uStrength*.14)+vec3(.76,.91,1.0)*inner*.14;col+=vec3(.86,.93,1.0)*spec*.29+vec3(.42,.73,.83)*spec2*.16+vec3(.36,.62,.78)*reflection*.09;outColor=vec4(clamp(col,0.0,1.0),1.0);}"
].join("\n");
let gl=null,program=null,uniforms={},raf=0,ready=false,visible=true,pageVisible=!document.hidden,last=0,time=0;
let width=0,height=0,lensPoint={x:.52,y:.5},target={x:.52,y:.5};
function compile(type,source){const shader=gl.createShader(type);if(!shader)throw Error("shader allocation failed");gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){const msg=gl.getShaderInfoLog(shader)||"shader compile failed";gl.deleteShader(shader);throw Error(msg)}return shader}
function draw(t){if(!ready)return;gl.viewport(0,0,width,height);gl.useProgram(program);gl.uniform2f(uniforms.resolution,width,height);gl.uniform1f(uniforms.time,reduced.matches?0:t);gl.uniform2f(uniforms.lens,lensPoint.x,lensPoint.y);gl.uniform1f(uniforms.strength,.82);gl.drawArrays(gl.TRIANGLES,0,3)}
function resize(){if(!ready)return;const r=host.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,1.12);width=Math.max(1,Math.min(1200,Math.round(r.width*dpr)));height=Math.max(1,Math.min(900,Math.round(r.height*dpr)));if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;draw(time)}}
function initialize(){
try{
gl=canvas.getContext("webgl2",{alpha:false,antialias:false,depth:false,stencil:false,powerPreference:"low-power",preserveDrawingBuffer:false});
if(!gl)throw Error("WebGL2 unavailable");
const vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,fragment);program=gl.createProgram();if(!program)throw Error("program allocation failed");
gl.attachShader(program,vs);gl.attachShader(program,fs);gl.bindAttribLocation(program,0,"a_position");gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program)||"link failed");
const buffer=gl.createBuffer();if(!buffer)throw Error("buffer allocation failed");gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
gl.useProgram(program);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
uniforms={resolution:gl.getUniformLocation(program,"uResolution"),time:gl.getUniformLocation(program,"uTime"),lens:gl.getUniformLocation(program,"uLens"),strength:gl.getUniformLocation(program,"uStrength")};
if(Object.values(uniforms).some(x=>x===null))throw Error("missing shader uniform");
ready=true;host.dataset.renderer="webgl2";resize();draw(0);return true;
}catch(err){console.warn("ImageToText hero WebGL fallback:",err);host.dataset.renderer="fallback";canvas.hidden=true;return false}
}
function stop(){if(raf)cancelAnimationFrame(raf);raf=0}
function schedule(){if(raf||!ready||!visible||!pageVisible)return;if(reduced.matches){draw(0);return}raf=requestAnimationFrame(frame)}
function frame(now){raf=0;if(!ready||!visible||!pageVisible)return;if(now-last>=1000/30){const dt=Math.min(.05,(now-(last||now))/1000);last=now;time+=dt;const ease=1-Math.pow(.002,dt||.016);lensPoint.x+=(target.x-lensPoint.x)*ease;lensPoint.y+=(target.y-lensPoint.y)*ease;draw(time)}raf=requestAnimationFrame(frame)}
function fallback(){stop();ready=false;host.dataset.renderer="fallback";canvas.hidden=true}
if(!initialize())return;
const io=typeof IntersectionObserver==="function"?new IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);visible?schedule():stop()},{threshold:.01}):null;if(io)io.observe(host);
const ro=typeof ResizeObserver==="function"?new ResizeObserver(resize):null;if(ro)ro.observe(host);else window.addEventListener("resize",resize,{passive:true});
host.addEventListener("pointermove",e=>{if(reduced.matches||e.pointerType==="touch")return;const r=host.getBoundingClientRect();target.x=Math.max(.28,Math.min(.72,(e.clientX-r.left)/r.width));target.y=Math.max(.30,Math.min(.70,1-(e.clientY-r.top)/r.height));host.style.setProperty("--hero-tilt-x",((target.x-.5)*7).toFixed(2)+"deg");host.style.setProperty("--hero-tilt-y",((target.y-.5)*-5).toFixed(2)+"deg");schedule()},{passive:true});
host.addEventListener("pointerleave",()=>{target={x:.52,y:.5};host.style.setProperty("--hero-tilt-x","0deg");host.style.setProperty("--hero-tilt-y","0deg");schedule()},{passive:true});
canvas.addEventListener("webglcontextlost",e=>{e.preventDefault();fallback()},false);
document.addEventListener("visibilitychange",()=>{pageVisible=!document.hidden;if(pageVisible)schedule();else stop()});
if(typeof reduced.addEventListener==="function")reduced.addEventListener("change",()=>{if(reduced.matches){stop();lensPoint={x:.52,y:.5};target={x:.52,y:.5};host.style.setProperty("--hero-tilt-x","0deg");host.style.setProperty("--hero-tilt-y","0deg");draw(0)}else schedule()});
schedule();
})();