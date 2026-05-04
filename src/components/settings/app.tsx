import * as React from "react";
import * as db from "../../scripts/db";
import intl from "react-intl-universal";
import { urlTest, byteToMB, getSearchEngineName } from "../../scripts/utils";
import {
    RootState,
    useAppDispatch,
    useAppSelector,
} from "../../scripts/reducer";
import {
    AnimationMotionPref,
    ThemeSettings,
    SearchEngines,
    SourceOpenTarget,
    ThumbnailTypePref,
} from "../../schema-types";
import {
    getThemeSettings,
    setThemeSettings,
    getAnimationMotionPref,
    setAnimationMotionPref,
    setDefaultOpenTargetPref,
    getNativeWindowFramePref,
    setNativeWindowFramePref,
    exportAll,
    getThumbnailTypePref,
    setThumbnailTypePref,
} from "../../scripts/settings";
import { SET_DEFAULT_OPEN_TARGET } from "../../scripts/models/app";
import {
    ChoiceGroup,
    DefaultButton,
    Dropdown,
    IChoiceGroupOption,
    IDropdownOption,
    Label,
    PrimaryButton,
    Stack,
    TextField,
    Toggle,
} from "@fluentui/react";
import DangerButton from "../utils/danger-button";

type AppTabProps = {
    setLanguage: (option: string) => void;
    setFetchInterval: (interval: number) => void;
    deleteArticles: (days: number) => Promise<void>;
    importAll: () => Promise<void>;
};

async function getCacheSize() {
    const size = await window.utils.getCacheSize();
    return byteToMB(size);
}
async function getItemSize() {
    const size = await db.calculateItemSize();
    return byteToMB(size);
}

function useDefaultOpenTarget(state: RootState) {
    return state.app.defaultOpenTarget;
}

