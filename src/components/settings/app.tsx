import * as React from "react"
import * as db from "../../scripts/db"
import intl from "react-intl-universal"
import { urlTest, byteToMB, getSearchEngineName } from "../../scripts/utils"
import {
    AnimationMotionPref,
    ThemeSettings,
    SearchEngines,
    ThumbnailTypePref,
} from "../../schema-types"
import {
    getThemeSettings,
    setThemeSettings,
    getAnimationMotionPref,
    setAnimationMotionPref,
    exportAll,
    getThumbnailTypePref,
    setThumbnailTypePref,
} from "../../scripts/settings"
import {
    Stack,
    Label,
    Toggle,
    TextField,
    DefaultButton,
    ChoiceGroup,
    IChoiceGroupOption,
    Dropdown,
    IDropdownOption,
    PrimaryButton,
} from "@fluentui/react"
import DangerButton from "../utils/danger-button"

type AppTabProps = {
    setLanguage: (option: string) => void
    setFetchInterval: (interval: number) => void
    deleteArticles: (days: number) => Promise<void>
    importAll: () => Promise<void>
}

type AppTabState = {
    pacStatus: boolean
    pacUrl: string
    themeSettings: ThemeSettings
    itemSize: string
    cacheSize: string
    deleteIndex: string
}

class AppTab extends React.Component<AppTabProps, AppTabState> {
    constructor(props: AppTabProps) {
        super(props)
        this.state = {
            pacStatus: window.settings.getProxyStatus(),
            pacUrl: window.settings.getProxy(),
            themeSettings: getThemeSettings(),
            itemSize: null,
            cacheSize: null,
            deleteIndex: null,
        }
        this.getItemSize()
        this.getCacheSize()
    }

    getCacheSize = () => {
        window.utils.getCacheSize().then(size => {
            this.setState({ cacheSize: byteToMB(size) })
        })
    }
    getItemSize = () => {
        db.calculateItemSize().then((size: number) => {
            this.setState({ itemSize: byteToMB(size) })
        })
    }

    clearCache = () => {
        window.utils.clearCache().then(() => {
            this.getCacheSize()
        })
    }

    themeChoices = (): IChoiceGroupOption[] => [
        { key: ThemeSettings.Default, text: intl.get("followSystem") },
        { key: ThemeSettings.Light, text: intl.get("app.lightTheme") },
        { key: ThemeSettings.Dark, text: intl.get("app.darkTheme") },
    ]

    fetchIntervalOptions = (): IDropdownOption[] => [
        { key: 0, text: intl.get("app.never") },
        { key: 10, text: intl.get("time.minute", { m: 10 }) },
        { key: 15, text: intl.get("time.minute", { m: 15 }) },
        { key: 20, text: intl.get("time.minute", { m: 20 }) },
        { key: 30, text: intl.get("time.minute", { m: 30 }) },
        { key: 45, text: intl.get("time.minute", { m: 45 }) },
        { key: 60, text: intl.get("time.hour", { h: 1 }) },
    ]
    onFetchIntervalChanged = (item: IDropdownOption) => {
        this.props.setFetchInterval(item.key as number)
    }

    searchEngineOptions = (): IDropdownOption[] =>
        [
            SearchEngines.Google,
            SearchEngines.Bing,
            SearchEngines.Baidu,
            SearchEngines.DuckDuckGo,
            SearchEngines.Startpage,
        ].map(engine => ({
            key: engine,
            text: getSearchEngineName(engine),
        }))
    onSearchEngineChanged = (item: IDropdownOption) => {
        window.settings.setSearchEngine(item.key as number)
    }

    deleteOptions = (): IDropdownOption[] => [
        { key: "7", text: intl.get("app.daysAgo", { days: 7 }) },
        { key: "14", text: intl.get("app.daysAgo", { days: 14 }) },
        { key: "21", text: intl.get("app.daysAgo", { days: 21 }) },
        { key: "28", text: intl.get("app.daysAgo", { days: 28 }) },
        { key: "0", text: intl.get("app.deleteAll") },
    ]

    deleteChange = (_, item: IDropdownOption) => {
        this.setState({ deleteIndex: item ? String(item.key) : null })
    }

    confirmDelete = () => {
        this.setState({ itemSize: null })
        this.props
            .deleteArticles(parseInt(this.state.deleteIndex))
            .then(() => this.getItemSize())
    }

