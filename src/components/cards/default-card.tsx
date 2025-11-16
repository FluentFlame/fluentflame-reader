import * as React from "react";
import { Card } from "./card";
import CardInfo from "./info";
import Highlights from "./highlights";
import { SourceTextDirection } from "../../scripts/models/source";
import CardThumbnail from "./thumbnail";

const className = (props: Card.Props) => {
    let cn = ["card", "default-card"];
    if (props.item.snippet && props.item.thumb) cn.push("transform");
    if (props.item.hidden) cn.push("hidden");
    if (props.source.textDir === SourceTextDirection.RTL) cn.push("rtl");
    return cn.join(" ");
};

const DefaultCard: React.FunctionComponent<Card.Props> = (props) => (
    <div
        className={className(props)}
        {...Card.bindEventsToProps(props)}
        data-iid={props.item.iid}
        data-is-focusable
    >
        <CardThumbnail className="bg" item={props.item} />
        <div className="bg"></div>
        <CardThumbnail className="head" item={props.item} />
        <CardInfo source={props.source} item={props.item} />
        <h3 className="title">
            <Highlights text={props.item.title} filter={props.filter} title />
        </h3>
        <p className={"snippet" + (props.item.thumb ? "" : " show")}>
            <Highlights text={props.item.snippet} filter={props.filter} />
        </p>
    </div>
);

export default DefaultCard;
