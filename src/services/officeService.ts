import { ExcelQueryInfo, ParsedMashup } from "../types";
import { parseMashup } from "./mashupParser";

const PQ_NAMESPACES = [
    "http://schemas.microsoft.com/DataMashup",
    "http://schemas.microsoft.com/DataExplorer",
    "http://schemas.microsoft.com/DataMashup/Temp",
    "http://schemas.microsoft.com/DataExplorer/Temp",
];

export async function readDataMashup(): Promise<ParsedMashup | null> {
    return Excel.run(async (context) => {
        for (const ns of PQ_NAMESPACES) {
            const parts = context.workbook.customXmlParts.getByNamespace(ns);
            parts.load("items/id");
            await context.sync();

            if (parts.items.length === 0) continue;

            const part = parts.items[0];
            const xmlResult = part.getXml();
            await context.sync();

            try {
                return await parseMashup(xmlResult.value, part.id);
            } catch {
                continue;
            }
        }
        return null;
    });
}

export async function readExcelQueries(): Promise<ExcelQueryInfo[]> {
    try {
        return await Excel.run(async (context) => {
            const queries = context.workbook.queries;
            queries.load(["items/name", "items/loadedTo", "items/loadedToDataModel",
                          "items/refreshDate", "items/rowsLoadedCount", "items/error"]);
            await context.sync();

            return queries.items.map((q) => ({
                name: q.name,
                loadedTo: q.loadedTo as string,
                loadedToDataModel: q.loadedToDataModel,
                refreshDate: q.refreshDate ?? null,
                rowsLoadedCount: q.rowsLoadedCount,
                error: q.error as string,
            }));
        });
    } catch {
        return [];
    }
}

/**
 * Writes modified DataMashup XML back using setXml (preserves the part ID and relationships).
 */
export async function writeDataMashup(partId: string, newXml: string): Promise<void> {
    await Excel.run(async (context) => {
        const part = context.workbook.customXmlParts.getItem(partId);
        part.setXml(newXml);
        await context.sync();
    });
}

/**
 * Diagnostic: reads DataMashup, writes it back UNCHANGED, reads again.
 * Returns { before, after } query counts so we can tell if setXml itself corrupts data.
 */
export async function roundTripTest(): Promise<{ before: number; after: number; error?: string }> {
    try {
        const mashup = await readDataMashup();
        if (!mashup) return { before: 0, after: 0, error: "No DataMashup found" };

        const before = mashup.queries.length;

        // Write back the EXACT SAME XML — no modification
        await writeDataMashup(mashup.partId, mashup.raw.xml);

        // Read back
        const after = await readDataMashup();
        return { before, after: after?.queries.length ?? 0 };
    } catch (err) {
        return { before: -1, after: -1, error: err instanceof Error ? err.message : String(err) };
    }
}

/**
 * Verifies injection by reading the DataMashup back and counting queries.
 */
export async function verifyInjection(): Promise<number> {
    const mashup = await readDataMashup();
    return mashup?.queries.length ?? 0;
}
