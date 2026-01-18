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

    const onToggleVisible = (labelId: string, visible: boolean) => cache.patchLabelItem(labelId, { visible });

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
                    {!!cache.labels?.count && (
                        <Box sx={{ gridColumn: '1 / -1', py: 1 }}>
                            No labels found.
                        </Box>
                    )}
                    {cache.labels?.sortedValues.map(label => (
                        <React.Fragment key={label.id}>
                            <Box>
                                {label.displayName}
                            </Box>
                            <Box>
                                <Switch
                                    edge="end"
                                    checked={!!label.visible}
                                    onChange={(_, checked) => onToggleVisible(label.id, checked)}
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
