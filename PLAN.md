# PQ Parser Add-In — Project Plan

## Vision

A diagnostic Office Task Pane add-in for Excel that gives Power Query developers a **ground-truth view** of every query stored in the workbook's DataMashup custom XML — bypassing any bugs in Q&C or the PQ Editor — and lets them **inject new queries** directly into the workbook for bug bash and testing purposes.

Two tabs: **Inspector** (read) and **Generator** (write).

---

## Why This Matters

| Pain point | How PQ Parser solves it |
|---|---|
| Q&C panel or PQ Editor hides/misrepresents queries due to bugs | Inspector reads the raw DataMashup — shows what *actually* exists |
| Bug bash setup is slow; you end up testing simple cases only | Generator injects dozens of diverse queries in seconds |
| Hard to know if a query was properly serialized after a code change | Compare raw customXml truth vs. ExcelApi metadata side-by-side |
| No easy way to inspect the binary DataMashup format | Raw view shows version, package size, OPC contents, full XML |

---

## UI Layout

The task pane is ~320px wide, ~500-600px tall. Everything fits without scrolling.

```
┌──────────────────────────────────┐
│ PQ Parser                        │  ← Brand accent top border
│ [Inspector]  [Generator]         │  ← Small tab strip
├──────────────────────────────────┤
│                                  │
│         (tab content)            │  ← flex: 1, overflow-y: auto
│                                  │
└──────────────────────────────────┘
```

### Inspector Tab

Two views toggled by a switch: **Clean** (default) and **Raw**.

**Clean View** — one card per query, accordion-style (collapsed by default):

```
┌──────────────────────────────────┐
│ ⟳ Refresh       [Clean ○──● Raw]│
├──────────────────────────────────┤
│                                  │
│ ┌── Query1 ──────────── ▸ ────┐ │  ← Collapsed
│ │  Table · 150 rows · 0 errs │ │
│ └─────────────────────────────┘ │
│                                  │
│ ┌── Query2 ──────────── ▾ ────┐ │  ← Expanded
│ │  Connection only             │ │
│ │  Deps: Query1                │ │
│ │  Last refresh: 2 min ago     │ │
│ │ ┌─────────────────────────┐  │ │
│ │ │ let                     │  │ │  ← Monospace code block
│ │ │   Source = #"Query1",   │  │ │
│ │ │   Filtered = Table...   │  │ │
│ │ │ in                      │  │ │
│ │ │   Filtered              │  │ │
│ │ └─────────────────────────┘  │ │
│ └─────────────────────────────┘ │
│                                  │
│  ⚠ Discrepancies (1)            │  ← Only shown if mismatches found
│  "HiddenQuery3" exists in XML   │
│  but NOT in ExcelApi queries    │
│                                  │
└──────────────────────────────────┘
```

Each query card shows:
- **Name** (from Section1.m)
- **Loaded to**: Table / Connection only / PivotTable (from ExcelApi `loadedTo`)
- **Row count** (from ExcelApi `rowsLoadedCount`)
- **Error** (from ExcelApi `error`)
- **Last refresh** (from ExcelApi `refreshDate`, relative time)
- **Dependencies**: other query names referenced via `#"..."` syntax
- **M formula**: full text in a monospace block (on expand)

**Discrepancy panel** — the killer feature — shows any mismatches:
- Queries in customXml but NOT in `workbook.queries` (ExcelApi)
- Queries in `workbook.queries` but NOT in customXml
- Name mismatches, missing formulas, etc.

**Raw View** — collapses the clean cards, shows:
- Binary header: version (hex), package size (bytes)
- OPC ZIP file listing (names + sizes)
- Full `Section1.m` text in a scrollable monospace block
- Full DataMashup XML in a scrollable monospace block

### Generator Tab

