import React, { useEffect } from 'react';
import {
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Badge,
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
    if (!cache.selectedLabelId && cache.labels) {
      cache.setSelectedLabelId(cache.labels.sortedValues[0].id);
    }
  }, [cache.selectedLabelId, cache.labels, cache]);


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

        {cache.labels?.sortedValues.map(label =>

          <ListItemButton
            dense
            key={label.id}
            selected={cache.selectedLabelId === label.id}
            onClick={() => cache.setSelectedLabelId(label.id)}
            sx={{ pr: 0 }}
          >
            <ListItemIcon sx={{ minWidth: 24, mr: 1.25, display: 'flex', justifyContent: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {label.icon}
              </Box>
            </ListItemIcon>

            <ListItemText primary={label.displayName} sx={{ ml: -1, mr: 0 }}
              slotProps={{
                primary: {
                  noWrap: true,
                  fontWeight: 300, fontSize: "13.7px",
                  my: -0.4, // 'my' sets the vertical gap between labels
                  lineHeight: 1.1,
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

          </ListItemButton>
        )}

      </List>
    </Box>
  );
};

export default LabelsSidePanel;