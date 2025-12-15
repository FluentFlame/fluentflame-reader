import * as React from "react";
import intl from "react-intl-universal";
import QRCode from "qrcode.react";
import {
    cutText,
    webSearch,
    getSearchEngineName,
    platformCtrl,
    type AppDispatch,
} from "../scripts/utils";
import {
    ContextualMenu,
    IContextualMenuItem,
    ContextualMenuItemType,
    DirectionalHint,
} from "@fluentui/react";
import {
    ContextMenuType,
    closeContextMenu,
    setSettingsTab,
    toggleSettings,
} from "../scripts/models/app";
import {
    RSSItem,
    fetchItems,
    markAllRead,
    markRead,
    markUnread,
    toggleHidden,
    toggleStarred,
} from "../scripts/models/item";
import { setViewConfig } from "../scripts/models/page";
import {
    ViewType,
    ImageCallbackTypes,
    ListViewConfigs,
    ViewConfig,
} from "../schema-types";
import { FilterType } from "../scripts/models/feed";
import { useAppDispatch, useAppSelector } from "../scripts/reducer";
import {
    showItem,
    switchFilter,
    switchView,
    toggleFilter,
} from "../scripts/models/page";

export const shareSubmenu = (item: RSSItem): IContextualMenuItem[] => [
    { key: "qr", url: item.link, onRender: renderShareQR },
];

export const renderShareQR = (item: IContextualMenuItem) => (
    <div className="qr-container">
        <QRCode value={item.url} size={150} renderAs="svg" />
    </div>
);

function getSearchItem(text: string): IContextualMenuItem {
    const engine = window.settings.getSearchEngine();
    return {
        key: "searchText",
        text: intl.get("context.search", {
            text: cutText(text, 15),
            engine: getSearchEngineName(engine),
        }),
        iconProps: { iconName: "Search" },
        onClick: () => webSearch(text, engine),
    };
}

export function ContextMenu(): React.JSX.Element {
    const { type } = useAppSelector((state) => state.app.contextMenu);

    switch (type) {
        case ContextMenuType.Hidden:
            return null;
        case ContextMenuType.Item:
            return <ItemContextMenu />;
        case ContextMenuType.Text:
            return <TextContextMenu />;
        case ContextMenuType.Image:
            return <ImageContextMenu />;
        case ContextMenuType.View:
            return <ViewContextMenu />;
        case ContextMenuType.Group:
            return <GroupContextMenu />;
        case ContextMenuType.MarkRead:
            return <MarkReadContextMenu />;
    }
}

function ItemContextMenu(): React.JSX.Element {
    const dispatch = useAppDispatch();
    const viewConfig = useAppSelector((state) => state.page.viewConfig);
    const target = useAppSelector((state) => state.app.contextMenu.target);
    const item = target[0] as RSSItem;
    const feedId = target[1] as string;

    const menuItems: IContextualMenuItem[] = [
        {
            key: "showItem",
            text: intl.get("context.read"),
            iconProps: { iconName: "TextDocument" },
            onClick: () => {
                dispatch(markRead(item));
                dispatch(showItem(feedId, item));
            },
        },
        {
            key: "openInBrowser",
            text: intl.get("openExternal"),
            iconProps: { iconName: "NavigateExternalInline" },
            onClick: (e) => {
                dispatch(markRead(item));
                window.utils.openExternal(item.link, platformCtrl(e));
            },
        },
        {
            key: "markAsRead",
            text: item.hasRead
                ? intl.get("article.markUnread")
                : intl.get("article.markRead"),
            iconProps: item.hasRead
                ? {
                      iconName: "RadioBtnOn",
                      style: { fontSize: 14, textAlign: "center" },
                  }
                : { iconName: "StatusCircleRing" },
            onClick: () => {
                if (item.hasRead) {
                    dispatch(markUnread(item));
                } else {
                    dispatch(markRead(item));
                }
            },
            split: true,
            subMenuProps: {
                items: [
                    {
                        key: "markBelow",
                        text: intl.get("article.markBelow"),
                        iconProps: {
                            iconName: "Down",
                            style: { fontSize: 14 },
                        },
                        onClick: () => {
                            dispatch(markAllRead(null, item.date));
                        },
                    },
                    {
                        key: "markAbove",
                        text: intl.get("article.markAbove"),
                        iconProps: {
                            iconName: "Up",
                            style: { fontSize: 14 },
                        },
                        onClick: () => {
                            dispatch(markAllRead(null, item.date, false));
                        },
                    },
                ],
            },
        },
        {
            key: "toggleStarred",
            text: item.starred
                ? intl.get("article.unstar")
                : intl.get("article.star"),
            iconProps: {
                iconName: item.starred ? "FavoriteStar" : "FavoriteStarFill",
            },
            onClick: () => {
                dispatch(toggleStarred(item));
            },
        },
        {
            key: "toggleHidden",
            text: item.hidden
                ? intl.get("article.unhide")
                : intl.get("article.hide"),
            iconProps: {
                iconName: item.hidden ? "View" : "Hide3",
            },
            onClick: () => {
                dispatch(toggleHidden(item));
            },
        },
        {
            key: "divider_1",
            itemType: ContextualMenuItemType.Divider,
        },
        {
            key: "share",
            text: intl.get("context.share"),
            iconProps: { iconName: "Share" },
            subMenuProps: {
                items: shareSubmenu(item),
            },
        },
        {
            key: "copyTitle",
            text: intl.get("context.copyTitle"),
            onClick: () => {
                window.utils.writeClipboard(item.title);
            },
        },
        {
            key: "copyURL",
            text: intl.get("context.copyURL"),
            onClick: () => {
                window.utils.writeClipboard(item.link);
            },
        },
        ...listViewMenuItems(dispatch, viewConfig),
    ];
    return <ContextMenuBase menuItems={menuItems} />;
}

