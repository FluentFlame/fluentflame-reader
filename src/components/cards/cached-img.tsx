import * as React from "react";
import { AnimationMotionPref } from "../../schema-types";
import { getAnimationMotionPref } from "../../scripts/settings";

type ImgProps = {
    src: string;
    className?: string;
};

type PlaceholderImageSource = "<PLACEHOLDER>";
const placeholderImageSource: PlaceholderImageSource = "<PLACEHOLDER>";

class CachedImg extends React.Component<ImgProps> {
    private static readonly _cache = new Map<
        string,
        | HTMLImageElement
        | HTMLVideoElement
        | VideoFrame[]
        | null
        | PlaceholderImageSource
    >();
    private static readonly _maxCanvasDimension = 512;
    private readonly _canvasRef = React.createRef<HTMLCanvasElement>();
    private _needsRescaling: boolean = true;
    private _imgSource:
        | HTMLImageElement
        | HTMLVideoElement
        | VideoFrame[]
        | null = null;
    private _animationTimeout: NodeJS.Timeout | null = null;
    private _requestVideoFrameCallback: number | null = null;

    constructor(props: ImgProps) {
        super(props);
    }

    private async loadContentType(url: string): Promise<string> {
        if (!url) return "";
        const response = await fetch(url, { method: "HEAD" });
        if (!response.ok) return "";
        return response.headers.get("content-type");
    }

    private async loadImage(url: string): Promise<VideoFrame[]> {
        try {
            const response = await fetch(url);
            if (!response.ok) return null;
            const data = await response.bytes();
            const contentType = response.headers.get("content-type");
            if (!ImageDecoder.isTypeSupported(contentType)) return null;
            const decoder = new ImageDecoder({ data, type: contentType });
            let frameIndex = 0;
            const frames: VideoFrame[] = [];
            while (true) {
                try {
                    const image = await decoder.decode({
                        frameIndex,
                        completeFramesOnly: true,
                    });
                    frames.push(image.image);
                    frameIndex++;
                } catch (e) {
                    if (e instanceof RangeError) break;
                }
            }
            return frames;
        } catch {
            console.log(`Failed to fetch ${url}`);
            return null;
        }
    }

    private draw(img: HTMLImageElement | HTMLVideoElement | VideoFrame) {
        const canvas = this._canvasRef.current;
        if (!canvas || !img) {
            return;
        }
        const width =
            img instanceof HTMLImageElement
                ? img.width
                : img instanceof HTMLVideoElement
                  ? img.videoWidth
                  : img.displayWidth;
        const height =
            img instanceof HTMLImageElement
                ? img.height
                : img instanceof HTMLVideoElement
                  ? img.videoHeight
                  : img.displayHeight;
        if (this._needsRescaling) {
            if (
                width > CachedImg._maxCanvasDimension ||
                height > CachedImg._maxCanvasDimension
            ) {
                const scaleFactor = Math.max(
                    width / CachedImg._maxCanvasDimension,
                    height / CachedImg._maxCanvasDimension,
                );
                canvas.width = width / scaleFactor;
                canvas.height = height / scaleFactor;
            } else {
                canvas.width = width;
                canvas.height = height;
            }
            this._needsRescaling = false;
        }
        const ctx = canvas.getContext("2d");
        ctx.drawImage(
            img,
            0,
            0,
            width,
            height,
            0,
            0,
            canvas.width,
            canvas.height,
        );
    }

    private createVideo(src: string): HTMLVideoElement {
        const imgSource = document.createElement("video");
        imgSource.loop = true;
        imgSource.muted = true;
        imgSource.autoplay = true;
        imgSource.src = src;
        return imgSource;
    }

    private createImage(src: string): HTMLImageElement {
        const imgSource = new Image();
        imgSource.loading = "eager";
        imgSource.src = src;
        return imgSource;
    }

