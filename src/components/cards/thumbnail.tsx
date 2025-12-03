import * as React from "react";
import { RSSItem } from "../../scripts/models/item";
import CachedImg from "./cached-img";
import { getThumbnailTypePref } from "../../scripts/settings";

type CardThumbnailProps = {
    item: RSSItem;
    className?: string;
    width?: number;
    height?: number;
};

const mediaElement = (
    src: string,
    className: string,
    width: number | null,
    height: number | null,
) => {
    return (
        <CachedImg
            src={src}
            className={className}
            width={width}
            height={height}></CachedImg>
    );
};

function CardThumbnail(props: CardThumbnailProps): React.JSX.Element {
    const preferredThumbnailType = getThumbnailTypePref();
    const preferredThumbnail = props.item.thumbnails?.filter(
        (t) => t.type === preferredThumbnailType,
    )?.[0];
    const selectedThumbnail = preferredThumbnail ?? props.item.thumbnails?.[0];
    return selectedThumbnail
        ? mediaElement(
              new URL(selectedThumbnail.url, props.item.link).toString(),
              props.className,
              props.width,
              props.height,
          )
        : null;
}

export default CardThumbnail;
