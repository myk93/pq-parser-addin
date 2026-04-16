import JSZip from "jszip";
import { ParsedMashup, OpcEntry, QueryMetadataEntry } from "../types";
import { parseSection } from "./sectionParser";
/** Reads little-endian int32 and byte slices from an ArrayBuffer. */
class ArrayReader {
    private _array: ArrayBuffer;
    private _position = 0;
    constructor(array: ArrayBuffer) { this._array = array; }
    getInt32(): number {
        const v = new DataView(this._array, this._position, 4).getInt32(0, true);
        this._position += 4;
        return v;
    }
    getBytes(n?: number): Uint8Array {
        const slice = this._array.slice(this._position, n ? n + this._position : undefined);
        this._position += slice.byteLength;
        return new Uint8Array(slice);
    }
}

/**
 * Parses a DataMashup XML string into a structured representation.
 *
 * Binary layout inside the base64 blob:
 *   [4B version][4B packageSize LE][packageSize B OPC ZIP]
 *   [4B permissionsSize LE][permissions]
 *   [4B metadataSize LE][metadata]
 *   [endBuffer]
 */
export async function parseMashup(xml: string, partId: string): Promise<ParsedMashup> {
    const base64Str = extractBase64(xml);
    if (!base64Str) {
        throw new Error("Could not extract base64 blob from DataMashup XML");
    }

    const bytes = base64ToUint8Array(base64Str);
    if (bytes.length < 8) {
        throw new Error("DataMashup binary too short");
    }

    const reader = new ArrayReader(bytes.buffer as ArrayBuffer);
    const versionBytes = reader.getBytes(4);
    const version = versionBytes[0] | (versionBytes[1] << 8) | (versionBytes[2] << 16) | (versionBytes[3] << 24);
    const packageSize = reader.getInt32();

    if (packageSize <= 0 || bytes.length < 8 + packageSize) {
        throw new Error(`Invalid packageSize: ${packageSize}`);
    }

    const packageOPC = reader.getBytes(packageSize);

    // Parse permissions (skip, just read past)
    const permissionsSize = reader.getInt32();
    reader.getBytes(permissionsSize); // permissions — not needed for display

    // Parse metadata section
    const metadataSize = reader.getInt32();
    const metadataBytes = reader.getBytes(metadataSize);
    const queryMetadata = parseMetadataSection(metadataBytes);

    // Load OPC ZIP
    const zip = await JSZip.loadAsync(packageOPC);

    // Read Section1.m
    const section1mFile = zip.file("Formulas/Section1.m");
    const section1m = section1mFile ? await section1mFile.async("text") : "";

    // Collect OPC entries
    const opcEntries: OpcEntry[] = [];
    zip.forEach((relativePath, file) => {
        opcEntries.push({ name: relativePath, size: (file as any)._data?.uncompressedSize ?? 0 });
    });

    // Parse individual queries
    const queries = section1m ? parseSection(section1m) : [];

    return {
        raw: { xml, version, packageSize, opcEntries, section1m },
        queries,
        queryMetadata,
        partId,
    };
}

/**
 * Parses the DataMashup metadata section into per-query metadata entries.
 *
 * Metadata binary layout:
 *   [4B version][4B xmlSize LE][xmlSize B UTF-8 XML][rest]
 *
 * The XML has structure:
 *   <LocalPackageMetadataFile>
 *     <Items>
 *       <Item>
 *         <ItemLocation>
 *           <ItemType>Formula</ItemType>
 *           <ItemPath>Section1/QueryName</ItemPath>
 *         </ItemLocation>
 *         <StableEntries>
 *           <Entry Type="ResultType" Value="sTable"/>
 *           <Entry Type="FillLastUpdated" Value="d2026-..."/>
 *         </StableEntries>
 *       </Item>
 *     </Items>
 *   </LocalPackageMetadataFile>
 */
function parseMetadataSection(metadataBytes: Uint8Array): Map<string, QueryMetadataEntry[]> {
    const result = new Map<string, QueryMetadataEntry[]>();

    if (metadataBytes.length < 8) return result;

    try {
        const reader = new ArrayReader(metadataBytes.buffer as ArrayBuffer);
        reader.getBytes(4); // metadata version
        const xmlSize = reader.getInt32();
        const xmlBytes = reader.getBytes(xmlSize);

        const xmlStr = new TextDecoder("utf-8").decode(xmlBytes);
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlStr, "text/xml");

        const items = doc.getElementsByTagName("Item");
        for (let i = 0; i < items.length; i++) {
            const item = items[i];

            // Extract query name from ItemPath (format: "Section1/QueryName" or "Section1/QueryName/Step")
            const itemPath = item.getElementsByTagName("ItemPath")[0]?.textContent ?? "";
            if (!itemPath.startsWith("Section1/")) continue;

            const parts = itemPath.split("/");
            const queryName = decodeURIComponent(parts[1] ?? "");
            if (!queryName) continue;

            // Only take top-level entries (Section1/QueryName, not Section1/QueryName/Step)
            const isTopLevel = parts.length === 2;

            // Extract entries
            const entries: QueryMetadataEntry[] = [];
            const entryElements = item.getElementsByTagName("Entry");
            for (let j = 0; j < entryElements.length; j++) {
                const el = entryElements[j];
                const type = el.getAttribute("Type") ?? "";
                const value = el.getAttribute("Value") ?? "";
                if (type) entries.push({ type, value });
            }

            if (entries.length > 0) {
                const key = isTopLevel ? queryName : `${queryName}/${parts.slice(2).join("/")}`;
                result.set(key, entries);
            }
        }
    } catch {
        // Metadata parsing failed — return empty map, don't break the inspector
    }

    return result;
}

function extractBase64(xml: string): string | null {
    const match = xml.match(/<DataMashup[^>]*>\s*([A-Za-z0-9+/=\s]+)\s*<\/DataMashup>/);
    return match ? match[1].replace(/\s/g, "") : null;
}

function base64ToUint8Array(base64: string): Uint8Array {
    const binStr = atob(base64);
    const bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
    return bytes;
}
