/** Injects input-relay script and relays demo events between iframe and WebSocket. */

const RELAY_SCRIPT = `<script>(function(){if(window===window.parent)return;function send(type,detail){window.parent.postMessage({source:'gamezo-demo',type,detail},'*')}['keydown','keyup','mousedown','mouseup','click','touchstart','touchend'].forEach(function(ev){document.addEventListener(ev,function(e){send(ev,{key:e.key,code:e.code,x:e.clientX,y:e.clientY,button:e.button})},true)})})();<\/script>`;

export function injectDemoRelay(html: string): string {
  if (!html || html.includes("gamezo-demo")) return html;
  if (html.includes("</body>")) {
    return html.replace("</body>", `${RELAY_SCRIPT}</body>`);
  }
  return html + RELAY_SCRIPT;
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
