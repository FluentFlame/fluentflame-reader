import { ThumbnailTypePref } from "../schema-types";

export interface ThumbnailAttributes {
    medium: "image" | "video";
    url: string;
    type: ThumbnailTypePref;
}

/**
 * Return only the head of a given url.
 */
async function fetchHead(url: URL): Promise<string> {
    const controller = new AbortController();
    const response = await fetch(url, { signal: controller.signal });
    let result = "";
    if (!response.ok || !response.body) return result;
    const stream = response.body.pipeThrough(new TextDecoderStream());
    const headRegex = /<\/head>/i;
    for await (const value of stream) {
        result += value;
        if (headRegex.test(value)) {
            controller.abort();
            return result;
        }
    }
    return result;
}

async function makeOpenGraphThumbnail(
    head: string,
): Promise<ThumbnailAttributes[]> {
    const dom = new DOMParser().parseFromString(head, "text/html");
    const elements = [
        ...dom.head.querySelectorAll(
            "meta[property*='og:image'],meta[property*='og:video']",
        ),
    ].map((e: HTMLMetaElement) => {
        return { tag: e.getAttribute("property"), content: e.content };
    });

    const queries = [
        "og:image",
        "og:image:url",
        "og:image:secure_url",
        "og:video",
        "og:video:url",
        "og:video:secure_url",
    ];
    const result: ThumbnailAttributes[] = [];
    for (const query of queries) {
        const element = elements.find((e) => e.tag === query)?.content ?? null;
        if (element !== null)
            result.push(
                await urlToThumbnailAttributes(
                    element,
                    query.startsWith("og:image") ? "image" : "video",
                    ThumbnailTypePref.OpenGraph,
                ),
            );
    }
    console.log("Found:", result);
    return result;
}

const OPENGRAPH_REGEX = /og:(?:image|video)/i;

async function fetchOpenGraphThumb(
    url: URL,
): Promise<ThumbnailAttributes[] | null> {
    const head = await fetchHead(url);
    console.log(head);
    if (OPENGRAPH_REGEX.test(head)) {
        console.log("making opengraph thumbnail");
        return makeOpenGraphThumbnail(head);
    }
    return null;
}

async function urlToThumbnailAttributes(
    url: string,
    medium: "image" | "video" | "unknown",
    type: ThumbnailTypePref,
): Promise<ThumbnailAttributes> {
    if (medium === "image" || medium === "video") {
        return {
            url,
            medium,
            type,
        };
    }
    const response = await fetch(url, { method: "HEAD" });
    if (!response.ok)
        return {
            url,
            medium: "image", //assume image as a fallback
            type,
        };
    const contentType = response.headers.get("content-type");
    medium = contentType.startsWith("video/") ? "video" : "image";
    return {
        url,
        medium,
        type,
    };
}

export type ThumbnailOptions = {
    targetLink: string;
    mediaThumbnails?: { $?: { url?: string } }[];
    mediaContent?: {
        $?: {
            url?: string;
            medium?: "image" | "video" | "unknown";
            type?: string;
        };
    }[];
    parsedThumb?: string | null;
    parsedImage?: string | null;
    imageTag?: { $?: { url?: string } } | null;
    content?: string | null;
};

/** Generate all possible thumbnail attributes of an item.
 *
 * This function is very complex because there's so many different ways to try to infer what
 * the thumbnail should be.
 */
export async function generateThumbnailAttrList(
    opt: ThumbnailOptions,
): Promise<ThumbnailAttributes[]> {
    let output = [];
    if (opt.targetLink) {
        if (!opt.targetLink.startsWith("http://") && !opt.targetLink.startsWith("https://")) {
            // targetLink is invalid. Stop right here.
            console.error(`targetLink of '${opt.targetLink}' is not an HTTP URL`)
            return [];
        }

        let potentialThumbs: ThumbnailAttributes[] | null = null;
        try {
            potentialThumbs = await fetchOpenGraphThumb(
                new URL(opt.targetLink),
            );
        } catch (e) {
            // We don't need an OpenGraph thumbnail. Skip it if it fails.
            console.warn(
                `Failed to fetch OpenGraph thumb from ${opt.targetLink}`,
                e,
            );
        }
        if (potentialThumbs && potentialThumbs.length > 0) {
            output.push(...potentialThumbs);
        }
    }
    if (opt.mediaThumbnails) {
        const images = opt.mediaThumbnails.filter((t) => t.$?.url);
        for (const image of images)
            output.push(
                await urlToThumbnailAttributes(
                    image.$.url,
                    "unknown",
                    ThumbnailTypePref.MediaThumbnail,
                ),
            );
    }
    if (opt.parsedThumb) {
        output.push(
            await urlToThumbnailAttributes(
                opt.parsedThumb,
                "unknown",
                ThumbnailTypePref.Thumb,
            ),
        );
    }
    if (opt.imageTag?.$?.url) {
        output.push(
            await urlToThumbnailAttributes(
                opt.imageTag.$.url,
                "image",
                ThumbnailTypePref.Other,
            ),
        );
    }
    if (opt.parsedImage && typeof opt.parsedImage === "string") {
        output.push(
            await urlToThumbnailAttributes(
                opt.parsedImage as string,
                "image",
                ThumbnailTypePref.Other,
            ),
        );
    }
    if (opt.mediaContent) {
        const images = opt.mediaContent.filter(
            (c) =>
                c.$ &&
                (c.$.medium === "image" ||
                    (typeof c.$.type === "string" &&
                        c.$.type.startsWith("image/"))) &&
                c.$.url,
        );
        for (const image of images)
            output.push(
                await urlToThumbnailAttributes(
                    image.$.url,
                    image.$.medium,
                    ThumbnailTypePref.Other,
                ),
            );
    }
    if (opt.content && opt.targetLink != null) {
        const dom = new DOMParser().parseFromString(opt.content, "text/html");
        let baseEl = dom.createElement("base");
        baseEl.setAttribute(
            "href",
            opt.targetLink.split("/").slice(0, 3).join("/"),
        );
        dom.head.append(baseEl);
        let img = dom.querySelector("img");
        if (img && img.src)
            output.push(
                await urlToThumbnailAttributes(
                    img.src,
                    "image",
                    ThumbnailTypePref.Other,
                ),
            );
    }
    output = output
        .map((t) => {
            return {
                medium: t.medium,
                type: t.type,
                url: new URL(t.url, opt.targetLink).toString(),
            };
        });
    return output;
}