function listViewMenuItems(
    dispatch: AppDispatch,
    curViewConfig: ViewConfig,
): IContextualMenuItem[] {
    if (curViewConfig.currentView !== ViewType.List) {
        return [];
    }
    const listViewConfigs = curViewConfig.listViewConfigs;
    return [
        {
            key: "divider_2",
            itemType: ContextualMenuItemType.Divider,
        },
        {
            key: "view",
            text: intl.get("context.view"),
            subMenuProps: {
                items: [
                    {
                        key: "showCover",
                        text: intl.get("context.showCover"),
                        canCheck: true,
                        checked: Boolean(
                            listViewConfigs & ListViewConfigs.ShowCover,
                        ),
                        onClick: () =>
                            dispatch(
                                setViewConfig({
                                    ...curViewConfig,
                                    listViewConfigs:
                                        listViewConfigs ^
                                        ListViewConfigs.ShowCover,
                                }),
                            ),
                    },
                    {
                        key: "showSnippet",
                        text: intl.get("context.showSnippet"),
                        canCheck: true,
                        checked: Boolean(
                            listViewConfigs & ListViewConfigs.ShowSnippet,
                        ),
                        onClick: () =>
                            dispatch(
                                setViewConfig({
                                    ...curViewConfig,
                                    listViewConfigs:
                                        listViewConfigs ^
                                        ListViewConfigs.ShowSnippet,
                                }),
                            ),
                    },
                    {
                        key: "fadeRead",
                        text: intl.get("context.fadeRead"),
                        canCheck: true,
                        checked: Boolean(
                            listViewConfigs & ListViewConfigs.FadeRead,
                        ),
                        onClick: () =>
                            dispatch(
                                setViewConfig({
                                    ...curViewConfig,
                                    listViewConfigs:
                                        listViewConfigs ^
                                        ListViewConfigs.FadeRead,
                                }),
                            ),
                    },
                ],
            },
        },
    ];
}

function TextContextMenu(): React.JSX.Element {
    const target = useAppSelector((state) => state.app.contextMenu.target) as [
        string,
        string,
    ];
    const text = target[0];
    const url = target[1];
    const menuItems: IContextualMenuItem[] = text
        ? [
              {
                  key: "copyText",
                  text: intl.get("context.copy"),
                  iconProps: { iconName: "Copy" },
                  onClick: () => {
                      window.utils.writeClipboard(text);
                  },
              },
              getSearchItem(text),
          ]
        : [];
    if (url) {
        menuItems.push({
            key: "urlSection",
            itemType: ContextualMenuItemType.Section,
            sectionProps: {
                topDivider: menuItems.length > 0,
                items: [
                    {
                        key: "openInBrowser",
                        text: intl.get("openExternal"),
                        iconProps: {
                            iconName: "NavigateExternalInline",
                        },
                        onClick: (e) => {
                            window.utils.openExternal(url, platformCtrl(e));
                        },
                    },
                    {
                        key: "copyURL",
                        text: intl.get("context.copyURL"),
                        iconProps: { iconName: "Link" },
                        onClick: () => {
                            window.utils.writeClipboard(url);
                        },
                    },
                ],
            },
        });
    }
    return <ContextMenuBase menuItems={menuItems} />;
}