```
┌──────────────────────────────────┐
│ Category: [All Sources      ▾]   │  ← Dropdown filter
├──────────────────────────────────┤
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐│
│ │ Web │ │ SQL │ │ CSV │ │JSON ││  ← Template chips (wrap)
│ └─────┘ └─────┘ └─────┘ └─────┘│
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐│
│ │OData│ │Excel│ │Join │ │Group││
│ └─────┘ └─────┘ └─────┘ └─────┘│
│ ┌─────┐ ┌─────┐ ┌─────┐        │
│ │Pivot│ │Error│ │ Edge│        │
│ └─────┘ └─────┘ └─────┘        │
├──────────────────────────────────┤
│ Preview:                         │
│ ┌──────────────────────────────┐ │
│ │ let                          │ │  ← Selected template M
│ │   Source = Web.Contents(...) │ │
│ │ in                           │ │
│ │   Source                     │ │
│ └──────────────────────────────┘ │
│ Name: [BugBash_Web_001     ]    │
│                                  │
│ [+ Add to Workbook]             │
├──────────────────────────────────┤
│ ─── Bulk Generate ───           │
│ Count: [10]                      │
│ Categories: [All ▾]             │
│ [Generate Batch]                 │
│                                  │
│ ✓ Added 10 queries to workbook  │
│   Reload workbook to see in Q&C │
└──────────────────────────────────┘
```

**Single add**: pick a template → preview M → set name → "Add to Workbook"
**Bulk add**: set count + category filter → "Generate Batch" → adds N queries with unique names (`BugBash_Web_001`, `BugBash_Join_002`, etc.)

After injection, a status bar tells the user to reload the workbook.

---

## Tech Stack

Same as connected-workbooks-addin:

| Layer | Choice |
|---|---|
| Framework | React 18 + TypeScript |
| UI | Fluent UI v9 (webLightTheme) |
| Bundler | Webpack 5 with ts-loader |
| Office | Office.js from CDN, `@types/office-js` |
| ZIP | JSZip (for OPC package read/write) |
| Buffer | `buffer` polyfill for browser |

---

## Folder Structure

```
pq-parser-addin/
├── manifest.xml
├── package.json
├── tsconfig.json
├── webpack.config.ts
├── tsconfig.node.json
├── assets/                         # icon-16/32/64/80.png
└── src/
    ├── taskpane/
    │   ├── index.html
    │   ├── index.tsx               # Office.onReady → React root
    │   └── components/
    │       ├── App.tsx             # Top-level layout: header + tab strip + content + status
    │       ├── InspectorTab.tsx    # Clean/Raw toggle, query list, discrepancy panel
    │       ├── QueryCard.tsx       # Single query: accordion with metadata + M code
    │       ├── DiscrepancyPanel.tsx# Shows mismatches between customXml and ExcelApi
    │       ├── RawView.tsx         # Binary info + Section1.m + full XML blocks
    │       ├── GeneratorTab.tsx    # Template grid, preview, single/bulk add
    │       ├── TemplateChip.tsx    # Individual template button
    │       ├── CodeBlock.tsx       # Reusable monospace scrollable text block
    │       └── StatusBar.tsx       # Success/error/info messages
    ├── services/
    │   ├── officeService.ts        # ALL Office.js API calls (read/write customXml, query metadata)
    │   ├── mashupParser.ts         # Read: base64 → binary → OPC ZIP → Section1.m → ParsedMashup
    │   ├── mashupWriter.ts         # Write: modify Section1.m → repackage → binary → base64 → XML
    │   └── sectionParser.ts        # Parse Section1.m into individual queries (state machine)
    ├── templates/
    │   ├── index.ts                # Registry: all templates by category
    │   ├── dataSources.ts          # Web, SQL, CSV, JSON, OData, Excel, XML, Folder, SharePoint
    │   ├── transforms.ts           # Join, GroupBy, Pivot, Nested, Custom Function, Parameterized
    │   └── edgeCases.ts            # Long formula, special chars, empty, syntax errors, circular ref
    └── types/
        └── index.ts                # All shared types
```

