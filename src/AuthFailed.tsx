import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { useUser } from './services/gAuthApi';
import { Alert, Box } from '@mui/material';

export const AuthFailed: React.FC = () => {

  const user = useUser();
  const [google_auth_readme_md, setMd] = useState<string>();
  useEffect(() => { fetch('/readme_google_auth.md').then(res => res.text()).then(setMd); }, []);

  return !user ? undefined :

    user?.authFailed ? (<>
      <Alert severity="error" >
        Sign in error. Please refresh to try again.
      </Alert>

      <Box sx={{
        flex: '1 1 auto',
        minHeight: 0,
        overflow: 'auto',
        width: '800px',
        display: 'flex',
        flexDirection: 'column',
        fontSize: '14px',
        fontWeight: 300,
        margin: '-1em 1em 1em',

        // Nested selector with ampersand
        '& > ol > li': {
          marginTop: '0.5em',
        }
      }}>
        <ReactMarkdown rehypePlugins={[rehypeRaw]}>{google_auth_readme_md}</ReactMarkdown>
      </Box>

    </>) : undefined;
};