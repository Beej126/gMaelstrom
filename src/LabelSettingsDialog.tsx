import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Button,
    Switch,
    Box
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useApiDataCache } from './ctxApiDataCache';


const LabelSettingsDialog: React.FC<{
    open: boolean;
    onClose: () => void;
}> = props => {
    const cache = useApiDataCache();

    // Get all labels as array, sorted alphabetically by name
    const sortedLabels = Object.values(cache.labels).sort((a, b) => a.name.localeCompare(b.name));

    // Toggle label visibility by updating the ExtendedLabel.visible property
    const handleToggle = (labelId: string) => {
        const updated = { ...cache.labels };
        for (const key in updated) {
            if (updated[key].id === labelId) {
                updated[key] = { ...updated[key], visible: !updated[key].visible };
            }
        }
        cache.setLabels(updated);
    };

    return (
        <Dialog open={props.open} onClose={props.onClose} maxWidth={false}
            PaperProps={{
                sx: {
                    width: 'auto',
                    minWidth: 240,
                    height: '70vh',
                    maxHeight: '70vh',
                }
            }}
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
                Label Visibility
                <Button onClick={props.onClose} sx={{ minWidth: 0, p: 0.5 }} color="inherit">
                    <CloseIcon />
                </Button>
            </DialogTitle>
            <DialogContent>
                <Box sx={{
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    alignItems: 'center',
                    rowGap: 0,
                }}>
                    {sortedLabels.length === 0 && (
                        <Box sx={{ gridColumn: '1 / -1', py: 1 }}>
                            No labels found.
                        </Box>
                    )}
                    {sortedLabels.map(label => (
                        <React.Fragment key={label.id}>
                            <Box>
                                {label.name}
                                {/* You can now access label.type, label.color, etc. here */}
                            </Box>
                            <Box>
                                <Switch
                                    edge="end"
                                    checked={!!label.visible}
                                    onChange={() => handleToggle(label.id)}
                                    inputProps={{ 'aria-label': `Show label ${label.name}` }}
                                />
                            </Box>
                        </React.Fragment>
                    ))}
                </Box>
            </DialogContent>
        </Dialog>
    );
};

export default LabelSettingsDialog;
