import * as React from "react";
import { RSSItem } from "../../scripts/models/item";
import CachedImg from "./cached-img";
import { getThumbnailTypePref } from "../../scripts/settings";

type CardThumbnailProps = {
    item: RSSItem;
    className?: string;
};

const mediaElement = (src: string, className: string) => {
    return <CachedImg src={src} className={className}></CachedImg>;
};

const CardThumbnail: React.FunctionComponent<CardThumbnailProps> = (props) => {
    const preferredThumbnailType = getThumbnailTypePref();
    const preferredThumbnails = props.item.thumbnails?.filter(
        (t) => t.type === preferredThumbnailType,
    );
    const selectedThumbnail =
        preferredThumbnails && preferredThumbnails.length > 0
            ? preferredThumbnails[0].url
            : props.item.thumb;
    return selectedThumbnail
        ? mediaElement(
              new URL(selectedThumbnail, props.item.link).toString(),
              props.className,
          )
        : null;
};
export default CardThumbnail;
