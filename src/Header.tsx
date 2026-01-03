import React, { useState } from 'react';
import {
  InputBase,
  IconButton,
  Box,
  Tooltip,
  Button,
  Typography,
} from '@mui/material';
import { styled, alpha } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import CreateIcon from '@mui/icons-material/Create';
import GMaelstromIcon from './gMaelstromLogoSvg';
import { toast } from 'react-toastify';
import MenuProfile from './MenuProfile';
import MenuSettings from './MenuSettings';
import MarkEmailUnreadIcon from '@mui/icons-material/MarkEmailUnread';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useApiDataCache } from './ctxApiDataCache';

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
  const cache = useApiDataCache();
  const [searchQuery, setSearchQuery] = useState('');
  const { selectedLabelId } = useApiDataCache();
  const [refreshing, setRefreshing] = useState(false);

  const onRefreshEmails = async () => {
    setRefreshing(true);
    await cache.fetchEmails(0, cache.pageSize);
    setRefreshing(false);
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
      <GMaelstromIcon sx={{ color: 'rgb(33, 150, 243)', fontSize: 30 }} />
    </Tooltip>

    <Button sx={{ ml: 1 }}
      variant="contained"
      color="primary"
      startIcon={<CreateIcon />}
      onClick={onComposeClick}
    >Compose</Button>

    <Tooltip title="Refresh emails">
      <IconButton sx={{ mx: '0 3em 0 0' }} size="large" onClick={onRefreshEmails} aria-label="Refresh emails" disabled={refreshing || cache.loading}>
        <RefreshIcon fontSize="small" />
      </IconButton>
    </Tooltip>

    <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', }}>
      <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
        {cache.labels?.[selectedLabelId]?.displayName}
      </Typography>

      <Box
        sx={{
          ml: '1em', px: 1, borderRadius: 2,
          border: theme => `2px solid ${theme.palette.divider}`,
          bgcolor: theme => theme.palette.mode === 'dark' ? '#232323' : '#fafbfc',
        }}
      >
        <Tooltip title="Mark as Read" disableInteractive>
          <span>
            <IconButton
              aria-label="Mark as Read"
              size="small"
              onClick={() => cache.markCheckedEmailIdsAsRead(true)}
              disabled={!cache.checkedEmailIds.ids.size}
            >
              <MarkEmailUnreadIcon />
            </IconButton>
          </span>
        </Tooltip>

        {/* Add more icon buttons here in the future */}

      </Box>
    </Box>

    <Box component="form" onSubmit={onSearchSubmit} sx={{ flexGrow: 1, mx: 2 }}>
      <Search>
        <SearchIconWrapper>
          <SearchIcon />
        </SearchIconWrapper>
        <SearchInput
          placeholder="Search mail…"
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