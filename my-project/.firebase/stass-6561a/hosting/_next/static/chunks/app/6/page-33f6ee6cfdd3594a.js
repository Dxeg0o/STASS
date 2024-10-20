(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[864],{42472:function(e,r,t){Promise.resolve().then(t.bind(t,93096))},49322:function(e,r,t){"use strict";t.d(r,{Z:function(){return a}});let a=(0,t(79205).Z)("CircleAlert",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["line",{x1:"12",x2:"12",y1:"8",y2:"12",key:"1pkeuh"}],["line",{x1:"12",x2:"12.01",y1:"16",y2:"16",key:"4dfq90"}]])},17689:function(e,r,t){"use strict";t.d(r,{Z:function(){return a}});let a=(0,t(79205).Z)("Upload",[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["polyline",{points:"17 8 12 3 7 8",key:"t8dd8p"}],["line",{x1:"12",x2:"12",y1:"3",y2:"15",key:"widbto"}]])},93096:function(e,r,t){"use strict";t.r(r),t.d(r,{default:function(){return f}});var a=t(57437),l=t(2265),n=t(17689),s=t(49322),i=t(40279),d=t(79820),o=t(95937),c=t(83464);function u(e){let{imageResult:r}=e,[t,n]=(0,l.useState)(null),[s,i]=(0,l.useState)(null),[d,o]=(0,l.useState)(null),[u]=(0,l.useState)(null);(0,l.useEffect)(()=>{r&&f()},[r]);let f=async()=>{try{if(!r)return;let e=await c.Z.post("http://127.0.0.1:5000/api/calculate",r);n(e.data.altura),i(e.data.radio),o(e.data.grafico)}catch(e){console.error("Error al calcular:",e)}};return(0,a.jsxs)("div",{children:[(0,a.jsx)("h1",{children:"Calculadora de Esp\xe1rragos"}),t&&(0,a.jsxs)("p",{children:["Altura: ",t]}),s&&(0,a.jsxs)("p",{children:["Radio: ",s]}),d&&(0,a.jsxs)("div",{children:[(0,a.jsx)("h2",{children:"Gr\xe1fico:"}),(0,a.jsx)("img",{src:"data:image/png;base64,".concat(d),alt:"Gr\xe1fico"})]}),u&&(0,a.jsx)("p",{style:{color:"red"},children:u})]})}function f(){let[e,r]=(0,l.useState)(null),[t,f]=(0,l.useState)(null),[x,m]=(0,l.useState)(null),p=async()=>{if(m(null),f(null),!e){m("Por favor selecciona una imagen primero");return}let r=new FileReader;r.readAsDataURL(e),r.onloadend=async()=>{try{var e;let t=null===(e=r.result)||void 0===e?void 0:e.toString().split(",")[1];if(!t)throw Error("Hubo un error al procesar la imagen");let a=await (0,c.Z)({method:"POST",url:"https://detect.roboflow.com/try2-u4gn9/1",params:{api_key:"xhZowC0XhfVttIdmFHKU"},data:t,headers:{"Content-Type":"application/x-www-form-urlencoded"}});f(a.data)}catch(e){console.error("Error al procesar la imagen: ",e),m("Hubo un error al procesar la imagen. Por favor, intenta de nuevo.")}finally{}}};return(0,a.jsxs)("div",{children:[(0,a.jsxs)(d.Zb,{className:"w-full max-w-md mx-auto",children:[(0,a.jsx)(d.Ol,{children:(0,a.jsx)(d.ll,{className:"text-2xl font-bold",children:"Sube una imagen"})}),(0,a.jsxs)(d.aY,{children:[(0,a.jsx)("div",{className:"flex items-center justify-center w-full",children:(0,a.jsxs)("label",{htmlFor:"dropzone-file",className:"flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600",children:[(0,a.jsxs)("div",{className:"flex flex-col items-center justify-center pt-5 pb-6",children:[(0,a.jsx)(n.Z,{className:"w-8 h-8 mb-4 text-gray-500 dark:text-gray-400"}),(0,a.jsxs)("p",{className:"mb-2 text-sm text-gray-500 dark:text-gray-400",children:[(0,a.jsx)("span",{className:"font-semibold",children:"Haz clic para subir"})," o arrastra y suelta"]}),(0,a.jsx)("p",{className:"text-xs text-gray-500 dark:text-gray-400",children:"SVG, PNG, JPG or GIF (MAX. 800x400px)"})]}),(0,a.jsx)(i.I,{id:"dropzone-file",type:"file",accept:"image/*",className:"hidden",onChange:e=>{e.target.files&&e.target.files.length>0&&(r(e.target.files[0]),m(null),p())}})]})}),e&&(0,a.jsxs)("p",{className:"text-sm text-gray-500",children:["Archivo seleccionado: ",e.name]})]}),(0,a.jsx)(d.eW,{className:"flex flex-col items-start",children:x&&(0,a.jsxs)(o.bZ,{variant:"destructive",children:[(0,a.jsx)(s.Z,{className:"h-4 w-4"}),(0,a.jsx)(o.Cd,{children:"Error"}),(0,a.jsx)(o.X,{children:x})]})})]}),t&&(0,a.jsx)(u,{imageResult:t})," "]})}},95937:function(e,r,t){"use strict";t.d(r,{Cd:function(){return o},X:function(){return c},bZ:function(){return d}});var a=t(57437),l=t(2265),n=t(77712),s=t(93448);let i=(0,n.j)("relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7",{variants:{variant:{default:"bg-background text-foreground",destructive:"border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive"}},defaultVariants:{variant:"default"}}),d=l.forwardRef((e,r)=>{let{className:t,variant:l,...n}=e;return(0,a.jsx)("div",{ref:r,role:"alert",className:(0,s.cn)(i({variant:l}),t),...n})});d.displayName="Alert";let o=l.forwardRef((e,r)=>{let{className:t,...l}=e;return(0,a.jsx)("h5",{ref:r,className:(0,s.cn)("mb-1 font-medium leading-none tracking-tight",t),...l})});o.displayName="AlertTitle";let c=l.forwardRef((e,r)=>{let{className:t,...l}=e;return(0,a.jsx)("div",{ref:r,className:(0,s.cn)("text-sm [&_p]:leading-relaxed",t),...l})});c.displayName="AlertDescription"},79820:function(e,r,t){"use strict";t.d(r,{Ol:function(){return i},Zb:function(){return s},aY:function(){return o},eW:function(){return c},ll:function(){return d}});var a=t(57437),l=t(2265),n=t(93448);let s=l.forwardRef((e,r)=>{let{className:t,...l}=e;return(0,a.jsx)("div",{ref:r,className:(0,n.cn)("rounded-xl border bg-card text-card-foreground shadow",t),...l})});s.displayName="Card";let i=l.forwardRef((e,r)=>{let{className:t,...l}=e;return(0,a.jsx)("div",{ref:r,className:(0,n.cn)("flex flex-col space-y-1.5 p-6",t),...l})});i.displayName="CardHeader";let d=l.forwardRef((e,r)=>{let{className:t,...l}=e;return(0,a.jsx)("h3",{ref:r,className:(0,n.cn)("font-semibold leading-none tracking-tight",t),...l})});d.displayName="CardTitle",l.forwardRef((e,r)=>{let{className:t,...l}=e;return(0,a.jsx)("p",{ref:r,className:(0,n.cn)("text-sm text-muted-foreground",t),...l})}).displayName="CardDescription";let o=l.forwardRef((e,r)=>{let{className:t,...l}=e;return(0,a.jsx)("div",{ref:r,className:(0,n.cn)("p-6 pt-0",t),...l})});o.displayName="CardContent";let c=l.forwardRef((e,r)=>{let{className:t,...l}=e;return(0,a.jsx)("div",{ref:r,className:(0,n.cn)("flex items-center p-6 pt-0",t),...l})});c.displayName="CardFooter"},40279:function(e,r,t){"use strict";t.d(r,{I:function(){return s}});var a=t(57437),l=t(2265),n=t(93448);let s=l.forwardRef((e,r)=>{let{className:t,type:l,...s}=e;return(0,a.jsx)("input",{type:l,className:(0,n.cn)("flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",t),ref:r,...s})});s.displayName="Input"},93448:function(e,r,t){"use strict";t.d(r,{cn:function(){return n}});var a=t(61994),l=t(53335);function n(){for(var e=arguments.length,r=Array(e),t=0;t<e;t++)r[t]=arguments[t];return(0,l.m6)((0,a.W)(r))}}},function(e){e.O(0,[579,464,971,117,744],function(){return e(e.s=42472)}),_N_E=e.O()}]);