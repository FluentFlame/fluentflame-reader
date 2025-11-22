import * as React from "react";
import intl from "react-intl-universal";
import { Icon } from "@fluentui/react/lib/Icon";
import { AnimationClassNames } from "@fluentui/react/lib/Styling";
import AboutTab from "./settings/about";
import {
    Nav,
    Spinner,
    FocusTrapZone,
    INavLinkGroup,
    INavLink,
} from "@fluentui/react";
import SourcesTabContainer from "../containers/settings/sources-container";
import GroupsTabContainer from "../containers/settings/groups-container";
import AppTabContainer from "../containers/settings/app-container";
import RulesTabContainer from "../containers/settings/rules-container";
import ServiceTabContainer from "../containers/settings/service-container";
import { initTouchBarWithTexts } from "../scripts/utils";

type SettingsProps = {
    display: boolean;
    currentTab: string | null;
    blocked: boolean;
    exitting: boolean;
    close: () => void;
    setTab: (newTab: string | null) => void;
};

const INITIAL_PANEL: string = "app";

export default function Settings(props: SettingsProps): React.JSX.Element {
    const getCurrentTab = () => props.currentTab ?? INITIAL_PANEL;

    const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape" && !props.exitting) {
            props.close();
        }
    };

    React.useEffect(() => {
        if (props.display) {
            if (window.utils.platform === "darwin")
                window.utils.destroyTouchBar();
            document.body.addEventListener("keydown", onKeyDown);
        } else {
            if (window.utils.platform === "darwin") initTouchBarWithTexts();
            document.body.removeEventListener("keydown", onKeyDown);
        }
    }, [props.display]);

    const onLinkClick = (
        _ev: React.MouseEvent<HTMLElement>,
        item: INavLink,
    ) => {
        props.setTab(item.key);
    };

    return (
        props.display && (
            <div className="settings-container">
                <div className={"settings " + AnimationClassNames.slideUpIn20}>
                    <div className="btn-group">
                        <a
                            className={
                                "btn" + (props.exitting ? " disabled" : "")
                            }
                            title={intl.get("settings.exit")}
                            onClick={props.close}>
                            <Icon iconName="Back" />
                        </a>
                    </div>
                    {props.blocked && (
                        <FocusTrapZone
                            isClickableOutsideFocusTrap={true}
                            className="loading">
                            <Spinner
                                label={intl.get("settings.fetching")}
                                tabIndex={0}
                            />
                        </FocusTrapZone>
                    )}
                    <div className="settings-inner-container">
                        <Nav
                            initialSelectedKey={getCurrentTab()}
                            className="settings-nav"
                            groups={makeNavLinkGroups()}
                            onLinkClick={onLinkClick}
                        />
                        <div className="settings-panel">
                            {renderSettingsPanel(getCurrentTab())}
                        </div>
                    </div>
                </div>
            </div>
        )
    );
}

function renderSettingsPanel(currentPanel: string): React.JSX.Element {
    switch (currentPanel) {
        case "app":
            return <AppTabContainer />;
        case "sources":
            return <SourcesTabContainer />;
        case "grouping":
            return <GroupsTabContainer />;
        case "rules":
            return <RulesTabContainer />;
        case "service":
            return <ServiceTabContainer />;
        case "about":
            return <AboutTab />;
    }
    return (
        <p>
            An error has occurred displaying this tab. This should never happen.
        </p>
    );
}

function makeNavLinkGroups(): INavLinkGroup[] {
    return [
        {
            links: [
                {
                    name: intl.get("settings.app"),
                    url: ".",
                    isExpanded: true,
                    target: "_blank",
                    key: "app",
                    icon: "Settings",
                },
                {
                    name: intl.get("settings.sources"),
                    url: ".",
                    isExpanded: true,
                    target: "_blank",
                    key: "sources",
                    icon: "Source",
                },
                {
                    name: intl.get("settings.grouping"),
                    url: ".",
                    isExpanded: true,
                    target: "_blank",
                    key: "grouping",
                    icon: "GroupList",
                },
                {
                    name: intl.get("settings.rules"),
                    url: ".",
                    isExpanded: true,
                    target: "_blank",
                    key: "rules",
                    icon: "FilterSettings",
                },
                {
                    name: intl.get("settings.service"),
                    url: ".",
                    isExpanded: true,
                    target: "_blank",
                    key: "service",
                    icon: "CloudImportExport",
                },
                {
                    name: intl.get("settings.about"),
                    url: ".",
                    isExpanded: true,
                    target: "_blank",
                    key: "about",
                    icon: "Info",
                },
            ],
        },
    ];
}
