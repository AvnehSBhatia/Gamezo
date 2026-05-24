// Game screen constants and types
export const STARTER_CODE = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin:0; background:#111; color:#fff;
           display:flex; flex-direction:column;
           align-items:center; justify-content:center;
           height:100vh; font-family:sans-serif; }
    h1 { font-size:2rem; margin-bottom:1rem; }
    #arena { width:300px; height:220px; background:#222;
             border-radius:12px; display:flex;
             align-items:center; justify-content:center; }
  </style>
</head>
<body>
  <h1>YOUR GAME 🎮</h1>
  <div id="arena"><p style="color:#888">write your game here…</p></div>
  <script>
    // your JS here
  </script>
</body>
</html>`;

export const TOTAL_SECONDS = 60; // 1 min per spec (60s)

export interface ChatMsg {
  from: "system" | "you" | "opponent";
  text: string;
}

export const SEED_MESSAGES: ChatMsg[] = [
  { from: "system",   text: "Match started — 1 minute on the clock." },
  { from: "opponent", text: "let's goooo" },
];