    languageOptions = (): IDropdownOption[] => [
        { key: "default", text: intl.get("followSystem") },
        { key: "de", text: "Deutsch" },
        { key: "en-US", text: "English" },
        { key: "es", text: "Español" },
        { key: "cs", text: "Čeština" },
        { key: "fr-FR", text: "Français" },
        { key: "it", text: "Italiano" },
        { key: "nl", text: "Nederlands" },
        { key: "pt-BR", text: "Português do Brasil" },
        { key: "pt-PT", text: "Português de Portugal" },
        { key: "fi-FI", text: "Suomi" },
        { key: "sv", text: "Svenska" },
        { key: "tr", text: "Türkçe" },
        { key: "uk", text: "Українська" },
        { key: "ru", text: "Русский" },
        { key: "ko", text: "한글" },
        { key: "ja", text: "日本語" },
        { key: "zh-CN", text: "中文（简体）" },
        { key: "zh-TW", text: "中文（繁體）" },
    ]

    onThemeChange = (_, option: IChoiceGroupOption) => {
        setThemeSettings(option.key as ThemeSettings)
        this.setState({ themeSettings: option.key as ThemeSettings })
    }

    render = () => (
        <div className="tab-body">
            <Label>{intl.get("app.language")}</Label>
            <Stack horizontal>
                <Stack.Item>
                    <Dropdown
                        defaultSelectedKey={window.settings.getLocaleSettings()}
                        options={this.languageOptions()}
                        onChanged={option =>
                            this.props.setLanguage(String(option.key))
                        }
                        style={{ width: 200 }}
                    />
                </Stack.Item>
            </Stack>

            <ChoiceGroup
                label={intl.get("app.theme")}
                options={this.themeChoices()}
                onChange={this.onThemeChange}
                selectedKey={this.state.themeSettings}
            />
            <AnimationPreferences />
            <ThumbnailTypePreferences />
            <Label>{intl.get("app.fetchInterval")}</Label>
            <Stack horizontal>
                <Stack.Item>
                    <Dropdown
                        defaultSelectedKey={window.settings.getFetchInterval()}
                        options={this.fetchIntervalOptions()}
                        onChanged={this.onFetchIntervalChanged}
                        style={{ width: 200 }}
                    />
                </Stack.Item>
            </Stack>

            <Label>{intl.get("searchEngine.name")}</Label>
            <Stack horizontal>
                <Stack.Item>
                    <Dropdown
                        defaultSelectedKey={window.settings.getSearchEngine()}
                        options={this.searchEngineOptions()}
                        onChanged={this.onSearchEngineChanged}
                        style={{ width: 200 }}
                    />
                </Stack.Item>
            </Stack>
            <PacSettings />
            <Label>{intl.get("app.cleanup")}</Label>
            <Stack horizontal>
                <Stack.Item grow>
                    <Dropdown
                        placeholder={intl.get("app.deleteChoices")}
                        options={this.deleteOptions()}
                        selectedKey={this.state.deleteIndex}
                        onChange={this.deleteChange}
                    />
                </Stack.Item>
                <Stack.Item>
                    <DangerButton
                        disabled={
                            this.state.itemSize === null ||
                            this.state.deleteIndex === null
                        }
                        text={intl.get("app.confirmDelete")}
                        onClick={this.confirmDelete}
                    />
                </Stack.Item>
            </Stack>
            <span className="settings-hint up">
                {this.state.itemSize
                    ? intl.get("app.itemSize", { size: this.state.itemSize })
                    : intl.get("app.calculatingSize")}
            </span>
            <Stack horizontal>
                <Stack.Item>
                    <DefaultButton
                        text={intl.get("app.cache")}
                        disabled={
                            this.state.cacheSize === null ||
                            this.state.cacheSize === "0MB"
                        }
                        onClick={this.clearCache}
                    />
                </Stack.Item>
            </Stack>
            <span className="settings-hint up">
                {this.state.cacheSize
                    ? intl.get("app.cacheSize", { size: this.state.cacheSize })
                    : intl.get("app.calculatingSize")}
            </span>

            <Label>{intl.get("app.data")}</Label>
            <Stack horizontal>
                <Stack.Item>
                    <PrimaryButton
                        onClick={exportAll}
                        text={intl.get("app.backup")}
                    />
                </Stack.Item>
                <Stack.Item>
                    <DefaultButton
                        onClick={this.props.importAll}
                        text={intl.get("app.restore")}
                    />
                </Stack.Item>
            </Stack>
        </div>
    )
}

/**
 * PacSettings React component
 */
