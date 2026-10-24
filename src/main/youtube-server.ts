import * as http from "http";
import { YOUTUBE_EMBED_PORT } from "../scripts/youtube";

let started = false;

function iframePage(id: string): string {
    return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
html,body{margin:0;height:100%;background:#000;overflow:hidden}
iframe{display:block;width:100%;height:100%;border:0}
</style>
</head>
<body>
<iframe
    src="https://www.youtube.com/embed/${id}?autoplay=1&rel=0&origin=http://127.0.0.1:${YOUTUBE_EMBED_PORT}"
    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
    allowfullscreen></iframe>
</body>
</html>`;
}

/**
 * Serve a tiny same-origin page so YouTube can render its player in an iframe.
 * YouTube rejects the embed when the parent is file:// (error 153).
 */
export function startYouTubeServer() {
    if (started) return;
    started = true;
    const server = http.createServer((req, res) => {
        const url = new URL(
            req.url || "/",
            `http://127.0.0.1:${YOUTUBE_EMBED_PORT}`,
        );
        if (url.pathname !== "/yt") {
            res.writeHead(404);
            res.end("not found");
            return;
        }
        const id = url.searchParams.get("v") || "";
        if (!/^[A-Za-z0-9_-]{11}$/.test(id)) {
            res.writeHead(400);
            res.end("bad video id");
            return;
        }
        res.writeHead(200, {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
        });
        res.end(iframePage(id));
    });
    server.on("error", (e: NodeJS.ErrnoException) => {
        if (e.code !== "EADDRINUSE") {
            console.error("YouTube iframe server:", e.message);
        }
    });
    server.listen(YOUTUBE_EMBED_PORT, "127.0.0.1");
}
