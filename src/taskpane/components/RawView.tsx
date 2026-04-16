import React from "react";
import {
    makeStyles,
    tokens,
    Text,
} from "@fluentui/react-components";
import { ParsedMashup } from "../../types";
import { CodeBlock } from "./CodeBlock";

const useStyles = makeStyles({
    root: {
        display: "flex",
        flexDirection: "column",
        gap: "10px",
    },
    section: {
        display: "flex",
        flexDirection: "column",
        gap: "4px",
    },
    label: {
        fontSize: tokens.fontSizeBase100,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground3,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
    },
    infoRow: {
        display: "flex",
        gap: "12px",
        flexWrap: "wrap",
    },
    infoItem: {
        display: "flex",
        flexDirection: "column",
        gap: "2px",
        padding: "4px 8px",
        backgroundColor: tokens.colorNeutralBackground2,
        borderRadius: tokens.borderRadiusMedium,
    },
    infoValue: {
        fontFamily: "Consolas, monospace",
        fontSize: tokens.fontSizeBase200,
        fontWeight: tokens.fontWeightSemibold,
    },
    infoLabel: {
        fontSize: "10px",
        color: tokens.colorNeutralForeground3,
    },
    entryList: {
        fontFamily: "Consolas, monospace",
        fontSize: "11px",
        padding: "6px 8px",
        backgroundColor: tokens.colorNeutralBackground3,
        borderRadius: tokens.borderRadiusMedium,
    },
    entry: {
        display: "flex",
        justifyContent: "space-between",
    },
    entryName: {
        overflow: "hidden",
        textOverflow: "ellipsis",
    },
    entrySize: {
        color: tokens.colorNeutralForeground3,
        flexShrink: 0,
        marginLeft: "8px",
    },
});

interface RawViewProps {
    mashup: ParsedMashup;
}

export const RawView: React.FC<RawViewProps> = ({ mashup }) => {
    const styles = useStyles();
    const { raw } = mashup;

    return (
        <div className={styles.root}>
            {/* Binary header info */}
            <div className={styles.section}>
                <Text className={styles.label}>Binary Header</Text>
                <div className={styles.infoRow}>
                    <div className={styles.infoItem}>
                        <Text className={styles.infoValue}>0x{raw.version.toString(16).padStart(8, "0")}</Text>
                        <Text className={styles.infoLabel}>Version</Text>
                    </div>
                    <div className={styles.infoItem}>
                        <Text className={styles.infoValue}>{raw.packageSize.toLocaleString()} B</Text>
                        <Text className={styles.infoLabel}>Package Size</Text>
                    </div>
                    <div className={styles.infoItem}>
                        <Text className={styles.infoValue}>{mashup.queries.length}</Text>
                        <Text className={styles.infoLabel}>Queries</Text>
                    </div>
                </div>
            </div>

            {/* OPC ZIP entries */}
            <div className={styles.section}>
                <Text className={styles.label}>OPC Entries ({raw.opcEntries.length})</Text>
                <div className={styles.entryList}>
                    {raw.opcEntries.map((e) => (
                        <div key={e.name} className={styles.entry}>
                            <span className={styles.entryName}>{e.name}</span>
                            <span className={styles.entrySize}>{e.size > 0 ? `${e.size}B` : ""}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Section1.m */}
            <div className={styles.section}>
                <Text className={styles.label}>Section1.m</Text>
                <CodeBlock code={raw.section1m || "(empty)"} maxHeight="300px" />
            </div>

            {/* Full XML */}
            <div className={styles.section}>
                <Text className={styles.label}>DataMashup XML</Text>
                <CodeBlock code={formatXmlForDisplay(raw.xml)} maxHeight="200px" />
            </div>
        </div>
    );
};

function formatXmlForDisplay(xml: string): string {
    // Show first 2000 chars of XML to avoid performance issues
    if (xml.length > 2000) {
        return xml.slice(0, 2000) + "\n... (truncated)";
    }
    return xml;
}