---

## Key Types

```typescript
// ── Parsed from customXml (ground truth) ──
interface ParsedMashup {
    raw: {
        xml: string;                  // Full DataMashup XML
        version: number;              // First 4 bytes as uint32
        packageSize: number;          // Bytes 4-7 as uint32 LE
        opcEntries: OpcEntry[];       // File listing inside the ZIP
        section1m: string;            // Full Section1.m text
    };
    queries: ParsedQuery[];           // Individual queries extracted from Section1.m
}

interface OpcEntry {
    name: string;                     // e.g. "Formulas/Section1.m"
    size: number;                     // Uncompressed size in bytes
}

interface ParsedQuery {
    name: string;                     // e.g. "Query1"
    formula: string;                  // Raw M expression (without shared/section wrapper)
    dependencies: string[];           // Other query names referenced via #"..."
}

// ── From ExcelApi (Excel's view) ──
interface ExcelQueryInfo {
    name: string;
    loadedTo: string;                 // "Table" | "ConnectionOnly" | "PivotTable" | etc.
    loadedToDataModel: boolean;
    refreshDate: Date | null;
    rowsLoadedCount: number;
    error: string;
}

// ── Discrepancy ──
interface Discrepancy {
    type: "in-xml-only" | "in-api-only" | "name-mismatch";
    queryName: string;
    detail: string;
}

// ── Templates ──
type TemplateCategory = "dataSources" | "transforms" | "edgeCases";

interface QueryTemplate {
    id: string;                       // e.g. "web-api"
    name: string;                     // Display: "Web API"
    category: TemplateCategory;
    description: string;              // Tooltip/detail text
    formula: string;                  // M expression
    defaultQueryName: string;         // e.g. "BugBash_Web"
}
```

---

## Data Flows

### Inspector: Read

```
User clicks Refresh
  → officeService.readDataMashup()
      → workbook.customXmlParts.getByNamespace(ns)
      → part.getXml() → raw XML string
  → mashupParser.parse(xmlString)
      → regex extract base64 from <DataMashup> element
      → Buffer.from(base64, "base64") → bytes
      → read version (bytes[0..3]), packageSize (bytes[4..7] LE)
      → JSZip.loadAsync(bytes.slice(8, 8+packageSize))
      → zip.file("Formulas/Section1.m").async("text")
      → sectionParser.parseSection(section1mText)
          → state machine: extract all shared entries
          → for each: extract name, formula, detect dependencies
      → zip.forEach() → collect OPC entry listing
  → officeService.readExcelQueries()
      → workbook.queries.load(["name","loadedTo","refreshDate",...])
  → compare: find discrepancies between customXml queries and ExcelApi queries
  → render: QueryCards + DiscrepancyPanel
```

### Generator: Write (Single Query)

```
User selects template → preview M → sets name → clicks "Add to Workbook"
  → officeService.readDataMashup() → get current XML + binary
  → mashupWriter.injectQuery(currentXml, newName, newFormula)
      → parse existing binary → extract OPC ZIP
      → read Section1.m
      → append: shared #"newName" = newFormula;
      → write modified Section1.m back into ZIP
      → JSZip.generateAsync("uint8array") → new ZIP bytes
      → reconstruct binary:
          [same 4B version]
          [new 4B packageSize (LE)]
          [new ZIP bytes]
          [same post-package bytes (permissions + metadata)]
      → Buffer.from(binary).toString("base64")
      → wrap in <DataMashup xmlns="...">base64</DataMashup>
  → officeService.writeDataMashup(partId, newXml)
      → part.setXml(newXml)
      → context.sync()
  → show "Added. Reload workbook to see in Q&C."
```

### Generator: Write (Bulk)