export default function AppTab(props: AppTabProps): React.JSX.Element {
    const dispatch = useAppDispatch();

    const [themeSettingState, setThemeSettingState] =
        React.useState(getThemeSettings());
    const [itemSizeLabel, setItemSizeLabel] = React.useState<string | null>(
        null,
    );
    const [cacheSizeLabel, setCacheSizeLabel] = React.useState<string | null>(
        null,
    );
    const [deleteIndex, setDeleteIndex] = React.useState<string | null>(null);
    const defaultOpenTarget = useAppSelector(useDefaultOpenTarget);

    React.useEffect(() => {
        getItemSize().then((sizeLabel) => setItemSizeLabel(sizeLabel));
        getCacheSize().then((sizeLabel) => setCacheSizeLabel(sizeLabel));
    }, []);

    const clearCache = async () => {
        return window.utils
            .clearCache()
            .then(getCacheSize)
            .then((sizeLabel) => setCacheSizeLabel(sizeLabel));
    };

    const themeChoices = (): IChoiceGroupOption[] => [
        { key: ThemeSettings.Default, text: intl.get("followSystem") },
        { key: ThemeSettings.Light, text: intl.get("app.lightTheme") },
        { key: ThemeSettings.Dark, text: intl.get("app.darkTheme") },
    ];

    const fetchIntervalOptions = (): IDropdownOption[] => [
        { key: 0, text: intl.get("app.never") },
        { key: 10, text: intl.get("time.minute", { m: 10 }) },
        { key: 15, text: intl.get("time.minute", { m: 15 }) },
        { key: 20, text: intl.get("time.minute", { m: 20 }) },
        { key: 30, text: intl.get("time.minute", { m: 30 }) },
        { key: 45, text: intl.get("time.minute", { m: 45 }) },
        { key: 60, text: intl.get("time.hour", { h: 1 }) },
    ];
    const onFetchIntervalChanged = (item: IDropdownOption) => {
        props.setFetchInterval(item.key as number);
    };

    const searchEngineOptions = (): IDropdownOption[] =>
        [
            SearchEngines.Google,
            SearchEngines.Bing,
            SearchEngines.Baidu,
            SearchEngines.DuckDuckGo,
            SearchEngines.Startpage,
        ].map((engine) => ({
            key: engine,
            text: getSearchEngineName(engine),
        }));
    const onSearchEngineChanged = (item: IDropdownOption) => {
        window.settings.setSearchEngine(item.key as number);
    };

    const deleteOptions = (): IDropdownOption[] => [
        { key: "7", text: intl.get("app.daysAgo", { days: 7 }) },
        { key: "14", text: intl.get("app.daysAgo", { days: 14 }) },
        { key: "21", text: intl.get("app.daysAgo", { days: 21 }) },
        { key: "28", text: intl.get("app.daysAgo", { days: 28 }) },
        { key: "0", text: intl.get("app.deleteAll") },
    ];

    const deleteChange = (_: any, item: IDropdownOption) => {
        setDeleteIndex(item ? String(item.key) : null);
    };

    const confirmDelete = async () => {
        setItemSizeLabel(null);
        return props
            .deleteArticles(parseInt(deleteIndex))
            .then(getItemSize)
            .then((sizeLabel) => setItemSizeLabel(sizeLabel));
    };

    const languageOptions = (): IDropdownOption[] => [
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
    ];

    const onThemeChange = (_: any, option: IChoiceGroupOption) => {
        setThemeSettings(option.key as ThemeSettings);
        setThemeSettingState(option.key as ThemeSettings);
    };

    const defaultOpenTargetOptions = [
        { key: SourceOpenTarget.Local, text: intl.get("sources.rssText") },
        {
            key: SourceOpenTarget.FullContent,
            text: intl.get("article.loadFull"),
        },
        {
            key: SourceOpenTarget.Webpage,
            text: intl.get("sources.loadWebpage"),
        },
        { key: SourceOpenTarget.External, text: intl.get("openExternal") },
    ];

    const onDefaultOpenTargetChange = (_: any, option: IDropdownOption) => {
        const optionKey = option.key as SourceOpenTarget;
        setDefaultOpenTargetPref(optionKey);
        dispatch({ type: SET_DEFAULT_OPEN_TARGET, value: optionKey });
    };

    return (
        <div className="tab-body">
            <Label>{intl.get("app.language")}</Label>
            <Stack horizontal>
                <Stack.Item>
                    <Dropdown
                        defaultSelectedKey={window.settings.getLocaleSettings()}
                        options={languageOptions()}
                        onChanged={(option) =>
                            props.setLanguage(String(option.key))
                        }
                        style={{ width: 200 }}
                    />
                </Stack.Item>
            </Stack>

            <ChoiceGroup
                label={intl.get("app.theme")}
                options={themeChoices()}
                onChange={onThemeChange}
                selectedKey={themeSettingState}
            />
            <AnimationPreferences />
            <ThumbnailTypePreferences />
            <NativeWindowFramePreference />
            <Label>{intl.get("app.defaultOpenTarget")}</Label>
            <Stack horizontal>
                <Stack.Item>
                    <Dropdown
                        defaultSelectedKey={defaultOpenTarget}
                        options={defaultOpenTargetOptions}
                        onChange={onDefaultOpenTargetChange}
                        style={{ width: 200 }}
                    />
                </Stack.Item>
            </Stack>
            <Label>{intl.get("app.fetchInterval")}</Label>
            <Stack horizontal>
                <Stack.Item>
                    <Dropdown
                        defaultSelectedKey={window.settings.getFetchInterval()}
                        options={fetchIntervalOptions()}
                        onChanged={onFetchIntervalChanged}
                        style={{ width: 200 }}
                    />
                </Stack.Item>
            </Stack>

            <Label>{intl.get("searchEngine.name")}</Label>
            <Stack horizontal>
                <Stack.Item>
                    <Dropdown
                        defaultSelectedKey={window.settings.getSearchEngine()}
                        options={searchEngineOptions()}
                        onChanged={onSearchEngineChanged}
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
                        options={deleteOptions()}
                        selectedKey={deleteIndex}
                        onChange={deleteChange}
                    />
                </Stack.Item>
                <Stack.Item>
                    <DangerButton
                        disabled={
                            itemSizeLabel === null || deleteIndex === null
                        }
                        text={intl.get("app.confirmDelete")}
                        onClick={confirmDelete}
                    />
                </Stack.Item>
            </Stack>
            <span className="settings-hint up">
                {itemSizeLabel
                    ? intl.get("app.itemSize", { size: itemSizeLabel })
                    : intl.get("app.calculatingSize")}
            </span>
            <Stack horizontal>
                <Stack.Item>
                    <DefaultButton
                        text={intl.get("app.cache")}
                        disabled={
                            cacheSizeLabel === null || cacheSizeLabel === "0MB"
                        }
                        onClick={clearCache}
                    />
                </Stack.Item>
            </Stack>
            <span className="settings-hint up">
                {cacheSizeLabel
                    ? intl.get("app.cacheSize", { size: cacheSizeLabel })
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
                        onClick={props.importAll}
                        text={intl.get("app.restore")}
                    />
                </Stack.Item>
            </Stack>
        </div>
    );
}

/**
 * PacSettings React component
 */
function PacSettings() {
    const [pacStatus, setPacStatus] = React.useState(
        window.settings.getProxyStatus(),
    );
    const [pacUrl, setPacUrl] = React.useState(window.settings.getProxy());

    const toggleStatus = () => {
        window.settings.toggleProxyStatus();
        setPacStatus(window.settings.getProxyStatus());
        setPacUrl(window.settings.getProxy());
    };

    const handlePacUrlChange = (
        event: React.FormEvent<HTMLTextAreaElement>,
    ) => {
        setPacUrl((event.target as HTMLTextAreaElement).value.trim());
    };

    const setUrl = (event: React.FormEvent) => {
        event.preventDefault();
        if (urlTest(pacUrl)) {
            window.settings.setProxy(pacUrl);
        }
    };

    let form = null;
    if (pacStatus) {
        form = (
            <form onSubmit={setUrl}>
                <Stack horizontal>
                    <Stack.Item grow>
                        <TextField
                            required
                            onGetErrorMessage={(v) =>
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
        );
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
    );
}

/**
 * React component for animation preference dropdown.
 */
function AnimationPreferences(): React.JSX.Element {
    const [animationProp, setAnimationProp] = React.useState(
        getAnimationMotionPref(),
    );
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
    ];
    const prefChange = (_: any, item: IDropdownOption) => {
        setAnimationMotionPref(item.key as AnimationMotionPref);
        setAnimationProp(item.key as AnimationMotionPref);
    };

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
    );
}

/**
 * React component for animation preference dropdown.
 */
function NativeWindowFramePreference(): React.JSX.Element {
    const [windowFrameProp, setWindowFrameProp] = React.useState(
        getNativeWindowFramePref(),
    );
    const prefChange = (_: any, state: boolean) => {
        setNativeWindowFramePref(state);
        setWindowFrameProp(state);
    };
    return (
        <>
            <Stack horizontal>
                <Stack.Item grow>
                    <Label>{intl.get("app.nativeWindowFrame")}</Label>
                </Stack.Item>
                <Stack.Item>
                    <Toggle checked={windowFrameProp} onChange={prefChange} />
                </Stack.Item>
            </Stack>
            <span className="settings-hint up">
                {intl.get("app.nativeWindowFrameNote")}
            </span>
        </>
    );
}

function ThumbnailTypePreferences() {
    const [thumbnailType, setThumbnailType] = React.useState(
        getThumbnailTypePref(),
    );
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
    ];
    const prefChange = (_: any, item: IDropdownOption) => {
        setThumbnailTypePref(item.key as ThumbnailTypePref);
        setThumbnailType(item.key as ThumbnailTypePref);
    };

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
    );
}
