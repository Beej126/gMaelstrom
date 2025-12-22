// Removed unused EmailItemProps interface
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Typography,
  Box,
  Chip,
  useTheme,
  Button,
  CircularProgress
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams, GridRowClassNameParams, GridRowParams } from '@mui/x-data-grid';
import { formatDistanceToNow } from 'date-fns';
import { useEmailContext } from '../app/ctxEmail';
import {
  getFrom,
  getSubject,
  getDate,
  isRead
} from '../helpers/emailParser';
import { useNavigate } from 'react-router-dom';

import { mui_DataGrid_Vars } from '../app/MUI.DataGrid.vars';

interface EmailListProps {
  checkedEmails?: Record<string, boolean>;
  setCheckedEmails?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

const EmailList: React.FC<EmailListProps> = ({ checkedEmails: checkedEmailsProp, setCheckedEmails: setCheckedEmailsProp }) => {
  const {
    emails,
    selectedEmail,
    loadMoreEmails,
    hasMoreEmails,
    loading,
    labelVisibility
  } = useEmailContext();

  const navigate = useNavigate();
  const [internalCheckedEmails, internalSetCheckedEmails] = useState<Record<string, boolean>>({});
  const checkedEmails = checkedEmailsProp ?? internalCheckedEmails;
  const setCheckedEmails = setCheckedEmailsProp ?? internalSetCheckedEmails;
  const theme = useTheme();
  const prettifyLabel = usePrettifyLabel();

  // Well-defined row height for DataGrid
  const rowHeight = 26; // Set to desired tightness (e.g., 36px)
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 50 });
  useEffect(() => {
    function updatePageSize() {
      const available = window.innerHeight - 250; // adjust for header, padding, etc.
      const rows = Math.max(10, Math.floor((available - mui_DataGrid_Vars['data-grid-header-height'] - mui_DataGrid_Vars['data-grid-footer-height']) / rowHeight));
      setPaginationModel((prev) => ({ ...prev, pageSize: rows }));
    }
    updatePageSize();
    window.addEventListener('resize', updatePageSize);
    return () => window.removeEventListener('resize', updatePageSize);
  }, [rowHeight]);

  // DataGrid columns
  const columns = useMemo<GridColDef[]>(() => [
    {
      field: 'checkbox',
      headerName: '',
      width: 40,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params: GridRenderCellParams) => (
        <input
          type="checkbox"
          checked={!!checkedEmails[params.row.id]}
          onChange={e => setCheckedEmails(prev => ({ ...prev, [params.row.id]: e.target.checked }))}
          style={{ cursor: 'pointer' }}
          aria-label="Select email"
        />
      ),
      resizable: false
    },
    {
      field: 'from',
      headerName: 'From',
      width: 130,
      valueGetter: (_unused: never, row: gapi.client.gmail.Message & { threadCount?: number }) => getFrom(row),
      resizable: true
    },
    {
      field: 'subject',
      headerName: 'Subject',
      width: 320,
      valueGetter: (_unused: never, row: gapi.client.gmail.Message & { threadCount?: number }) => getSubject(row),
      resizable: true
    },
    {
      field: 'attachment',
      headerName: 'Attachment',
      width: 32,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params: GridRenderCellParams<gapi.client.gmail.Message>) => (
        params.row?.payload?.parts?.some(part=> part.filename && part.filename.length > 0) ? (
          <span title="Has attachment">📎</span>
        ) : null
      ),
      resizable: false
    },
    {
      field: 'thread',
      headerName: 'Thread',
      width: 32,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params: GridRenderCellParams<gapi.client.gmail.Message & { threadCount?: number }>) => (
        params.row && params.row.threadCount && params.row.threadCount > 1 ? <span title="Threaded">→</span> : null
      ),
      resizable: false
    },
    {
      field: 'date',
      headerName: 'Date',
      width: 110,
      valueGetter: (_unused: never, row: gapi.client.gmail.Message & { threadCount?: number }) => formatDistanceToNow(getDate(row)),
      resizable: true
    },
    {
      field: 'labels',
      headerName: 'Labels',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', flexDirection: 'row', gap: 0.5, overflow: 'hidden' }}>
          {params.row.labelIds?.filter((label: string) => labelVisibility[label] !== false).map((label: string) => (
            <Chip key={label} label={prettifyLabel(label)} size="small" sx={{ height: 18, fontSize: '0.72rem', bgcolor: theme.palette.mode === 'light' ? '#e0e0e0' : '#444', color: theme.palette.text.primary, px: '0px', borderRadius: 1.5, fontWeight: 500, overflow: 'visible', textOverflow: 'clip', whiteSpace: 'nowrap' }} variant="outlined" />
          ))}
        </Box>
      ),
      resizable: true
    }
  ], [checkedEmails, setCheckedEmails, labelVisibility, prettifyLabel, theme]);

  // Prepare rows for DataGrid
  const rows = useMemo(() => emails.map(email => ({
    ...email,
    id: email.id,
    threadCount: emails.filter((e) => e.threadId && email.threadId && e.threadId === email.threadId).length
  })), [emails]);

  const handleRowClick = useCallback((params: GridRowParams) => {
    navigate(`/email/${params.row.id}`);
  }, [navigate]);

  return (
    <Box sx={{ width: '100%', height: '100%', minHeight: 300 }}>
      <DataGrid
        rows={rows}
        columns={columns}
        pagination
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        pageSizeOptions={[paginationModel.pageSize]}
        autoHeight={false}
        onRowClick={handleRowClick}
        loading={loading}
        disableRowSelectionOnClick
        checkboxSelection={false}
        getRowClassName={(params: GridRowClassNameParams<gapi.client.gmail.Message>) => {
          if (!params.row) return '';
          if (params.row.id === selectedEmail?.id) return 'Mui-selected';
          return isRead(params.row) ? 'email-read' : 'email-unread';
        }}
        rowHeight={rowHeight}
        sx={{
          border: 0,
          '& .MuiDataGrid-columnSeparator': { cursor: 'col-resize' },
          '& .MuiDataGrid-cell': { cursor: 'pointer' },
        }}
        slots={{
          noRowsOverlay: () => (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">No emails found</Typography>
            </Box>
          ),
        }}
        disableColumnMenu={false}
        disableColumnSelector={false}
        disableDensitySelector={false}
        // Enable horizontal scroll if needed
        hideFooterSelectedRowCount
      />
      {hasMoreEmails && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Button
            onClick={loadMoreEmails}
            disabled={loading}
            sx={{ textTransform: 'none', minWidth: '150px' }}
            variant="outlined"
            size="small"
          >
            {loading ? <CircularProgress size={20} sx={{ mr: 1 }} /> : 'Load older emails'}
          </Button>
        </Box>
      )}
    </Box>
  );
};

