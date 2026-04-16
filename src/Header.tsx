import React, { useState } from 'react';
import {
  InputBase,
  IconButton,
  Box,
  Tooltip,
  Button,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { styled, alpha } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import CreateIcon from '@mui/icons-material/Create';
import GMaelstromIcon from './AppLogoSvg';
import { toast } from 'react-toastify';
import MenuProfile from './HeaderMenu_Profile';
import MenuSettings from './HeaderMenu_Settings';
import MarkEmailUnreadIcon from '@mui/icons-material/MarkEmailUnread';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useDataCache } from './services/ctxDataCache';

const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.mode === 'dark'
    ? alpha(theme.palette.common.white, 0.15)
    : alpha(theme.palette.common.black, 0.05),
  '&:hover': {
    backgroundColor: theme.palette.mode === 'dark'
      ? alpha(theme.palette.common.white, 0.25)
      : alpha(theme.palette.common.black, 0.1),
  },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  display: 'flex',
  alignItems: 'center',
}));

const SearchInput = styled(InputBase)(({ theme }) => ({
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
  },
}));

const Header: React.FC = () => {
  const cache = useDataCache();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const onRefreshEmails = async () => {
    setRefreshing(true);
    await cache.refreshCurrentView();
    setRefreshing(false);
  };

  const onModeChange = (_event: React.MouseEvent<HTMLElement>, nextMode: 'threads' | 'messages' | null) => {
    if (!nextMode) return;
    cache.switchViewMode(nextMode);
  };

  const onSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const onSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    toast.info("TBD =)");
  };

  const onComposeClick = () => {
    toast.info("TBD =)");
  };
  return <>

    <Tooltip title="gMaelstrom">
      <GMaelstromIcon sx={{ color: 'rgb(33, 150, 243)', fontSize: 30, cursor: 'pointer' }} onClick={() => window.location.reload()} />
    </Tooltip>

    <Typography variant="h6" component="div" sx={{ fontWeight: 600, ml: 1 }}>
      {cache.labels.byId(cache.selectedLabelId)?.displayName}
    </Typography>

    <Tooltip title="Refresh email list">
      <IconButton sx={{ left: -5, width: 35 }} size="large" onClick={onRefreshEmails} aria-label="Refresh email list" disabled={refreshing || cache.loading}>
        <RefreshIcon fontSize="small" />
      </IconButton>
    </Tooltip>

    <Box
      sx={{
        mr: 1.5,
        px: 1, borderRadius: 2,
        border: theme => `2px solid ${theme.palette.divider}`,
        bgcolor: theme => theme.palette.mode === 'dark' ? '#232323' : '#fafbfc',
      }}
    >
      <Tooltip title={cache.viewMode === 'threads' ? 'Mark selected threads as read' : 'Mark selected emails as read'} disableInteractive>
        <span>
          <IconButton
            aria-label={cache.viewMode === 'threads' ? 'Mark selected threads as read' : 'Mark selected emails as read'}
            size="small"
            onClick={() => cache.markCheckedRowIdsAsRead(true)}
            disabled={!cache.checkedRowIds.ids.size}
          >
            <MarkEmailUnreadIcon />
          </IconButton>
        </span>
      </Tooltip>

    </Box>

    <Button
      variant="contained"
      color="primary"
      startIcon={<CreateIcon />}
      onClick={onComposeClick}
    >Compose</Button>

    <ToggleButtonGroup
      exclusive
      size="small"
      value={cache.viewMode}
      onChange={onModeChange}
      sx={{ ml: 1.5, borderRadius: 2, overflow: 'hidden' }}
    >
      <ToggleButton value="messages" aria-label="Messages mode">
        Messages
      </ToggleButton>
      <ToggleButton value="threads" aria-label="Threads mode">
        Threads
      </ToggleButton>
    </ToggleButtonGroup>

    <Box component="form" onSubmit={onSearchSubmit} sx={{ flexGrow: 1, mx: 2 }}>
      <Search>
        <SearchIconWrapper>
          <SearchIcon />
        </SearchIconWrapper>
        <SearchInput
          placeholder="Search for emails…"
          inputProps={{ 'aria-label': 'search' }}
          value={searchQuery}
          onChange={onSearchChange}
          fullWidth
        />
      </Search>
    </Box>

    <Tooltip title="Help">
      <IconButton sx={{ mx: -0.75 }} size="large" component="a" href="https://github.com/Beej126/gMaelstrom#readme" target="_blank" rel="noopener noreferrer">
        <HelpOutlineIcon />
      </IconButton>
    </Tooltip>

    <MenuSettings />

    <MenuProfile />

  </>;
};

export default Header;