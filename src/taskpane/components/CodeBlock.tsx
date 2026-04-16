import React, { useCallback } from "react";
import { makeStyles, tokens, Button, Tooltip } from "@fluentui/react-components";
import { CopyRegular, CheckmarkRegular } from "@fluentui/react-icons";

const useStyles = makeStyles({
    root: {
        position: "relative",
    },
    pre: {
        backgroundColor: tokens.colorNeutralBackground3,
        borderRadius: tokens.borderRadiusMedium,
        padding: "8px 10px",
        margin: 0,
        fontFamily: "Consolas, 'Courier New', monospace",
        fontSize: "11px",
        lineHeight: "1.45",
        overflowX: "auto",
        overflowY: "auto",
        whiteSpace: "pre-wrap",
        wordBreak: "break-all",
        color: tokens.colorNeutralForeground1,
        maxHeight: "200px",
    },
    copyBtn: {
        position: "absolute",
        top: "4px",
        right: "4px",
        minWidth: "24px",
        height: "24px",
        padding: "2px",
    },
});

interface CodeBlockProps {
    code: string;
    maxHeight?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, maxHeight }) => {
    const styles = useStyles();
    const [copied, setCopied] = React.useState(false);

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(code).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    }, [code]);

    return (
        <div className={styles.root}>
            <pre className={styles.pre} style={maxHeight ? { maxHeight } : undefined}>
                {code}
            </pre>
            <Tooltip content={copied ? "Copied!" : "Copy"} relationship="label">
                <Button
                    className={styles.copyBtn}
                    appearance="subtle"
                    size="small"
                    icon={copied ? <CheckmarkRegular /> : <CopyRegular />}
                    onClick={handleCopy}
                />
            </Tooltip>
        </div>
    );
};
