import Store from "electron-store";
import { SchemaTypes } from "../schema-types";
import pkg from "../../package.json";
import { existsSync, renameSync } from "fs";

export function performUpdate(store: Store<SchemaTypes>) {
    let curVersion = store.get("version", null);
    if (pkg.version != curVersion) {
        store.set("version", pkg.version);
    }
}

/**
 * We once incorrectly named the config dir "Fluentflame Reader", so this lets
 * us fix that mistake by renaming it to the desired userPath before start up.
 */
export function maybeRenameOldConfig(oldUserPath: string, newUserPath: string) {
    if (existsSync(oldUserPath)) {
        console.log(
            `fluentflame-reader: Found erroneous config dir name: ${oldUserPath}`,
        );
        if (!existsSync(newUserPath)) {
            renameSync(oldUserPath, newUserPath);
            console.log(
                `fluentflame-reader: Renamed ${oldUserPath} -> ${newUserPath}`,
            );
        } else {
            console.warn(
                `fluentflame-reader: Can't move old dir because ${newUserPath} exists`,
            );
        }
    }
}