```
User sets count=10, category=All → clicks "Generate Batch"
  → select N templates (round-robin across categories, or random)
  → assign unique names: BugBash_Web_001, BugBash_Join_002, ...
  → officeService.readDataMashup() → get current
  → mashupWriter.injectQueries(currentXml, [{name, formula}, ...])
      → parse Section1.m
      → append all N shared entries at once
      → repackage once (not N times)
  → officeService.writeDataMashup(partId, newXml)
  → show "Added 10 queries. Reload workbook."
```

### Edge Case: No Existing DataMashup

If the workbook has zero PQ queries, there's no DataMashup custom XML part. In this case:

**v1**: Show a message: "No DataMashup found. Add at least one query via PQ Editor first, then use this tool to inject more."

**v2 (future)**: Create the DataMashup from scratch:
1. Generate Section1.m with the new query
2. Create minimal OPC ZIP (Section1.m + [Content_Types].xml)
3. Build binary: version(0x00000000) + packageSize + ZIP + empty permissions/metadata
4. Base64 encode → XML envelope
5. `customXmlParts.add(xml)` to create a new part

---

## Section1.m Parser (State Machine)

The parser in `sectionParser.ts` handles the M language's quoting rules:

```
Input:
    section Section1;

    shared #"My Query" =
    let
        Source = Web.Contents("https://example.com"),
        Data = Json.Document(Source)
    in
        Data;

    shared SimpleQuery = #"My Query";

Algorithm:
    1. Skip "section Section1;" header
    2. State machine with:
       - inString: boolean (toggled by " char, "" is escape → stays in string)
       - depth: number (incremented by ( [ {, decremented by ) ] })
    3. Scan for "shared" keyword at depth=0, outside strings
    4. Extract query name:
       - If next token is #" → read until closing " (handle "" escapes)
       - Else → read bare identifier until = sign
    5. Read formula text until ; at depth=0 outside strings
    6. Record { name, formula, deps: all #"..." refs that match other query names }

Output:
    [
        { name: "My Query", formula: "let\n    Source = ...\nin\n    Data", deps: [] },
        { name: "SimpleQuery", formula: '#"My Query"', deps: ["My Query"] }
    ]
```

---

## Dependency Detection

After parsing all queries, scan each formula for `#"..."` references:

```typescript
function detectDependencies(formula: string, allQueryNames: Set<string>): string[] {
    const refs: string[] = [];
    const regex = /#"([^"]*(?:""[^"]*)*)"/g;
    let match;
    while ((match = regex.exec(formula)) !== null) {
        const name = match[1].replace(/""/g, '"');
        if (allQueryNames.has(name)) refs.push(name);
    }
    return [...new Set(refs)];
}
```

This finds all `#"..."` patterns and keeps only those whose name matches a known query.

---

## Preset Query Templates

### Data Sources (9 templates)

| Template | M Expression (placeholder, non-functional) |
|---|---|
| Web API | `let Source = Json.Document(Web.Contents("https://api.example.com/data")) in Source` |
| SQL Server | `let Source = Sql.Database("server.database.windows.net", "AdventureWorks"), Data = Source{[Schema="dbo",Item="Customers"]}[Data] in Data` |
| CSV File | `let Source = Csv.Document(File.Contents("C:\Data\sample.csv"),[Delimiter=",", Columns=5, Encoding=65001]) in Source` |
| JSON File | `let Source = Json.Document(File.Contents("C:\Data\sample.json")), Data = Source[records] in Data` |
| OData Feed | `let Source = OData.Feed("https://services.odata.org/V4/Northwind/Northwind.svc/Customers") in Source` |
| Excel File | `let Source = Excel.Workbook(File.Contents("C:\Data\source.xlsx"), null, true), Sheet = Source{[Item="Sheet1",Kind="Sheet"]}[Data] in Sheet` |
| XML File | `let Source = Xml.Document(File.Contents("C:\Data\config.xml")), Data = Source[Value] in Data` |
| Folder | `let Source = Folder.Files("C:\Data\Reports"), Filtered = Table.SelectRows(Source, each [Extension] = ".csv") in Filtered` |
| SharePoint | `let Source = SharePoint.Tables("https://contoso.sharepoint.com/sites/data", [Implementation="2.0"]) in Source` |

