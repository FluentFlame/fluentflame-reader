import * as React from "react"
import intl from "react-intl-universal"
import { Icon } from "@fluentui/react/lib/Icon"
import { AnimationClassNames } from "@fluentui/react/lib/Styling"
import AboutTab from "./settings/about"
import {
    Nav,
    PivotItem,
    Spinner,
    FocusTrapZone,
    INavLinkGroup,
    INavLink,
} from "@fluentui/react"
import SourcesTabContainer from "../containers/settings/sources-container"
import GroupsTabContainer from "../containers/settings/groups-container"
import AppTabContainer from "../containers/settings/app-container"
import RulesTabContainer from "../containers/settings/rules-container"
import ServiceTabContainer from "../containers/settings/service-container"
import { initTouchBarWithTexts } from "../scripts/utils"

type SettingsProps = {
    display: boolean
    blocked: boolean
    exitting: boolean
    close: () => void
}

type SettingsState = {
    currentPanel: string
}

const INITIAL_PANEL: string = "key-settings.app"

class Settings extends React.Component<SettingsProps, SettingsState> {
    constructor(props) {
        super(props)

        // This should probably be managed by Redux dispatchers,
        // but for now, let's use standard React state.
        this.state = {
            currentPanel: INITIAL_PANEL,
        }
    }

    onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape" && !this.props.exitting) this.props.close()
    }

    componentDidUpdate = (prevProps: SettingsProps) => {
        if (this.props.display !== prevProps.display) {
            if (this.props.display) {
                if (window.utils.platform === "darwin")
                    window.utils.destroyTouchBar()
                document.body.addEventListener("keydown", this.onKeyDown)
            } else {
                if (window.utils.platform === "darwin") initTouchBarWithTexts()
                document.body.removeEventListener("keydown", this.onKeyDown)
            }
        }
    }

    renderSettingsPanel = () => {
        switch (this.state.currentPanel) {
            case "key-settings.app":
                return <AppTabContainer />
            case "key-settings.sources":
                return <SourcesTabContainer />
            case "key-settings.grouping":
                return <GroupsTabContainer />
            case "key-settings.rules":
                return <RulesTabContainer />
            case "key-settings.service":
                return <ServiceTabContainer />
            case "key-settings.about":
                return <AboutTab />
        }
        return (
            <p>
                An error has occurred displaying this tab. This should never
                happen.
            </p>
        )
    }

    onLinkClick = (_ev: React.MouseEvent<HTMLElement>, item: INavLink) => {
        this.setState({ currentPanel: item.key })
    }

    render = () =>
        this.props.display && (
            <div className="settings-container">
                <div className={"settings " + AnimationClassNames.slideUpIn20}>
                    <div className="btn-group">
                        <a
                            className={
                                "btn" + (this.props.exitting ? " disabled" : "")
                            }
                            title={intl.get("settings.exit")}
                            onClick={this.props.close}>
                            <Icon iconName="Back" />
                        </a>
                    </div>
                    {this.props.blocked && (
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
                            initialSelectedKey={INITIAL_PANEL}
                            className="settings-nav"
                            groups={makeNavLinkGroups()}
                            onLinkClick={this.onLinkClick}
                        />
                        <div className="settings-panel">
                            {this.renderSettingsPanel()}
                        </div>
                    </div>
                </div>
            </div>
        )
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
                    key: "key-settings.app",
                    icon: "Settings",
                },
                {
                    name: intl.get("settings.sources"),
                    url: ".",
                    isExpanded: true,
                    target: "_blank",
                    key: "key-settings.sources",
                    icon: "Source",
                },
                {
                    name: intl.get("settings.grouping"),
                    url: ".",
                    isExpanded: true,
                    target: "_blank",
                    key: "key-settings.grouping",
                    icon: "GroupList",
                },
                {
                    name: intl.get("settings.rules"),
                    url: ".",
                    isExpanded: true,
                    target: "_blank",
                    key: "key-settings.rules",
                    icon: "FilterSettings",
                },
                {
                    name: intl.get("settings.service"),
                    url: ".",
                    isExpanded: true,
                    target: "_blank",
                    key: "key-settings.service",
                    icon: "CloudImportExport",
                },
                {
                    name: intl.get("settings.about"),
                    url: ".",
                    isExpanded: true,
                    target: "_blank",
                    key: "key-settings.about",
                    icon: "Info",
                },
            ],
        },
    ]
}

export default Settings