function ImageContextMenu(): React.JSX.Element {
    const menuItems: IContextualMenuItem[] = [
        {
            key: "openInBrowser",
            text: intl.get("openExternal"),
            iconProps: { iconName: "NavigateExternalInline" },
            onClick: (e) => {
                if (platformCtrl(e)) {
                    window.utils.imageCallback(
                        ImageCallbackTypes.OpenExternalBg,
                    );
                } else {
                    window.utils.imageCallback(ImageCallbackTypes.OpenExternal);
                }
            },
        },
        {
            key: "saveImageAs",
            text: intl.get("context.saveImageAs"),
            iconProps: { iconName: "SaveTemplate" },
            onClick: () => {
                window.utils.imageCallback(ImageCallbackTypes.SaveAs);
            },
        },
        {
            key: "copyImage",
            text: intl.get("context.copyImage"),
            iconProps: { iconName: "FileImage" },
            onClick: () => {
                window.utils.imageCallback(ImageCallbackTypes.Copy);
            },
        },
        {
            key: "copyImageURL",
            text: intl.get("context.copyImageURL"),
            iconProps: { iconName: "Link" },
            onClick: () => {
                window.utils.imageCallback(ImageCallbackTypes.CopyLink);
            },
        },
    ];
    return <ContextMenuBase menuItems={menuItems} />;
}

function ViewContextMenu(): React.JSX.Element {
    const dispatch = useAppDispatch();
    const viewType = useAppSelector(
        (state) => state.page.viewConfig.currentView,
    );
    const filter = useAppSelector((state) => state.page.filter.type);

    const menuItems: IContextualMenuItem[] = [
        {
            key: "section_1",
            itemType: ContextualMenuItemType.Section,
            sectionProps: {
                title: intl.get("context.view"),
                bottomDivider: true,
                items: [
                    {
                        key: "cardView",
                        text: intl.get("context.cardView"),
                        iconProps: { iconName: "GridViewMedium" },
                        canCheck: true,
                        checked: viewType === ViewType.Cards,
                        onClick: () => dispatch(switchView(ViewType.Cards)),
                    },
                    {
                        key: "listView",
                        text: intl.get("context.listView"),
                        iconProps: { iconName: "BacklogList" },
                        canCheck: true,
                        checked: viewType === ViewType.List,
                        onClick: () => dispatch(switchView(ViewType.List)),
                    },
                    {
                        key: "magazineView",
                        text: intl.get("context.magazineView"),
                        iconProps: { iconName: "Articles" },
                        canCheck: true,
                        checked: viewType === ViewType.Magazine,
                        onClick: () => dispatch(switchView(ViewType.Magazine)),
                    },
                    {
                        key: "compactView",
                        text: intl.get("context.compactView"),
                        iconProps: { iconName: "BulletedList" },
                        canCheck: true,
                        checked: viewType === ViewType.Compact,
                        onClick: () => dispatch(switchView(ViewType.Compact)),
                    },
                ],
            },
        },
        {
            key: "section_2",
            itemType: ContextualMenuItemType.Section,
            sectionProps: {
                title: intl.get("context.filter"),
                bottomDivider: true,
                items: [
                    {
                        key: "allArticles",
                        text: intl.get("allArticles"),
                        iconProps: { iconName: "ClearFilter" },
                        canCheck: true,
                        checked:
                            (filter & ~FilterType.Toggles) ==
                            FilterType.Default,
                        onClick: () =>
                            dispatch(switchFilter(FilterType.Default)),
                    },
                    {
                        key: "unreadOnly",
                        text: intl.get("context.unreadOnly"),
                        iconProps: {
                            iconName: "RadioBtnOn",
                            style: {
                                fontSize: 14,
                                textAlign: "center",
                            },
                        },
                        canCheck: true,
                        checked:
                            (filter & ~FilterType.Toggles) ==
                            FilterType.UnreadOnly,
                        onClick: () =>
                            dispatch(switchFilter(FilterType.UnreadOnly)),
                    },
                    {
                        key: "starredOnly",
                        text: intl.get("context.starredOnly"),
                        iconProps: { iconName: "FavoriteStarFill" },
                        canCheck: true,
                        checked:
                            (filter & ~FilterType.Toggles) ==
                            FilterType.StarredOnly,
                        onClick: () =>
                            dispatch(switchFilter(FilterType.StarredOnly)),
                    },
                ],
            },
        },
        {
            key: "section_3",
            itemType: ContextualMenuItemType.Section,
            sectionProps: {
                title: intl.get("search"),
                bottomDivider: true,
                items: [
                    {
                        key: "caseSensitive",
                        text: intl.get("context.caseSensitive"),
                        iconProps: {
                            style: {
                                fontSize: 12,
                                fontStyle: "normal",
                            },
                            children: "Aa",
                        },
                        canCheck: true,
                        checked: !(filter & FilterType.CaseInsensitive),
                        onClick: () =>
                            dispatch(toggleFilter(FilterType.CaseInsensitive)),
                    },
                    {
                        key: "fullSearch",
                        text: intl.get("context.fullSearch"),
                        iconProps: { iconName: "Breadcrumb" },
                        canCheck: true,
                        checked: Boolean(filter & FilterType.FullSearch),
                        onClick: () =>
                            dispatch(toggleFilter(FilterType.FullSearch)),
                    },
                ],
            },
        },
        {
            key: "showHidden",
            text: intl.get("context.showHidden"),
            canCheck: true,
            checked: Boolean(filter & FilterType.ShowHidden),
            onClick: () => dispatch(toggleFilter(FilterType.ShowHidden)),
        },
    ];
    return <ContextMenuBase menuItems={menuItems} />;
}

