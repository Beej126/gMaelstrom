import React, { useEffect, useState } from 'react';
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

const Sidebar: React.FC = () => {

  const cache = useApiDataCache();
  const [editMode, setEditMode] = useState(false);
  // sidebar UI state

  const getUnreadCount = (labelId: string) =>
    cache.messageHeadersCache.filter(email => (email.labelIds || []).includes(labelId) && !isRead(email)).length;

  //select the first label if none already selected
  useEffect(() => {
    if (!cache.selectedLabelId && cache.labels) {
      cache.setSelectedLabelId(cache.labels.sortedValues[0].id);
    }
  }, [cache.selectedLabelId, cache.labels, cache]);

  // hover on the sidebar will control gear opacity via CSS

  

  return (
    <Box sx={{ position: 'relative' }}>
      <Box sx={{ position: 'absolute', top: -10, left: 6, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
        <IconButton
          className="gearBtn"
          aria-label="label settings"
          size="small"
          onClick={() => setEditMode(e => !e)}
          sx={{
            opacity: 0.14,
            transition: 'opacity 200ms ease',
            bgcolor: editMode ? 'action.selected' : 'transparent',
            pointerEvents: 'auto',
            '&:hover': { bgcolor: 'action.hover', opacity: 1 }
          }}
        >
          <SettingsIcon fontSize="small" color={editMode ? 'primary' : 'inherit'} />
        </IconButton>
      </Box>

      {/** Resizing is handled by parent `Split` in App.tsx; local handle removed. */}

      <List component="nav" dense aria-label="mail categories" sx={{ py: 0, overflowY: 'auto', overflowX: 'hidden' }}>

      {cache.labels?.sortedValues.map(label =>

        <ListItemButton
          dense
          key={label.id}
          selected={cache.selectedLabelId === label.id}
          onClick={() => cache.setSelectedLabelId(label.id)}
        >
          <ListItemIcon sx={{ minWidth: 0.13, mr: 1.3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {label.icon}
            </Box>
          </ListItemIcon>

          <ListItemText primary={label.displayName} sx={{ ml: -1, mr: 0 }}
          slotProps={{ primary: { fontWeight: 300, fontSize: "13px", lineHeight: 1.3 } }}
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

export default Sidebar;