// Map of Gmail label IDs to friendly names
const LABEL_NAME_MAP: Record<string, string> = {
  INBOX: 'Inbox',
  SENT: 'Sent',
  DRAFT: 'Draft',
  SPAM: 'Spam',
  TRASH: 'Trash',
  IMPORTANT: 'Important',
  STARRED: 'Starred',
  UNREAD: 'Unread',
  PENDING: 'Pending',
  CATEGORY_UPDATES: 'Updates',
  CATEGORY_FORUMS: 'Forums',
  CATEGORY_PROMOTIONS: 'Promotions',
  CATEGORY_SOCIAL: 'Social',
  CATEGORY_PERSONAL: 'Personal',
  // Add more mappings as needed
};
// Creates a prettifyLabel function with access to the dynamic label map
const usePrettifyLabel = () => {
  const { dynamicLabelNameMap } = useEmailContext();
  
  return (labelId: string): string => {
    // Prefer dynamic label name from Gmail API, but prettify it if it looks like a system label
    if (dynamicLabelNameMap[labelId]) {
      let name = dynamicLabelNameMap[labelId];
      if (/^CATEGORY_/.test(labelId) || /_/.test(name)) {
        name = name.replace(/^CATEGORY_/, '').replace(/_/g, ' ');
        name = name.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
      }
      return name;
    }
    if (LABEL_NAME_MAP[labelId]) return LABEL_NAME_MAP[labelId];
    let label = labelId.replace(/^CATEGORY_/, '').replace(/_/g, ' ');
    label = label.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
    return label;
  };
};

export default EmailList;

// Add the following CSS to your global styles or a relevant CSS/SCSS file:
//
// .email-read .MuiDataGrid-cell {
//   font-weight: 500;
//   opacity: 0.85;
//   color: var(--mui-palette-text-secondary, #888);
// }
// .email-unread .MuiDataGrid-cell {
//   font-weight: 700;
//   opacity: 1;
//   color: var(--mui-palette-text-primary, #222);
// }