/**
 * Autosaves have somewhat complicated logic, because it would be really bad
 * if we autosaved over a good save with a bad save. So, we have to put in
 * some very reliable heuristics to figure out if we recently lost some data.
 *
 * This is the purpose of the `integrity` table in the IndexedDB database.
 * Specifically, if we see we had an autosave available, yet the `integrity`
 * is empty, it means that we wiped that table. Since that never happens in
 * the renderer code paths, it's very likely there was a corruption and it
 * was wiped silently by Electron on `IndexedDB.open`. We then can condition
 * on that, and recommend recovery.
 */

import intl from "react-intl-universal";

import { fluentDB, type ItemEntry, type SourceEntry } from "./db";
import { loadFromConfig } from "./settings";

const ONE_DAY = 24 * 60 * 60 * 1000;

export enum AutosaveResponse {
    SUCCESS = 0,
    SKIPPED = 1,
    INTEGRITY_FAILED = 2,
}

export async function handleAutosaves(): Promise<void> {
    const autosaveResp = await renewAutosave();
    if (autosaveResp === AutosaveResponse.INTEGRITY_FAILED) {
        // Dangerous area! Everything in the DB is invalid!
        const title = intl.get("autosave.corruption.title");
        const detail = intl.get("autosave.corruption.detail");
        const buttons = [
            intl.get("autosave.corruption.delete"),
            intl.get("close"),
            intl.get("autosave.corruption.recover"),
        ];
        const response = await window.utils.notifyOfRecoveryNeeded(
            title,
            detail,
            buttons,
        );
        if (response.response === "recovered") {
            // Resets integrity table itself.
            await loadFromConfig(JSON.parse(response.contents));
        } else if (response.response === "deleted") {
            fluentDB.integrity.put({ index: 0, timestamp: new Date() });
        }
    } else {
        fluentDB.integrity.put({ index: 0, timestamp: new Date() });
    }
}

/**
 * Renew the autosave file in userData if it's been long enough.
 */
async function renewAutosave(): Promise<AutosaveResponse> {
    const autosaveMTimeMs = await window.utils.getLastAutosaveTimestamp();
    const integrityVals = await fluentDB.integrity.toArray();
    if (autosaveMTimeMs !== undefined && integrityVals.length === 0) {
        console.error(
            "Prior autosave exists, and current IndexedDB" +
                " integrity check failed. Database is corrupt.",
        );
        return AutosaveResponse.INTEGRITY_FAILED;
    }

    const autosaveStartTime = Date.now();
    if (autosaveStartTime < autosaveMTimeMs + ONE_DAY) {
        console.debug("Autosave still current, not rewriting.");
        return AutosaveResponse.SKIPPED;
    }
    let sources: SourceEntry[];
    let items: ItemEntry[];
    const transaction = fluentDB.transaction(
        "r",
        fluentDB.sources,
        fluentDB.items,
        async () => {
            sources = await fluentDB.sources.toArray();
            items = await fluentDB.items.toArray();
        },
    );
    const output = window.settings.getAll();
    await transaction;
    output["database"] = {
        sources: sources,
        items: items,
    };
    await window.utils.autosaveBackupData(JSON.stringify(output));
    const autosaveEndTime = Date.now();
    console.debug(
        "Completed autosave in " +
            `${Math.round(autosaveEndTime - autosaveStartTime)}ms.`,
    );
    return AutosaveResponse.SUCCESS;
}
