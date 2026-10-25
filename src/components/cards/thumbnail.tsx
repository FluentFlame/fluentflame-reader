import * as React from "react";
import { RSSItem } from "../../scripts/models/item";
import CachedImg from "./cached-img";
import {
    type AnimationMotionPref,
    type ThumbnailTypePref,
} from "../../schema-types";
import { type RootState, useAppSelector } from "../../scripts/reducer";

type CardThumbnailProps = {
    item: RSSItem;
    className?: string;
    width?: number;
    height?: number;
};

const mediaElement = (
    src: string,
    animationPref: AnimationMotionPref,
    className: string,
    width: number | null,
    height: number | null,
) => {
    return (
        <CachedImg
            src={src}
            animationPref={animationPref}
            className={className}
            width={width}
            height={height}></CachedImg>
    );
};

/** Selector for animation motion preferences. */
function useAnimationMotionPref(state: RootState) {
    return state.app.animationMotionPref;
}

/** Selector for the thumbnail preference. */
function useThumbnailTypePref(state: RootState): ThumbnailTypePref {
    return state.app.thumbnailTypePref;
}

function CardThumbnail(props: CardThumbnailProps): React.JSX.Element {
    const preferredThumbnailType = useAppSelector(useThumbnailTypePref);
    const animationMotionPref = useAppSelector(useAnimationMotionPref);

    const preferredThumbnail = props.item.thumbnails?.filter(
        (t) => t.type === preferredThumbnailType,
    )?.[0];
    const selectedThumbnail = preferredThumbnail ?? props.item.thumbnails?.[0];
    return selectedThumbnail
        ? mediaElement(
              new URL(selectedThumbnail.url, props.item.link).toString(),
              animationMotionPref,
              props.className,
              props.width,
              props.height,
          )
        : null;
}

export default CardThumbnail;
