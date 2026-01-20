import React, { useEffect } from 'react';
import {
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Badge,
  Checkbox,
} from '@mui/material';
import IconButton from '@mui/material/IconButton';
import SettingsIcon from '@mui/icons-material/Settings';
import { useApiDataCache } from './ctxApiDataCache';
import { isRead } from './helpers/emailParser';
import { useResizableWidth } from './helpers/useResizableWidth';

const LabelsSidePanel: React.FC = () => {

  const cache = useApiDataCache();

  const { containerRef, width, handleProps } = useResizableWidth('labelsSidePanelWidth', 240, 100, 300);

  const getUnreadCount = (labelId: string) =>
    cache.messageHeadersCache.filter(email => (email.labelIds || []).includes(labelId) && !isRead(email)).length;

  //select the first label if none already selected
  useEffect(() => {
    if (!cache.selectedLabelId && !!cache.labels.sortedFiltered.length) {
      cache.setSelectedLabelId(cache.labels.sortedFiltered[0].id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cache.selectedLabelId, cache.labels.sortedFiltered]);


  return (
    <Box ref={containerRef} sx={{ position: 'relative', width: width, minWidth: width, height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ position: 'absolute', top: -8, left: -6, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
        <IconButton
          aria-label="label settings"
          size="small"
          onClick={() => cache.setLabelSettingsEditMode(prev => !prev)}
          sx={{
            opacity: cache.labelSettingsEditMode ? 1 : 0.35,
            transition: 'opacity 200ms ease',
            bgcolor: cache.labelSettingsEditMode ? 'action.selected' : 'transparent',
            pointerEvents: 'auto',
            '&:hover': { bgcolor: 'action.hover', opacity: 1 }
          }}
        >
          <SettingsIcon fontSize={cache.labelSettingsEditMode ? "large" : "small"} color={cache.labelSettingsEditMode ? 'primary' : 'inherit'} />
        </IconButton>
      </Box>

      <Box
        onPointerDown={handleProps.onPointerDown}
        sx={{
          position: 'absolute', top: 0, right: 0, bottom: 0, width: 8,
          cursor: 'col-resize', zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto'
        }}
      >
        <Box sx={{ width: 2, height: 28, borderRadius: 1, bgcolor: 'text.secondary', opacity: 0.28 }} />
      </Box>

      <List component="nav" dense aria-label="mail categories" sx={{ py: 0, overflowY: 'auto', overflowX: 'hidden', flex: 1, WebkitOverflowScrolling: 'touch' }}>

        {cache.labels?.sortedFiltered.map(label =>

          <ListItemButton
            dense
            key={label.id}
            selected={cache.selectedLabelId === label.id}
            onClick={() => cache.setSelectedLabelId(label.id)}
            sx={{ pr: 0 }}
          >
            <ListItemIcon sx={{ mt: "-3px", minWidth: 24, display: 'flex', justifyContent: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {label.icon}
              </Box>
            </ListItemIcon>

            {cache.labelSettingsEditMode && label.isSystem && (
              <Box sx={{ borderRadius: '50%', mt: "-3px", px: "5px", py: 0, bgcolor: "blue" }}>s</Box>
            )}

            <ListItemText primary={label.displayName}
              slotProps={{
                primary: {
                  noWrap: true,
                  fontWeight: 300,
                  fontSize: "13.7px",
                  lineHeight: 1.1,
                  my: -0.4 // 'my' sets the vertical gap between labels
                }
              }}
            />

            {getUnreadCount(label.id) > 0 && (
              <Badge
                badgeContent={getUnreadCount(label.id)}
                color="primary"
                sx={{ ml: 0.5 }}
              />
            )}

            {cache.labelSettingsEditMode && (
              <Checkbox
                sx={{
                  // alignSelf: 'center',
                  p: 0, // remove Checkbox padding
                  mr: 0.5,
                  '& .MuiSvgIcon-root': {
                    height: '15px', // 15px is approximately equal to label font size 13.7px + lineHeight 1.1 set above
                    // transform: 'scale(1.2)', // use >1 to enlarge the glyph inside the svg if it has internal whitespace
                  }
                }}
                size="small"
                checked={label.isVisible}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onChange={(e) => cache.labels.patchLabelItem(label, { isVisible: e.target.checked })}
                inputProps={{ 'aria-label': `Toggle visibility for ${label.displayName}` }}
              />
            )}

          </ListItemButton>
        )}

      </List>
    </Box>
  );
};

export default LabelsSidePanel;