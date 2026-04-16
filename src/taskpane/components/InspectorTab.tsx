import React, { useState, useCallback } from "react";
import {
    makeStyles,
    tokens,
    Button,
    Text,
    Spinner,
    Switch,
} from "@fluentui/react-components";
import { ArrowClockwiseRegular } from "@fluentui/react-icons";
import { ParsedMashup, ExcelQueryInfo, Discrepancy } from "../../types";
import { readDataMashup, readExcelQueries } from "../../services/officeService";
import { QueryCard } from "./QueryCard";
import { DiscrepancyPanel } from "./DiscrepancyPanel";
import { RawView } from "./RawView";

const useStyles = makeStyles({
    root: {
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
    },
    toolbar: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginBottom: "8px",
        flexShrink: 0,
    },
    spacer: {
        flex: 1,
    },
    content: {
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
    },
    empty: {
        textAlign: "center",
        padding: "24px 12px",
        color: tokens.colorNeutralForeground3,
    },
    count: {
        fontSize: tokens.fontSizeBase200,
        color: tokens.colorNeutralForeground3,
    },
});

export const InspectorTab: React.FC = () => {
    const styles = useStyles();

    const [mashup, setMashup] = useState<ParsedMashup | null>(null);
    const [excelQueries, setExcelQueries] = useState<ExcelQueryInfo[]>([]);
    const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [rawMode, setRawMode] = useState(false);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [m, eq] = await Promise.all([readDataMashup(), readExcelQueries()]);
            setMashup(m);
            setExcelQueries(eq);
            setDiscrepancies(m ? computeDiscrepancies(m, eq) : []);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
    }, []);

    const apiMap = new Map(excelQueries.map((q) => [q.name, q]));

    return (
        <div className={styles.root}>
            <div className={styles.toolbar}>
                <Button
                    icon={<ArrowClockwiseRegular />}
                    appearance="subtle"
                    size="small"
                    onClick={refresh}
                    disabled={loading}
                >
                    {loading ? "Loading..." : "Refresh"}
                </Button>
                <div className={styles.spacer} />
                {mashup && (
                    <Text className={styles.count}>
                        {mashup.queries.length} {mashup.queries.length === 1 ? "query" : "queries"}
                    </Text>
                )}
                <Switch
                    label="Raw"
                    checked={rawMode}
                    onChange={(_, d) => setRawMode(d.checked)}
                    labelPosition="before"
                />
            </div>

            <div className={styles.content}>
                {loading && <Spinner size="small" label="Reading DataMashup..." />}

                {error && (
                    <Text className={styles.empty} style={{ color: tokens.colorStatusDangerForeground1 }}>
                        {error}
                    </Text>
                )}

                {!loading && !error && !mashup && (
                    <Text className={styles.empty}>
                        Click <strong>Refresh</strong> to read the workbook's DataMashup.
                    </Text>
                )}

                {mashup && !rawMode && (
                    <>
                        {mashup.queries.map((q) => (
                            <QueryCard
                                key={q.name}
                                query={q}
                                apiInfo={apiMap.get(q.name)}
                                xmlMetadata={mashup.queryMetadata.get(q.name) ?? []}
                            />
                        ))}
                        <DiscrepancyPanel discrepancies={discrepancies} />
                    </>
                )}

                {mashup && rawMode && <RawView mashup={mashup} />}
            </div>
        </div>
    );
};

function computeDiscrepancies(mashup: ParsedMashup, excelQueries: ExcelQueryInfo[]): Discrepancy[] {
    const result: Discrepancy[] = [];

    if (excelQueries.length === 0 && mashup.queries.length > 0) return result;

    const xmlNames = new Set(mashup.queries.map((q) => q.name));
    const apiNames = new Set(excelQueries.map((q) => q.name));

    for (const name of apiNames) {
        if (!xmlNames.has(name)) {
            result.push({
                type: "in-api-only",
                queryName: name,
                detail: "Exists in Excel's query list but NOT found in DataMashup XML — possible serialization bug",
            });
        }
    }

    return result;
}
