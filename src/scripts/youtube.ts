export const YOUTUBE_EMBED_PORT = 39217;

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

function validId(value: string | null | undefined): string | null {
    return value && YOUTUBE_ID.test(value) ? value : null;
}

/**
 * Extract a YouTube video id from the usual URL shapes:
 * watch?v=, youtu.be/, /shorts/, /live/ and /embed/.
 */
export function getYouTubeId(link: string): string | null {
    if (!link) return null;
    try {
        const url = new URL(link);
        const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");
        if (host === "youtu.be") {
            return validId(url.pathname.split("/")[1]);
        }
        if (host === "youtube.com" || host === "youtube-nocookie.com") {
            if (url.pathname === "/watch") {
                return validId(url.searchParams.get("v"));
            }
            const match = url.pathname.match(
                /^\/(?:shorts|live|embed)\/([A-Za-z0-9_-]{11})/,
            );
            return match ? match[1] : null;
        }
    } catch (e) {
        return null;
    }
    return null;
}

export function youtubeThumbnailUrl(id: string): string {
    return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export function youtubeEmbedPath(id: string): string {
    return `http://127.0.0.1:${YOUTUBE_EMBED_PORT}/yt?v=${id}`;
}
