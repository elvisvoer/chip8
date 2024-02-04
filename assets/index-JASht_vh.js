var w=Object.defineProperty;var k=(a,t,i)=>t in a?w(a,t,{enumerable:!0,configurable:!0,writable:!0,value:i}):a[t]=i;var n=(a,t,i)=>(k(a,typeof t!="symbol"?t+"":t,i),i);(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))e(s);new MutationObserver(s=>{for(const r of s)if(r.type==="childList")for(const h of r.addedNodes)h.tagName==="LINK"&&h.rel==="modulepreload"&&e(h)}).observe(document,{childList:!0,subtree:!0});function i(s){const r={};return s.integrity&&(r.integrity=s.integrity),s.referrerPolicy&&(r.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?r.credentials="include":s.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function e(s){if(s.ep)return;s.ep=!0;const r=i(s);fetch(s.href,r)}})();const d=[240,144,144,144,240,32,96,32,32,112,240,16,240,128,240,240,16,240,16,240,144,144,240,16,16,240,128,240,16,240,240,128,240,144,240,240,16,32,64,64,240,144,240,144,240,240,144,240,16,240,240,144,240,144,144,224,144,224,144,224,240,128,128,128,240,224,144,144,144,224,240,128,240,128,240,240,128,240,128,128];class y{constructor(t=4*1024){n(this,"cpu");n(this,"ram");n(this,"fb");n(this,"hires",!1);n(this,"waitingInput",!1);n(this,"waitReg",-1);n(this,"ready",!1);n(this,"k",new Set);this.memSize=t,this.reset()}get framebuffer(){return this.fb}get framebufferHeight(){return this.hires?64:32}get framebufferWidth(){return this.hires?128:64}load(t,i=512){if(this.ready=!1,this.reset(),t.length+i>this.ram.length)throw new Error("Failed to load - ROM too large.");for(let e=0;e<t.length;e+=1)this.ram[i+e]=t[e];this.cpu.pc=i,this.ready=!0}setKeyDown(t){this.k.add(t),this.waitingInput&&(this.cpu.v[this.waitReg]=t&255,this.waitingInput=!1)}setKeyUp(t){this.k.delete(t)}tick(){if(!this.ready||this.waitingInput)return;if(this.cpu.pc>this.ram.length)throw new Error("Attempt to read outside RAM bounds.");const t=this.ram[this.cpu.pc]<<8|this.ram[this.cpu.pc+1];this.cpu.pc+=2,this.executeOp(t)}updateTimers(){this.cpu.dt>0&&this.cpu.dt--,this.cpu.st>0&&this.cpu.st--}clearFramebuffer(){this.fb=new Uint8Array(this.framebufferHeight*this.framebufferWidth)}draw(t,i,e){this.cpu.v[15]=0;for(let s=0;s<e;s++)for(let r=0;r<8;r++){const h=(t+r)%this.framebufferWidth+(i+s)%this.framebufferHeight*this.framebufferWidth;this.ram[this.cpu.i+s]>>7-r&1&&(this.fb[h]?(this.fb[h]=0,this.cpu.v[15]=1):this.fb[h]=1)}}errorOnUnknownOp(t){throw new Error(`Unknown instruction 0x${t.toString(16).padStart(4,"0")}`)}executeOp(t){const i=t>>12&15,e=t>>8&15,s=t>>4&15,r=t&4095,h=t&255,u=t&15,f={0:()=>{},224:()=>this.clearFramebuffer(),238:()=>{const c=this.cpu.r.pop();this.cpu.pc=c},255:()=>{this.hires=!0,this.clearFramebuffer()}};if(f[t]){f[t]();return}switch(i){case 1:this.cpu.pc=r;break;case 2:this.cpu.r.push(this.cpu.pc),this.cpu.pc=r;break;case 3:this.cpu.v[e]===h&&(this.cpu.pc+=2);break;case 4:this.cpu.v[e]!==h&&(this.cpu.pc+=2);break;case 5:this.cpu.v[e]===this.cpu.v[s]&&(this.cpu.pc+=2);break;case 9:this.cpu.v[e]!==this.cpu.v[s]&&(this.cpu.pc+=2);break;case 6:this.cpu.v[e]=h;break;case 7:this.cpu.v[e]=this.cpu.v[e]+h&255;break;case 8:{switch(u){case 0:this.cpu.v[e]=this.cpu.v[s];break;case 1:this.cpu.v[e]|=this.cpu.v[s];break;case 2:this.cpu.v[e]&=this.cpu.v[s];break;case 3:this.cpu.v[e]^=this.cpu.v[s];break;case 4:{const c=this.cpu.v[e]+this.cpu.v[s];this.cpu.v[e]=c&255,this.cpu.v[15]=c>255?1:0;break}case 5:{const c=this.cpu.v[e]-this.cpu.v[s],o=this.cpu.v[e]>=this.cpu.v[s];this.cpu.v[e]=c&255,this.cpu.v[15]=o?1:0;break}case 7:{const c=this.cpu.v[s]-this.cpu.v[e],o=this.cpu.v[s]>=this.cpu.v[e];this.cpu.v[e]=c&255,this.cpu.v[15]=o?1:0;break}case 6:{const c=this.cpu.v[s]>>1,o=this.cpu.v[s]&1;this.cpu.v[e]=c&255,this.cpu.v[15]=o?1:0;break}case 14:{const c=this.cpu.v[s]<<1,o=this.cpu.v[s]>>7&1;this.cpu.v[e]=c&255,this.cpu.v[15]=o?1:0;break}default:this.errorOnUnknownOp(t)}break}case 10:this.cpu.i=r;break;case 11:this.cpu.pc=r+this.cpu.v[0];break;case 12:this.cpu.v[e]=Math.random()*256&h;break;case 13:this.draw(this.cpu.v[e],this.cpu.v[s],u);break;case 14:{switch(h){case 158:this.k.has(this.cpu.v[e])&&(this.cpu.pc+=2);break;case 161:this.k.has(this.cpu.v[e])||(this.cpu.pc+=2);break;default:this.errorOnUnknownOp(t)}break}case 15:{switch(h){case 7:this.cpu.v[e]=this.cpu.dt;break;case 21:this.cpu.dt=this.cpu.v[e];break;case 24:this.cpu.st=this.cpu.v[e];break;case 10:this.waitReg=e,this.waitingInput=!0;break;case 30:this.cpu.i=this.cpu.i+this.cpu.v[e]&65535;break;case 41:this.cpu.i=(this.cpu.v[e]&15)*5;break;case 51:this.ram[this.cpu.i]=Math.floor(this.cpu.v[e]/100)%10,this.ram[this.cpu.i+1]=Math.floor(this.cpu.v[e]/10)%10,this.ram[this.cpu.i+2]=this.cpu.v[e]%10;break;case 85:for(let c=0;c<=e;c++)this.ram[this.cpu.i+c]=this.cpu.v[c];this.cpu.i=this.cpu.i+e+1&65535;break;case 101:for(let c=0;c<=e;c++)this.cpu.v[c]=this.ram[this.cpu.i+c];this.cpu.i=this.cpu.i+e+1&65535;break;case 117:for(let c=0;c<=e;c++)this.cpu.f[c]=this.cpu.v[c];break;case 133:for(let c=0;c<=e;c++)this.cpu.v[c]=255&this.cpu.f[c];break;default:this.errorOnUnknownOp(t)}break}default:this.errorOnUnknownOp(t)}}reset(){this.cpu={v:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],pc:0,i:0,dt:0,st:0,r:[],f:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},this.ram=new Uint8Array(this.memSize),this.hires=!1,this.clearFramebuffer(),this.waitingInput=!1,this.k=new Set;for(let t=0;t<d.length;t++)this.ram[t]=d[t]}}class g{constructor(t){n(this,"ctx");this.canvas=t,this.ctx=t.getContext("2d");const i=()=>{const e=64*Math.floor(this.canvas.parentElement.offsetWidth/64),s=.5;this.canvas.width=Math.min(e,768),this.canvas.height=this.canvas.width*s};window.addEventListener("resize",i),i()}clear(){this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height)}write(t,i,e){this.ctx.reset();const s=this.canvas.width/i;for(let r=0;r<i*e;r++){const h=Math.floor(r/i),u=r%i;t[r]&&(this.ctx.fillStyle="green",this.ctx.fillRect(u*s,h*s,s,s))}}}async function O(a){const t=await fetch(a);if(!t.ok)throw new Error(`Invalid response code: ${t.status}`);const i=await t.blob(),e=await new Promise((s,r)=>{const h=new FileReader;h.onload=u=>{var f;s((f=u.target)==null?void 0:f.result)},h.onerror=u=>{r(u)},h.readAsArrayBuffer(i)});return new Uint8Array(e)}async function x(){return new Promise((a,t)=>{let i=document.createElement("input");i.type="file",i.accept=".ch8",i.onchange=async e=>{const s=Array.from(i.files)[0];s?a({name:s.name,data:new Uint8Array(await s.arrayBuffer())}):t("No file uploaded")},i.click()})}const v=new g(document.getElementById("display")),p=new y,b={1:1,2:2,3:3,4:12,q:4,w:5,e:6,r:13,a:7,s:8,d:9,f:14,z:10,x:0,c:11,v:15};function z(a){v.clear(),v.write(a.framebuffer,a.framebufferWidth,a.framebufferHeight)}function m(a){p.load(a)}async function l(a){const t=await O(a);m(t)}async function E(){const a=["ibm-logo.ch8","chipcross.ch8","snake.ch8"];let t=0;document.addEventListener("keydown",async e=>{const s=b[e.key];switch(s&&p.setKeyDown(s),e.key.toLowerCase()){case"o":const r=await x();m(r.data);break;case"n":t=(t+1)%a.length,await l(a[t]);break;case"enter":await l(a[t]);break}}),document.addEventListener("keyup",e=>{const s=b[e.key];s&&p.setKeyUp(s)});const i=()=>{p.tick(),p.tick(),p.updateTimers(),z(p),setTimeout(i,0)};setTimeout(i,0),await l(a[t])}E();
