import React from 'react';
import {
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Badge,
} from '@mui/material';
import { useApiDataCache } from './ctxApiDataCache';
import { isRead } from './helpers/emailParser';

const Sidebar: React.FC = () => {

  const cache = useApiDataCache();

  const getUnreadCount = (labelId: string) =>
    cache.messageHeadersCache.filter(email => (email.labelIds || []).includes(labelId) && !isRead(email)).length;

  const onLabelClick = (labelId: string) => {
    cache.setSelectedLabelId(labelId);
  };

  return (
    <List component="nav" dense aria-label="mail categories" sx={{ py: 0, overflowY: 'auto', overflowX: 'hidden' }}>

      {Object.values(cache.labels || {}).map(label =>

        <ListItemButton
          dense
          key={label.id}
          selected={cache.selectedLabelId === label.id}
          onClick={() => onLabelClick(label.id)}
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
  );
};

export default Sidebar;