/** Ensure we don't have too long of a message. */
export function trimContent(
    s: string,
    charLen: number = 512,
    lineLen: number = 5,
): string {
    return limitLines(trimString(s, charLen), lineLen);
}

function limitLines(s: string, maxLength: number): string {
    const splitLines = s.split("\n");
    if (splitLines.length <= maxLength) {
        return s;
    }
    const newLines = splitLines.slice(0, maxLength - 1);
    newLines.push("…more lines…");
    return newLines.join("\n");
}

export function trimString(s: string, maxLength: number): string {
    if (s.length <= maxLength) {
        return s;
    }
    return s.substring(0, maxLength - 1) + "…";
}