    private async renderImage(): Promise<void> {
        const animationMotionPref = getAnimationMotionPref();
        const realisedAnimationMotionPref =
            animationMotionPref !== AnimationMotionPref.System
                ? animationMotionPref
                : window.utils.systemPreferencesGetAnimationSettings()
                        .prefersReducedMotion
                  ? AnimationMotionPref.Off
                  : AnimationMotionPref.On;
        if (CachedImg._cache.has(this.props.src)) {
            const imgSource = CachedImg._cache.get(this.props.src);
            if (imgSource === placeholderImageSource) {
                await new Promise((resolve) => setTimeout(resolve, 100));
                this.forceUpdate();
            } else this._imgSource = imgSource;
        } else {
            CachedImg._cache.set(this.props.src, placeholderImageSource);
            const contentType = await this.loadContentType(this.props.src);
            if (contentType.startsWith("video/")) {
                this._imgSource = this.createVideo(this.props.src);
            } else if (
                //potentially animated images
                [
                    "image/gif",
                    "image/webp",
                    "image/avif",
                    "image/apng",
                    "image/svg",
                ].includes(contentType) &&
                ImageDecoder.isTypeSupported(contentType)
            ) {
                const imgSource = await this.loadImage(this.props.src);
                if (imgSource.length === 1 && this._canvasRef.current) {
                    this.draw(imgSource[0]);
                    const img = this._canvasRef.current.toDataURL();
                    this._imgSource = this.createImage(img);
                } else this._imgSource = imgSource;
            } else if (contentType !== "") {
                this._imgSource = this.createImage(this.props.src);
            }
            CachedImg._cache.set(this.props.src, this._imgSource);
        }
        if (this._imgSource !== null) {
            if (this._imgSource instanceof HTMLImageElement) {
                try {
                    await this._imgSource.decode();
                    this.draw(this._imgSource);
                } catch {
                    this.forceUpdate();
                }
            } else if (this._imgSource instanceof HTMLVideoElement) {
                const video = this._imgSource;
                if (this._requestVideoFrameCallback !== null) {
                    video.cancelVideoFrameCallback(
                        this._requestVideoFrameCallback,
                    );
                    this._requestVideoFrameCallback = null;
                }
                const requestFrame = () => {
                    this.draw(video);
                    if (realisedAnimationMotionPref === AnimationMotionPref.On)
                        this._requestVideoFrameCallback =
                            video.requestVideoFrameCallback(requestFrame);
                };
                if (video.readyState < video.HAVE_CURRENT_DATA)
                    video.addEventListener("loadeddata", requestFrame);
                else requestFrame();
            } else {
                const frames = this._imgSource;
                let frameIndex = 0;
                if (this._animationTimeout) {
                    clearTimeout(this._animationTimeout);
                    this._animationTimeout = null;
                }
                const drawFrame = () => {
                    if (frames.length === 0) return;
                    const frame = frames[frameIndex];
                    const duration = frame.duration / 1000;
                    this.draw(frame);
                    if (
                        frames.length > 1 &&
                        realisedAnimationMotionPref === AnimationMotionPref.On
                    ) {
                        frameIndex = (frameIndex + 1) % frames.length;
                        this._animationTimeout = setTimeout(
                            () => drawFrame(),
                            duration,
                        );
                    }
                };
                drawFrame();
            }
        }
    }

    componentWillUnmount(): void {
        if (this._animationTimeout) {
            clearTimeout(this._animationTimeout);
            this._animationTimeout = null;
        }
        if (
            this._imgSource instanceof HTMLVideoElement &&
            this._requestVideoFrameCallback !== null
        ) {
            this._imgSource.cancelVideoFrameCallback(
                this._requestVideoFrameCallback,
            );
            this._requestVideoFrameCallback = null;
        }
    }

    render(): React.ReactNode {
        const canvas = (
            <canvas
                className={this.props.className}
                ref={this._canvasRef}></canvas>
        );
        this.renderImage();
        return canvas;
    }
}

export default CachedImg;
