import React, { useState } from 'react';
import {
  InputBase,
  IconButton,
  Box,
  Tooltip,
} from '@mui/material';
import { styled, alpha } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import GMaelstromIcon from './gMaelstromLogoSvg';
import { toast } from 'react-toastify';
import MenuProfile from './MenuProfile';
import MenuSettings from './MenuSettings';


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
  const [searchQuery, setSearchQuery] = useState('');

  const onSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const onSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    toast.info("TBD =)");
  };

  return <>

    <Tooltip title="gMaelstrom">
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <GMaelstromIcon sx={{ mr: 1, color: 'rgb(33, 150, 243)' }} />
      </Box>
    </Tooltip>

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