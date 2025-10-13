import intl from "react-intl-universal"
import { IPartialTheme, loadTheme } from "@fluentui/react"

import * as db from "./db"
import locales from "./i18n/_locales"
import { AnimationMotionPref, ThemeSettings } from "../schema-types"
import { SourceTextDirection } from "./models/source"

let lightTheme: IPartialTheme = {
    defaultFontStyle: {
        fontFamily: '"Segoe UI", "Source Han Sans Regular", sans-serif',
    },
}
let darkTheme: IPartialTheme = {
    ...lightTheme,
    palette: {
        neutralLighterAlt: "#282828",
        neutralLighter: "#313131",
        neutralLight: "#3f3f3f",
        neutralQuaternaryAlt: "#484848",
        neutralQuaternary: "#4f4f4f",
        neutralTertiaryAlt: "#6d6d6d",
        neutralTertiary: "#c8c8c8",
        neutralSecondary: "#d0d0d0",
        neutralSecondaryAlt: "#d2d0ce",
        neutralPrimaryAlt: "#dadada",
        neutralPrimary: "#ffffff",
        neutralDark: "#f4f4f4",
        black: "#f8f8f8",
        white: "#1f1f1f",
        themePrimary: "#3a96dd",
        themeLighterAlt: "#020609",
        themeLighter: "#091823",
        themeLight: "#112d43",
        themeTertiary: "#235a85",
        themeSecondary: "#3385c3",
        themeDarkAlt: "#4ba0e1",
        themeDark: "#65aee6",
        themeDarker: "#8ac2ec",
        accent: "#3a96dd",
    },
}

export function setThemeDefaultFont(locale: string) {
    switch (locale) {
        case "zh-CN":
            lightTheme.defaultFontStyle.fontFamily =
                '"Segoe UI", "Source Han Sans SC Regular", "Microsoft YaHei", sans-serif'
            break
        case "zh-TW":
            lightTheme.defaultFontStyle.fontFamily =
                '"Segoe UI", "Source Han Sans TC Regular", "Microsoft JhengHei", sans-serif'
            break
        case "ja":
            lightTheme.defaultFontStyle.fontFamily =
                '"Segoe UI", "Source Han Sans JP Regular", "Yu Gothic UI", sans-serif'
            break
        case "ko":
            lightTheme.defaultFontStyle.fontFamily =
                '"Segoe UI", "Source Han Sans KR Regular", "Malgun Gothic", sans-serif'
            break
        default:
            lightTheme.defaultFontStyle.fontFamily =
                '"Segoe UI", "Source Han Sans Regular", sans-serif'
    }
    darkTheme.defaultFontStyle.fontFamily =
        lightTheme.defaultFontStyle.fontFamily
    applyThemeSettings()
}
export function setThemeSettings(theme: ThemeSettings) {
    window.settings.setThemeSettings(theme)
    applyThemeSettings()
}
export function getThemeSettings(): ThemeSettings {
    return window.settings.getThemeSettings()
}
export function applyThemeSettings() {
    loadTheme(window.settings.shouldUseDarkColors() ? darkTheme : lightTheme)
}
window.settings.addThemeUpdateListener(shouldDark => {
    loadTheme(shouldDark ? darkTheme : lightTheme)
})


export function getAnimationMotionPref(): AnimationMotionPref {
    return window.settings.getAnimationMotionPref()
}
export function setAnimationMotionPref(pref: AnimationMotionPref) {
    window.settings.setAnimationMotionPref(pref)
    applyAnimationMotionPref()
}
export function applyAnimationMotionPref() {
    const pref = getAnimationMotionPref()
    let realisedPref = pref
    if (pref === AnimationMotionPref.System) {
        const animationSettings =
            window.utils.systemPreferencesGetAnimationSettings()
        if (animationSettings.prefersReducedMotion) {
            // Based on existing Apple Guidelines, this best matches "Off".
            // See:
            // https://developer.apple.com/design/human-interface-guidelines/accessibility#Cognitive
            realisedPref = AnimationMotionPref.Off
        } else {
            realisedPref = AnimationMotionPref.On
        }
    }

    resetInjectedTransitionCSS()
    switch (realisedPref) {
        case AnimationMotionPref.Off:
            injectNoTransitionCSS();
            break;
        case AnimationMotionPref.Reduced:
            injectReducedTransitionCSS();
            break;
        case AnimationMotionPref.On:
        default:
            break;
    }
}

function injectReducedTransitionCSS() {
    const styleElem = document.createElement("style")
    // This might be a bit too broad, but we can change this later.
    styleElem.textContent = `
    * {
        /* Injected to disable animations for accessibility */
        transition: none !important;
    }
    `
    styleElem.id = "animation-motion-pref"
    document.head.append(styleElem)
}
function injectNoTransitionCSS() {
    const styleElem = document.createElement("style")
    styleElem.textContent = `
    * {
        /* Injected to disable animations for accessibility */
        transition: none !important;
        animation-name: none !important;
    }
    `
    styleElem.id = "animation-motion-pref"
    document.head.append(styleElem)
}
function resetInjectedTransitionCSS() {
    const injectedCSS = document.querySelector("#animation-motion-pref")
    if (!injectedCSS) {
        return
    }
    injectedCSS.remove()
}

export function getCurrentLocale() {
    let locale = window.settings.getCurrentLocale()
    if (locale in locales) return locale
    locale = locale.split("-")[0]
    return locale in locales ? locale : "en-US"
}

export async function exportAll() {
    const filters = [{ name: intl.get("app.frData"), extensions: ["frdata"] }]
    const write = await window.utils.showSaveDialog(
        filters,
        "*/Fluent_Reader_Backup.frdata",
    )
    if (write) {
        let output = window.settings.getAll()
        output["database"] = {
            sources: await db.fluentDB.sources.toArray(),
            items: await db.fluentDB.items.toArray(),
        }
        write(JSON.stringify(output), intl.get("settings.writeError"))
    }
}

export async function importAll() {
    const filters = [{ name: intl.get("app.frData"), extensions: ["frdata"] }]
    let data = await window.utils.showOpenDialog(filters)
    if (!data) return true
    let confirmed = await window.utils.showMessageBox(
        intl.get("app.restore"),
        intl.get("app.confirmImport"),
        intl.get("confirm"),
        intl.get("cancel"),
        true,
        "warning",
    )
    if (!confirmed) return true
    let configs = JSON.parse(data)
    await db.fluentDB.sources.clear()
    await db.fluentDB.items.clear()
    configs.database.sources.forEach(s => {
        s.lastFetched = new Date(s.lastFetched)
        if (!s.textDir) s.textDir = SourceTextDirection.LTR
        if (!s.hidden) s.hidden = false
        return db.fluentDB.sources.add(s)
    })
    configs.database.items.forEach(i => {
        i.date = new Date(i.date)
        i.fetchedDate = new Date(i.fetchedDate)
    })
    await db.fluentDB.items.bulkAdd(configs.database.items);
    delete configs.database
    window.settings.setAll(configs)
    return false
}
