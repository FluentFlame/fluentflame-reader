import { SourceRule } from "./models/rule"
import { Dexie, type EntityTable } from "dexie"

export interface SourceEntry {
    sid: number
    url: string
    iconurl?: string
    name: string
    openTarget: number
    lastFetched: Date
    serviceRef?: string
    fetchFrequency: number
    rules?: SourceRule[]
    textDir: number
    hidden: boolean
}

export interface ItemEntry {
    iid: number
    source: number
    title: string
    link: string
    date: Date
    fetchedDate: Date
    thumb?: string
    content: string
    snippet: string
    creator?: string
    hasRead: boolean
    starred: boolean
    hidden: boolean
    notify: boolean
    serviceRef?: string
}

export const fluentDB = new Dexie("MainDB") as Dexie & {
    sources: EntityTable<SourceEntry, "sid">
    items: EntityTable<ItemEntry, "iid">
}
fluentDB.version(3).stores({
    sources: `++sid, &url`,
    items: `++iid, source, date, serviceRef`,
})

/**
 * Migrate old Lovefield Sources Database into the new MainDB Dexie DB.
 */
async function migrateLovefieldSourcesDB(dbName: string, version: number) {
    const databases = await indexedDB.databases()
    if (!databases.map(d => d.name).some(d => d === dbName)) {
        return
    }
    const db = (await wrapRequest(indexedDB.open(dbName, version))).result
    const transaction = db.transaction("sources")
    const store = transaction.objectStore("sources")
    const entryQueryResult = (await wrapRequest(store.getAll())).result
    const txFunc = async () => {
        for (const row of entryQueryResult) {
            const source = row.value
            // Skip entries that already exist.
            const query = await fluentDB.sources
                .where("url")
                .equals(source.url)
                .toArray()
            if (query.length > 0) {
                continue
            }
            const newEntry = {
                sid: source.sid,
                url: source.url,
                iconurl: source.iconurl,
                name: source.name,
                openTarget: source.openTarget,
                lastFetched: new Date(source.lastFetched),
                serviceRef: source.serviceRef,
                fetchFrequency: source.fetchFrequency,
                rules: source.rules,
                textDir: source.textDir,
                hidden: source.hidden,
            }
            await fluentDB.sources.add(newEntry)
        }
    }
    await fluentDB.transaction("rw", "sources", txFunc)
    console.log(
        `Successfully migrated Sources. Attempting to deleting old DB ${dbName}.`,
    )
    // Can't await on this, as it will delete only after the last connection is closed.
    wrapRequest(indexedDB.deleteDatabase(dbName))
}

function byteLength(str: string) {
    var s = str.length
    for (var i = str.length - 1; i >= 0; i--) {
        var code = str.charCodeAt(i)
        if (code > 0x7f && code <= 0x7ff) s++
        else if (code > 0x7ff && code <= 0xffff) s += 2
        if (code >= 0xdc00 && code <= 0xdfff) i-- //trail surrogate
    }
    return s
}

export async function calculateItemSize(): Promise<number> {
    await fluentDB.open()
    let result = 0
    const idb = fluentDB.backendDB()
    const objectStore = idb
        .transaction(["items"], "readonly")
        .objectStore("items")
    const cursorRequest = objectStore.openCursor()
    let cursor = (await wrapRequest(cursorRequest)).result
    while (cursor) {
        result += byteLength(JSON.stringify(cursor.value))
        cursor.continue()
        cursor = (await wrapRequest(cursorRequest)).result
    }
    return result
}

/**
 * Migrate old Lovefield Items Database into the new MainDB Dexie DB.
 */
async function migrateLovefieldItemsDB(dbName: string, version: number) {
    const databases = await indexedDB.databases()
    if (!databases.map(d => d.name).some(d => d === dbName)) {
        return
    }
    const db = (await wrapRequest(indexedDB.open(dbName, version))).result
    let store: IDBObjectStore
    try {
        const transaction = db.transaction("items")
        store = transaction.objectStore("items")
    } catch (e) {
        console.warn(
            "Error getting db transaction for 'items' migration, but still deleting.",
            e,
        )
        // Can't await on this, as it will delete only after the last connection is closed.
        wrapRequest(indexedDB.deleteDatabase(dbName))
        return
    }
    const entryQueryResult = (await wrapRequest(store.getAll())).result
    const txFunc = async () => {
        for (const row of entryQueryResult) {
            const item: ItemEntry = row.value
            // Skip entries that already exist.
            const query = await fluentDB.items
                .filter(i => i.link === item.link)
                .toArray()
            if (query.length > 0) {
                continue
            }
            const newEntry: ItemEntry = {
                iid: item.iid,
                source: item.source,
                title: item.title,
                link: item.link,
                date: new Date(item.date),
                fetchedDate: new Date(item.fetchedDate),
                thumb: item.thumb,
                content: item.content,
                snippet: item.snippet,
                creator: item.creator,
                hasRead: item.hasRead,
                starred: item.starred,
                hidden: item.hidden,
                notify: item.notify,
                serviceRef: item.serviceRef,
            }
            await fluentDB.items.add(newEntry)
        }
    }
    await fluentDB.transaction("rw", fluentDB.items, txFunc)
    console.log(
        `Successfully migrated Items. Attempting to deleting old DB ${dbName}.`,
    )
    // Can't await on this, as it will delete only after the last connection is closed.
    wrapRequest(indexedDB.deleteDatabase(dbName))
}

function wrapRequest<T>(req: T & IDBRequest): Promise<T> {
    return new Promise((resolve, reject) => {
        req.onsuccess = _ => {
            resolve(req)
        }
        req.onerror = out => {
            reject(out)
        }
    })
}

export async function init() {
    await migrateLovefieldSourcesDB("sourcesDB", 3)
    try {
        await migrateLovefieldItemsDB("itemsDB", 1)
    } catch (e) {
        console.error("Error migrating items DB", e)
    }
}
