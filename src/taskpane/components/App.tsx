import React from "react";
import { makeStyles, tokens, Text } from "@fluentui/react-components";
import { InspectorTab } from "./InspectorTab";

const useStyles = makeStyles({
    root: {
        padding: "10px 12px",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        boxSizing: "border-box",
        fontFamily: tokens.fontFamilyBase,
        overflow: "hidden",
        borderTop: `3px solid ${tokens.colorBrandBackground}`,
    },
    header: {
        marginBottom: "6px",
        flexShrink: 0,
    },
    title: {
        fontSize: tokens.fontSizeBase400,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorBrandForeground1,
        display: "block",
    },
    content: {
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
    },
});

export default function App() {
    const styles = useStyles();

    return (
        <div className={styles.root}>
            <div className={styles.header}>
                <Text className={styles.title}>PQ Parser</Text>
            </div>
            <div className={styles.content}>
                <InspectorTab />
            </div>
        </div>
    );
}