### Complex Transforms (7 templates)

| Template | Description |
|---|---|
| Multi-Step | 8+ let bindings: type conversions, column renames, filters, sort |
| Inner Join | `Table.NestedJoin` + `Table.ExpandTableColumn` |
| Left Outer Join | Same pattern with `JoinKind.LeftOuter` |
| Full Outer Join | `JoinKind.FullOuter` with null handling |
| GroupBy + Aggregation | `Table.Group` with multiple custom aggregate columns |
| Pivot | `Table.Pivot` with aggregation function |
| Unpivot | `Table.UnpivotOtherColumns` |

### Edge Cases (8 templates)

| Template | What it tests |
|---|---|
| Long Formula | 50+ let bindings, 2000+ chars |
| Special Chars | Query name with spaces, unicode, brackets |
| Empty Body | `let Source = #table({},{}) in Source` (valid but empty) |
| Syntax Error | Intentionally malformed M (missing `in`) |
| Deep Nesting | 10+ levels of nested `let...in` |
| Many Columns | Table with 100 columns |
| Error Handling | `try...otherwise` chains |
| Custom Function | `(x as number) => x * 2` function definition |

---

## Manifest Requirements

```xml
<Requirements>
    <Sets>
        <Set Name="ExcelApi" MinVersion="1.5" />  <!-- CustomXmlPart.setXml -->
    </Sets>
</Requirements>
<Permissions>ReadWriteDocument</Permissions>
```

Note: ExcelApi 1.14 is needed for `workbook.queries` (inspector metadata), but we degrade gracefully — if unavailable, the inspector shows only raw customXml data without the ExcelApi comparison.

---

## Implementation Phases

### Phase 1: Scaffold + Inspector Read-Only (Core)
1. Project scaffold (webpack, manifest, React shell)
2. `mashupParser.ts` — binary → OPC → Section1.m → ParsedMashup
3. `sectionParser.ts` — Section1.m → individual queries + dependencies
4. `officeService.ts` — readDataMashup() + readExcelQueries()
5. `InspectorTab.tsx` + `QueryCard.tsx` — clean view with accordion
6. `DiscrepancyPanel.tsx` — compare customXml vs ExcelApi
7. `RawView.tsx` — toggle for binary/XML details

### Phase 2: Generator + Injection
1. `mashupWriter.ts` — modify Section1.m → repackage → write back
2. `officeService.ts` — writeDataMashup()
3. All template files (dataSources, transforms, edgeCases)
4. `GeneratorTab.tsx` — template grid, preview, single + bulk add
5. `StatusBar.tsx` — injection feedback

### Phase 3: Polish + Future
1. Copy-to-clipboard for M formulas
2. Search/filter in inspector
3. Delete query from DataMashup
4. LLM-generated queries (deferred per user request)
5. Create DataMashup from scratch (when workbook has no PQ)

---

## Open Questions

1. **After injection, is a full workbook close+reopen needed, or does File → Refresh achieve it?**
   Need to test: does modifying customXml via `setXml()` trigger Excel to re-parse the DataMashup, or is it only read on file open?

2. **Permissions/metadata bytes after the OPC ZIP** — the connected-workbooks library's `pqUtils.ts` handles these in template generation. We need to confirm the exact layout:
   ```
   [4B permissionsLength LE][N bytes permissions][4B metadataLength LE][N bytes metadata]
   ```
   When modifying, we preserve these bytes verbatim (only the ZIP changes).

3. **Multiple DataMashup parts** — can a workbook have more than one? The code tries 4 namespace URIs. We should handle all found parts but typically expect exactly one.