function PacSettings() {
    const [pacStatus, setPacStatus] = React.useState(
        window.settings.getProxyStatus(),
    )
    const [pacUrl, setPacUrl] = React.useState(window.settings.getProxy())

    const toggleStatus = () => {
        window.settings.toggleProxyStatus()
        setPacStatus(window.settings.getProxyStatus())
        setPacUrl(window.settings.getProxy())
    }

    const handlePacUrlChange = (
        event: React.FormEvent<HTMLTextAreaElement>,
    ) => {
        setPacUrl((event.target as HTMLTextAreaElement).value.trim())
    }

    const setUrl = (event: React.FormEvent) => {
        event.preventDefault()
        if (urlTest(pacUrl)) {
            window.settings.setProxy(pacUrl)
        }
    }

    let form = null
    if (pacStatus) {
        form = (
            <form onSubmit={setUrl}>
                <Stack horizontal>
                    <Stack.Item grow>
                        <TextField
                            required
                            onGetErrorMessage={v =>
                                urlTest(v.trim()) ? "" : intl.get("app.badUrl")
                            }
                            placeholder={intl.get("app.pac")}
                            name="pacUrl"
                            onChange={handlePacUrlChange}
                            value={pacUrl}
                        />
                    </Stack.Item>
                    <Stack.Item>
                        <DefaultButton
                            disabled={!urlTest(pacUrl)}
                            type="sumbit"
                            text={intl.get("app.setPac")}
                        />
                    </Stack.Item>
                </Stack>
                <span className="settings-hint up">
                    {intl.get("app.pacHint")}
                </span>
            </form>
        )
    }
    return (
        <>
            <Stack horizontal verticalAlign="baseline">
                <Stack.Item grow>
                    <Label>{intl.get("app.enableProxy")}</Label>
                </Stack.Item>
                <Stack.Item>
                    <Toggle checked={pacStatus} onChange={toggleStatus} />
                </Stack.Item>
            </Stack>
            {form}
        </>
    )
}

/**
 * React component for animation preference dropdown.
 */
function AnimationPreferences() {
    const [animationProp, setAnimationProp] = React.useState(
        getAnimationMotionPref(),
    )
    const preferenceOptions: IDropdownOption[] = [
        {
            key: AnimationMotionPref.System,
            text: intl.get("followSystem").d("Follow system"),
        },
        {
            key: AnimationMotionPref.On,
            text: intl.get("app.animationsOn").d("Animations on"),
        },
        {
            key: AnimationMotionPref.Reduced,
            text: intl.get("app.reducedAnimations").d("Reduce animations"),
        },
        {
            key: AnimationMotionPref.Off,
            text: intl.get("app.animationsOff").d("Animations off"),
        },
    ]
    const prefChange = (_: any, item: IDropdownOption) => {
        setAnimationMotionPref(item.key as AnimationMotionPref)
        setAnimationProp(item.key as AnimationMotionPref)
    }

    return (
        <>
            <Label>
                {intl.get("app.animationsLabel").d("Animations settings")}
            </Label>
            <Stack horizontal>
                <Stack.Item>
                    <Dropdown
                        options={preferenceOptions}
                        selectedKey={animationProp}
                        onChange={prefChange}
                        style={{ width: 200 }}
                    />
                </Stack.Item>
            </Stack>
        </>
    )
}

function ThumbnailTypePreferences() {
    const [thumbnailType, setThumbnailType] = React.useState(
        getThumbnailTypePref(),
    )
    const preferenceOptions: IDropdownOption[] = [
        {
            key: ThumbnailTypePref.OpenGraph,
            text: intl.get("app.thumbnails.opengraph").d("OpenGraph"),
        },
        {
            key: ThumbnailTypePref.MediaThumbnail,
            text: intl
                .get("app.thumbnails.mediaThumbnail")
                .d("RSS media:thumbnail"),
        },
        {
            key: ThumbnailTypePref.Thumb,
            text: intl.get("app.thumbnails.thumb").d("RSS thumb"),
        },
        {
            key: ThumbnailTypePref.Other,
            text: intl.get("app.thumbnails.other").d("Any other thumbnail"),
        },
    ]
    const prefChange = (_: any, item: IDropdownOption) => {
        setThumbnailTypePref(item.key as ThumbnailTypePref)
        setThumbnailType(item.key as ThumbnailTypePref)
    }

    return (
        <>
            <Label>
                {intl
                    .get("app.thumbnails.prefLabel")
                    .d("Preferred thumbnail source")}
            </Label>
            <Stack horizontal>
                <Stack.Item>
                    <Dropdown
                        options={preferenceOptions}
                        selectedKey={thumbnailType}
                        onChange={prefChange}
                        style={{ width: 200 }}
                    />
                </Stack.Item>
            </Stack>
        </>
    )
}

export default AppTab
