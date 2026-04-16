import React from "react";
import {
    MessageBar,
    MessageBarBody,
    MessageBarActions,
    Button,
    makeStyles,
} from "@fluentui/react-components";
import { DismissRegular } from "@fluentui/react-icons";

const useStyles = makeStyles({
    root: {
        marginTop: "8px",
    },
});

interface StatusBarProps {
    message: string | null;
    intent: "success" | "error" | "info" | "warning";
    onDismiss: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({ message, intent, onDismiss }) => {
    const styles = useStyles();

    if (!message) return null;

    return (
        <div className={styles.root}>
            <MessageBar intent={intent}>
                <MessageBarBody>{message}</MessageBarBody>
                <MessageBarActions
                    containerAction={
                        <Button
                            aria-label="Dismiss"
                            appearance="transparent"
                            icon={<DismissRegular />}
                            onClick={onDismiss}
                        />
                    }
                />
            </MessageBar>
        </div>
    );
};