function GroupContextMenu(): React.JSX.Element {
    const dispatch = useAppDispatch();
    const sids = useAppSelector(
        (state) => state.app.contextMenu.target,
    ) as number[];

    const menuItems: IContextualMenuItem[] = [
        {
            key: "markAllRead",
            text: intl.get("nav.markAllRead"),
            iconProps: { iconName: "CheckMark" },
            onClick: () => {
                dispatch(markAllRead(sids));
            },
        },
        {
            key: "refresh",
            text: intl.get("nav.refresh"),
            iconProps: { iconName: "Sync" },
            onClick: () => {
                dispatch(fetchItems(true, sids));
            },
        },
        {
            key: "manage",
            text: intl.get("context.manageSources"),
            iconProps: { iconName: "Settings" },
            onClick: () => {
                dispatch(setSettingsTab("sources"));
                dispatch(toggleSettings(true, sids));
            },
        },
    ];
    return <ContextMenuBase menuItems={menuItems} />;
}

function MarkReadContextMenu(): React.JSX.Element {
    const dispatch = useAppDispatch();

    const menuItems: IContextualMenuItem[] = [
        {
            key: "section_1",
            itemType: ContextualMenuItemType.Section,
            sectionProps: {
                title: intl.get("nav.markAllRead"),
                items: [
                    {
                        key: "all",
                        text: intl.get("allArticles"),
                        iconProps: { iconName: "ReceiptCheck" },
                        onClick: () => {
                            dispatch(markAllRead());
                        },
                    },
                    {
                        key: "1d",
                        text: intl.get("app.daysAgo", { days: 1 }),
                        onClick: () => {
                            let date = new Date();
                            date.setTime(date.getTime() - 86400000);
                            dispatch(markAllRead(null, date));
                        },
                    },
                    {
                        key: "3d",
                        text: intl.get("app.daysAgo", { days: 3 }),
                        onClick: () => {
                            let date = new Date();
                            date.setTime(date.getTime() - 3 * 86400000);
                            dispatch(markAllRead(null, date));
                        },
                    },
                    {
                        key: "7d",
                        text: intl.get("app.daysAgo", { days: 7 }),
                        onClick: () => {
                            let date = new Date();
                            date.setTime(date.getTime() - 7 * 86400000);
                            dispatch(markAllRead(null, date));
                        },
                    },
                ],
            },
        },
    ];
    return <ContextMenuBase menuItems={menuItems} />;
}

function ContextMenuBase({
    menuItems,
}: Readonly<{ menuItems: IContextualMenuItem[] }>) {
    const { event, position } = useAppSelector(
        (state) => state.app.contextMenu,
    );
    const dispatch = useAppDispatch();

    return (
        <ContextualMenu
            directionalHint={DirectionalHint.bottomLeftEdge}
            items={menuItems}
            target={
                event ||
                (position && {
                    left: position[0],
                    top: position[1],
                })
            }
            onDismiss={() => dispatch(closeContextMenu())}
        />
    );
}
