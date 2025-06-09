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
import { useEmailContext } from '../context/EmailContext';

const LabelSettingsDialog: React.FC = () => {
    const {
        labelSettingsOpen,
        setLabelSettingsOpen,
        labelVisibility,
        setLabelVisibility,
        dynamicLabelNameMap
    } = useEmailContext();

    // Get all label IDs and names, sorted alphabetically by name
    const labelEntries = Object.entries(dynamicLabelNameMap).sort((a, b) =>
        a[1].localeCompare(b[1])
    );

    // Ensure all labels are ON by default if not present in labelVisibility
    React.useEffect(() => {
        if (labelEntries.length > 0) {
            const newVisibility = { ...labelVisibility };
            let changed = false;
            for (const [labelId] of labelEntries) {
                if (!(labelId in newVisibility)) {
                    newVisibility[labelId] = true;
                    changed = true;
                }
            }
            if (changed) {
                setLabelVisibility(newVisibility);
                localStorage.setItem('gMaelstrom_labelVisibility', JSON.stringify(newVisibility));
            }
        }
    }, [labelEntries]);

    const handleToggle = (labelId: string) => {
        const newVisibility = {
            ...labelVisibility,
            [labelId]: !labelVisibility[labelId]
        };
        setLabelVisibility(newVisibility);
        // Save to localStorage for persistence
        localStorage.setItem('gMaelstrom_labelVisibility', JSON.stringify(newVisibility));
    };

    const handleClose = () => {
        setLabelSettingsOpen(false);
    };

    return (
        <Dialog open={labelSettingsOpen} onClose={handleClose} maxWidth={false}
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
                <Button onClick={handleClose} sx={{ minWidth: 0, p: 0.5 }} color="inherit">
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
                    {/* Headings row */}
                    <Box />
                    <Box sx={{ fontWeight: 600, fontSize: '1em', py: 1, pl: 0, justifySelf:'end' }}>
                        Chips
                    </Box>
                    {labelEntries.length === 0 && (
                        <Box sx={{ gridColumn: '1 / -1', py: 1 }}>
                            No labels found.
                        </Box>
                    )}
                    {labelEntries.map(([labelId, labelName]) => (
                        <React.Fragment key={labelId}>
                            <Box>
                                {labelName}
                            </Box>
                            <Box>
                                <Switch
                                    edge="end"
                                    checked={!!labelVisibility[labelId]}
                                    onChange={() => handleToggle(labelId)}
                                    inputProps={{ 'aria-label': `Show label ${labelName}` }}
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
