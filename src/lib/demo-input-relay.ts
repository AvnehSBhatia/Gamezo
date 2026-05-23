/** Injects input-relay script and relays demo events between iframe and WebSocket. */

export type DemoRelayMode = "play" | "watch";

const RELAY_SCRIPT = `<script>(function(){
if(window===window.parent)return;
var inputEnabled=false;
window.addEventListener("message",function(e){
  var d=e.data;
  if(!d||typeof d!=="object")return;
  if(d.source==="gamezo-demo-config"){inputEnabled=!!d.inputEnabled;return;}
  if(d.source!=="gamezo-demo-apply")return;
  applyInput(d.type,d.detail||{});
});
function applyInput(type,detail){
  try{
    if(type==="keydown"||type==="keyup"){
      document.dispatchEvent(new KeyboardEvent(type,{key:detail.key||"",code:detail.code||"",bubbles:true,cancelable:true}));
      return;
    }
    if(type==="click"||type==="mousedown"||type==="mouseup"){
      var el=document.elementFromPoint(detail.x||0,detail.y||0)||document.body;
      el.dispatchEvent(new MouseEvent(type,{clientX:detail.x||0,clientY:detail.y||0,button:detail.button||0,bubbles:true,cancelable:true}));
      return;
    }
    if(type==="touchstart"||type==="touchend"){
      var target=document.elementFromPoint(detail.x||0,detail.y||0)||document.body;
      try{
        target.dispatchEvent(new TouchEvent(type,{bubbles:true,cancelable:true}));
      }catch(_){}
    }
  }catch(_){}
}
["keydown","keyup","mousedown","mouseup","click","touchstart","touchend"].forEach(function(ev){
  document.addEventListener(ev,function(e){
    if(!inputEnabled)return;
    window.parent.postMessage({source:"gamezo-demo",type:ev,detail:{key:e.key,code:e.code,x:e.clientX,y:e.clientY,button:e.button}}, "*");
  },true);
});
window.parent.postMessage({source:"gamezo-demo-ready"},"*");
})();<\/script>`;

export function injectDemoRelay(html: string, _mode: DemoRelayMode = "play"): string {
  if (!html || html.includes("gamezo-demo-ready")) return html;
  if (html.includes("</body>")) {
    return html.replace("</body>", `${RELAY_SCRIPT}</body>`);
  }
  return html + RELAY_SCRIPT;
}

export function configureDemoIframe(iframe: HTMLIFrameElement | null, mode: DemoRelayMode) {
  if (!iframe?.contentWindow) return;
  iframe.contentWindow.postMessage(
    { source: "gamezo-demo-config", inputEnabled: mode === "play" },
    "*",
  );
}

export interface DemoInputEvent {
  type: string;
  detail?: {
    key?: string;
    code?: string;
    x?: number;
    y?: number;
    button?: number;
  };
}

export function applyDemoInput(iframe: HTMLIFrameElement | null, event: DemoInputEvent) {
  if (!iframe?.contentWindow || !event.type) return;
  iframe.contentWindow.postMessage({ source: "gamezo-demo-apply", ...event }, "*");
}

export function parseDemoMessage(data: unknown): DemoInputEvent | null {
  if (!data || typeof data !== "object") return null;
  const msg = data as Record<string, unknown>;
  if (msg.source !== "gamezo-demo") return null;
  return { type: String(msg.type ?? ""), detail: msg.detail as DemoInputEvent["detail"] };
}

export function opponentSlot(slot: "playerA" | "playerB"): "playerA" | "playerB" {
  return slot === "playerA" ? "playerB" : "playerA";
}
