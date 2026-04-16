// ── Parsed from customXml DataMashup (ground truth) ──

export interface ParsedMashup {
    raw: {
        xml: string;
        version: number;
        packageSize: number;
        opcEntries: OpcEntry[];
        section1m: string;
    };
    queries: ParsedQuery[];
    /** Per-query metadata from the DataMashup metadata section */
    queryMetadata: Map<string, QueryMetadataEntry[]>;
    partId: string;
}

export interface OpcEntry {
    name: string;
    size: number;
}

export interface ParsedQuery {
    name: string;
    formula: string;
    dependencies: string[];
}

/** A single key-value entry from the DataMashup metadata XML */
export interface QueryMetadataEntry {
    type: string;
    value: string;
}

// ── From ExcelApi (Excel's runtime view) ──

export interface ExcelQueryInfo {
    name: string;
    loadedTo: string;
    loadedToDataModel: boolean;
    refreshDate: Date | null;
    rowsLoadedCount: number;
    error: string;
}

// ── Discrepancy ──

export type DiscrepancyType = "in-xml-only" | "in-api-only";

export interface Discrepancy {
    type: DiscrepancyType;
    queryName: string;
    detail: string;
}

// ── Inspector state ──

export interface InspectorData {
    mashup: ParsedMashup | null;
    excelQueries: ExcelQueryInfo[];
    discrepancies: Discrepancy[];
}
