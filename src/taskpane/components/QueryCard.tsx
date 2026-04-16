import React, { useState } from "react";
import {
    makeStyles,
    tokens,
    Text,
    Badge,
} from "@fluentui/react-components";
import {
    ChevronRight16Regular,
    ChevronDown16Regular,
} from "@fluentui/react-icons";
import { ParsedQuery, ExcelQueryInfo, QueryMetadataEntry } from "../../types";
import { CodeBlock } from "./CodeBlock";

const useStyles = makeStyles({
    card: {
        backgroundColor: tokens.colorNeutralBackground1,
        border: `1px solid ${tokens.colorNeutralStroke2}`,
        borderRadius: tokens.borderRadiusMedium,
        marginBottom: "6px",
        overflow: "hidden",
    },
    header: {
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "8px 10px",
        cursor: "pointer",
        userSelect: "none",
        ":hover": {
            backgroundColor: tokens.colorNeutralBackground2,
        },
    },
    name: {
        fontWeight: tokens.fontWeightSemibold,
        fontSize: tokens.fontSizeBase300,
        flex: 1,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    },
    badges: {
        display: "flex",
        flexWrap: "wrap",
        gap: "4px",
        padding: "0 10px 6px 30px",
    },
    body: {
        padding: "0 10px 10px 10px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
    },
    sectionLabel: {
        fontSize: tokens.fontSizeBase100,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground3,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        marginTop: "4px",
    },
    metaGrid: {
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        gap: "2px 8px",
        fontSize: "11px",
        fontFamily: "Consolas, monospace",
        padding: "6px 8px",
        backgroundColor: tokens.colorNeutralBackground3,
        borderRadius: tokens.borderRadiusMedium,
        overflowX: "auto",
    },
    metaKey: {
        color: tokens.colorNeutralForeground3,
        whiteSpace: "nowrap",
    },
    metaVal: {
        wordBreak: "break-all",
    },
    deps: {
        display: "flex",
        flexWrap: "wrap",
        gap: "4px",
        alignItems: "center",
    },
    depLabel: {
        fontSize: tokens.fontSizeBase100,
        color: tokens.colorNeutralForeground3,
    },
});

interface QueryCardProps {
    query: ParsedQuery;
    apiInfo?: ExcelQueryInfo;
    xmlMetadata?: QueryMetadataEntry[];
}

/** Decode metadata value prefixes: "s..." = string, "l0"/"l1" = bool, "d..." = date */
function decodeMetaValue(raw: string): string {
    if (raw.startsWith("l")) return raw === "l1" ? "true" : "false";
    if (raw.startsWith("d")) return raw.slice(1);
    if (raw.startsWith("s")) return raw.slice(1);
    return raw;
}

export const QueryCard: React.FC<QueryCardProps> = ({ query, apiInfo, xmlMetadata }) => {
    const styles = useStyles();
    const [expanded, setExpanded] = useState(false);

    return (
        <div className={styles.card}>
            <div className={styles.header} onClick={() => setExpanded((v) => !v)}>
                {expanded ? <ChevronDown16Regular /> : <ChevronRight16Regular />}
                <Text className={styles.name} title={query.name}>
                    {query.name}
                </Text>
            </div>

            {/* Badges row — always visible */}
            <div className={styles.badges}>
                {apiInfo && (
                    <>
                        <Badge appearance="tint" size="small" color={
                            apiInfo.loadedTo === "Table" ? "brand" :
                            apiInfo.loadedTo === "ConnectionOnly" ? "informative" : "subtle"
                        }>
                            {apiInfo.loadedTo}
                        </Badge>
                        {apiInfo.rowsLoadedCount >= 0 && (
                            <Badge appearance="tint" size="small" color="subtle">
                                {apiInfo.rowsLoadedCount} rows
                            </Badge>
                        )}
                        {apiInfo.error && apiInfo.error !== "None" && (
                            <Badge appearance="tint" size="small" color="danger">
                                {apiInfo.error}
                            </Badge>
                        )}
                    </>
                )}
                {query.dependencies.length > 0 && (
                    <>
                        {query.dependencies.map((dep) => (
                            <Badge key={dep} appearance="outline" size="small" color="informative">
                                dep: {dep}
                            </Badge>
                        ))}
                    </>
                )}
            </div>

            {/* Expanded: M formula + metadata */}
            {expanded && (
                <div className={styles.body}>
                    {/* M Formula */}
                    <Text className={styles.sectionLabel}>M Formula (from Section1.m)</Text>
                    <CodeBlock code={query.formula} />

                    {/* ExcelApi metadata */}
                    {apiInfo && (
                        <>
                            <Text className={styles.sectionLabel}>ExcelApi (workbook.queries)</Text>
                            <div className={styles.metaGrid}>
                                <span className={styles.metaKey}>loadedTo</span>
                                <span className={styles.metaVal}>{apiInfo.loadedTo}</span>
                                <span className={styles.metaKey}>loadedToDataModel</span>
                                <span className={styles.metaVal}>{String(apiInfo.loadedToDataModel)}</span>
                                <span className={styles.metaKey}>rowsLoadedCount</span>
                                <span className={styles.metaVal}>{apiInfo.rowsLoadedCount}</span>
                                <span className={styles.metaKey}>refreshDate</span>
                                <span className={styles.metaVal}>
                                    {apiInfo.refreshDate ? apiInfo.refreshDate.toISOString() : "(none)"}
                                </span>
                                <span className={styles.metaKey}>error</span>
                                <span className={styles.metaVal}>{apiInfo.error}</span>
                            </div>
                        </>
                    )}

                    {/* DataMashup metadata */}
                    {xmlMetadata && xmlMetadata.length > 0 && (
                        <>
                            <Text className={styles.sectionLabel}>DataMashup Metadata (customXml)</Text>
                            <div className={styles.metaGrid}>
                                {xmlMetadata.map((entry, i) => (
                                    <React.Fragment key={i}>
                                        <span className={styles.metaKey}>{entry.type}</span>
                                        <span className={styles.metaVal}>{decodeMetaValue(entry.value)}</span>
                                    </React.Fragment>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};
