import React, { useState, useMemo, useCallback } from 'react';
import { Box, Checkbox, IconButton, Tooltip, Typography } from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams, GridRowClassNameParams, GridRowParams } from '@mui/x-data-grid';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useApiDataCache } from './ctxApiDataCache';
import { markEmailsAsRead } from './gMailApi';
import { getFrom, getSubject, getDate, isRead } from './helpers/emailParser';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import MarkEmailUnreadIcon from '@mui/icons-material/MarkEmailUnread';
import RefreshIcon from '@mui/icons-material/Refresh';
import useMuiGridHelpers from './helpers/useMuiGridHelpers';

const emailRowHeight = 26;

const EmailList: React.FC = _ => {

  const cache = useApiDataCache();
  const navigate = useNavigate();
  const refGrid = useMuiGridHelpers(emailRowHeight, cache.setPageSize);

  const [checkedEmailIds, setCheckedEmailIds] = useState<Record<string, boolean>>({});
  const anyChecked = Object.values(checkedEmailIds).some(Boolean);
  const allEmailIds = Object.keys(checkedEmailIds);
  const allChecked = allEmailIds.length > 0 && allEmailIds.every(id => checkedEmailIds[id]);
  const someChecked = allEmailIds.some(id => checkedEmailIds[id]) && !allChecked;

  const { selectedLabelId } = useApiDataCache();
  const [refreshing, setRefreshing] = useState(false);

  const onMarkAsUnread = async () => {
    const selectedIds = Object.entries(checkedEmailIds)
      .filter(([_, checked]) => checked)
      .map(([id]) => id);
    if (!selectedIds.length) return;

    await markEmailsAsRead(selectedIds, false);
    setCheckedEmailIds({}); // Clear selection
  };

  const onRefreshEmails = async () => {
    setRefreshing(true);
    await cache.fetchEmails(0, cache.pageSize);
    setRefreshing(false);
  };

  const onRowClick = useCallback((params: GridRowParams<GridRowModel>) => {
    navigate(`/email/${params.row.id}`);
  }, [navigate]);

  const onCheckAll = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newChecked: Record<string, boolean> = {};
    for (const id of allEmailIds) newChecked[id] = event.target.checked;
    setCheckedEmailIds(newChecked);
  }, [allEmailIds]);


  const columns = useMemo<GridColDef[]>(() => [
    {
      field: 'checkbox',
      headerName: '',
      renderHeader: () => <Checkbox
        size="small"
        checked={allChecked}
        indeterminate={someChecked}
        onChange={onCheckAll}
        inputProps={{ 'aria-label': 'Select all emails' }}
        sx={{ p: 0, mr: 1 }}
      />,
      width: 40,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params: GridRenderCellParams) => (
        <Box onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={!!checkedEmailIds[params.row.id]}
            onChange={e => setCheckedEmailIds(prev => ({ ...prev, [params.row.id]: e.target.checked }))}
            style={{ cursor: 'pointer' }}
            aria-label="Select email"
          />
        </Box>
      ),
      resizable: false
    },
    {
      field: 'from',
      headerName: 'From',
      width: 130,
      valueGetter: (_unused: never, row: GridRowModel) => getFrom(row),
      resizable: true
    },
    {
      field: 'subject',
      headerName: 'Subject',
      flex: 1,
      minWidth: 320,
      valueGetter: (_unused: never, row: GridRowModel) => getSubject(row),
      resizable: true
    },
    {
      field: 'attachment',
      headerName: 'Attachment',
      renderHeader: () => <AttachFileIcon fontSize="small" titleAccess="Attachment" />,
      width: 32,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params: GridRenderCellParams<gapi.client.gmail.Message>) => (
        params.row?.payload?.parts?.some(part => part.filename && part.filename.length > 0) ? (
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
      renderCell: (params: GridRenderCellParams<GridRowModel>) => (
        params.row && params.row.threadCount && params.row.threadCount > 1 ? <span title="Threaded">→</span> : null
      ),
      resizable: false
    },
    {
      field: 'date',
      headerName: 'Date',
      width: 110,
      valueGetter: (_unused: never, row: GridRowModel) => {
        const date = getDate(row);
        return date ? formatDistanceToNow(date) : '';
      },
      resizable: true
    },
    {
      field: 'labels',
      headerName: 'Labels',
      // flex: 1,
      minWidth: 120,
      renderCell: (params: GridRenderCellParams) => {

        return (
          <Box sx={{ display: 'flex', flexDirection: 'row', gap: 0.5, overflow: 'hidden' }}>
            {params.row.labelIds?.map((labelId: string) => cache.labels?.[labelId]?.displayName).sort().join(', ')}
          </Box>
        );
      },
      resizable: true
    }
  ], [allChecked, cache.labels, checkedEmailIds, onCheckAll, someChecked]);


  interface GridRowModel extends gapi.client.gmail.Message { threadCount?: number };

  const gridRows = useMemo(() => {
    const pageEmails = cache.getPageEmails(cache.currentPage, cache.pageSize);
    return pageEmails.map((email: gapi.client.gmail.Message): GridRowModel => ({
      ...email,
      threadCount: pageEmails.filter((e: gapi.client.gmail.Message) => e.threadId && email.threadId && e.threadId === email.threadId).length
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cache.getPageEmails, cache.currentPage, cache.pageSize]);


  return <>
    <Box sx={{ display: 'flex', my: "2px" }}>

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
          <Tooltip title="Mark as Unread" disableInteractive>
            <span>
              <IconButton
                aria-label="Mark as Unread"
                size="small"
                onClick={onMarkAsUnread}
                disabled={!anyChecked}
              >
                <MarkEmailUnreadIcon />
              </IconButton>
            </span>
          </Tooltip>

          {/* Add more icon buttons here in the future */}

        </Box>
      </Box>

    </Box>

    {/* In 2026, the "two-Box" pattern is the standard fix for a fundamental conflict between how Flexbox calculates sizes and how the MUI DataGrid measures its available space.
The two containers serve distinct roles:

1. The Outer Box: Defining the Layout
The outer Box defines the available area.
It uses display: flex and height: 400 (or 100%) to stake out a claim in the UI.
Without this, the DataGrid has no reference point and may collapse to 0px or expand infinitely. 

2. The Inner Box: The "Sizing Sandbox"
The inner Box is the actual "fix." It acts as a buffer to solve two specific issues:
The Flex-Shrink Bug: By default, flex items have min-height: auto, which prevents them from shrinking smaller than their content. If the DataGrid has 50 rows, it will try to be 2000px tall. The inner Box with min-height: 0 breaks this, forcing the DataGrid to acknowledge the 400px limit and show its own scrollbars.
Resize Awareness: The DataGrid uses a ResizeObserver to detect its parent's size. If you place the DataGrid directly in a flex container, it sometimes fails to "shrink" because the flex parent is waiting for the child to define its size—a circular dependency. The inner Box provides a stable, non-flex container for the grid to measure.      */}

    <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }} ref={refGrid}>
      <DataGrid
        autoHeight={false}

        loading={cache.loading}
        rows={gridRows}
        rowHeight={emailRowHeight}
        rowCount={cache.totalEmails}
        onRowClick={onRowClick}
        getRowClassName={(params: GridRowClassNameParams<gapi.client.gmail.Message>) => {
          if (!params.row) return '';
          if (params.row.id === cache.selectedEmail?.id) return 'Mui-selected';
          return isRead(params.row) ? 'email-read' : 'email-unread';
        }}

        columns={columns}

        checkboxSelection={true}

        disableColumnFilter={true}
        sortingOrder={[]}

        paginationModel={{ page: cache.currentPage, pageSize: cache.pageSize }}
        onPaginationModelChange={({ page, pageSize }) => {
          cache.setPageSize(pageSize);
          if (page !== cache.currentPage) cache.setCurrentPage(page);
        }}
        pageSizeOptions={[cache.pageSize]}

      />
    </Box>
  </>;
};

export default EmailList;
