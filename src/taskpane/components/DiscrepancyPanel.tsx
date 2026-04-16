import React from "react";
import {
    makeStyles,
    tokens,
    Text,
    MessageBar,
    MessageBarBody,
} from "@fluentui/react-components";
import { WarningRegular } from "@fluentui/react-icons";
import { Discrepancy } from "../../types";

const useStyles = makeStyles({
    root: {
        marginTop: "8px",
        marginBottom: "4px",
    },
    header: {
        display: "flex",
        alignItems: "center",
        gap: "4px",
        marginBottom: "4px",
    },
    title: {
        fontSize: tokens.fontSizeBase200,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorStatusWarningForeground1,
    },
    item: {
        marginBottom: "4px",
    },
});

interface DiscrepancyPanelProps {
    discrepancies: Discrepancy[];
}

export const DiscrepancyPanel: React.FC<DiscrepancyPanelProps> = ({ discrepancies }) => {
    const styles = useStyles();

    if (discrepancies.length === 0) return null;

    return (
        <div className={styles.root}>
            <div className={styles.header}>
                <WarningRegular style={{ color: tokens.colorStatusWarningForeground1, fontSize: "14px" }} />
                <Text className={styles.title}>
                    Discrepancies ({discrepancies.length})
                </Text>
            </div>
            {discrepancies.map((d, i) => (
                <div key={i} className={styles.item}>
                    <MessageBar intent="warning" layout="auto">
                        <MessageBarBody>
                            <strong>{d.queryName}</strong> — {d.detail}
                        </MessageBarBody>
                    </MessageBar>
                </div>
            ))}
        </div>
    );
};
