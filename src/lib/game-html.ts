export const DEFAULT_GAME_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style></style>
</head>
<body>
  <div id="game"></div>
  <script></script>
</body>
</html>`;

export function extractStyleBlock(html: string): string {
  const match = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  return match?.[1] ?? "";
}

export function extractScriptBlock(html: string): string {
  const match = html.match(/<script(?![^>]*\bsrc\b)[^>]*>([\s\S]*?)<\/script>/i);
  return match?.[1] ?? "";
}

export function applyStyleBlock(html: string, css: string): string {
  const base = html.trim() || DEFAULT_GAME_HTML;
  if (/<style[^>]*>[\s\S]*?<\/style>/i.test(base)) {
    return base.replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/i, `$1${css}$3`);
  }
  if (/<\/head>/i.test(base)) {
    return base.replace(/<\/head>/i, `  <style>${css}</style>\n</head>`);
  }
  return `<style>${css}</style>\n${base}`;
}

export function applyScriptBlock(html: string, js: string): string {
  const base = html.trim() || DEFAULT_GAME_HTML;
  if (/<script(?![^>]*\bsrc\b)[^>]*>[\s\S]*?<\/script>/i.test(base)) {
    return base.replace(
      /(<script(?![^>]*\bsrc\b)[^>]*>)([\s\S]*?)(<\/script>)/i,
      `$1${js}$3`,
    );
  }
  if (/<\/body>/i.test(base)) {
    return base.replace(/<\/body>/i, `  <script>${js}</script>\n</body>`);
  }
  return `${base}\n<script>${js}</script>`;
}
