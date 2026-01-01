import React, { useState, useEffect, useMemo, useCallback } from 'react';
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

const emailRowHeight = 26;

const EmailList: React.FC = _ => {

  const cache = useApiDataCache();
  const navigate = useNavigate();
  const [containerHeight, setContainerHeight] = useState<number | undefined>(undefined);

  const [checkedEmailIds, setCheckedEmailIds] = useState<Record<string, boolean>>({});
  const anyChecked = Object.values(checkedEmailIds).some(Boolean);
  const allEmailIds = Object.keys(checkedEmailIds);
  const allChecked = allEmailIds.length > 0 && allEmailIds.every(id => checkedEmailIds[id]);
  const someChecked = allEmailIds.some(id => checkedEmailIds[id]) && !allChecked;

  const { selectedLabelId: selectedCategory } = useApiDataCache();
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

  useEffect(() => {

    // Use ResizeObserver on .email-list-container for robust sizing
    const updatePageSizeAndHeight = () => {

      // Find the main content container
      const mainContent = document.querySelector('.MuiDataGrid-mainContent');
      if (!mainContent) return;

      // Get the immediate child (header_row_client)
      const headerRowClient = mainContent.firstElementChild as HTMLElement | null;
      if (!headerRowClient) return;

      // Get the top container (header)
      const topContainer = mainContent.querySelector('.MuiDataGrid-topContainer') as HTMLElement | null;
      if (!topContainer) return;

      // Calculate available height for rows
      const available = headerRowClient.clientHeight - topContainer.clientHeight;

      // Calculate max whole rows that fit
      const rows = Math.max(10, Math.floor(available / emailRowHeight));
      cache.setPageSize(rows);
      setContainerHeight(headerRowClient.clientHeight);
    };

    updatePageSizeAndHeight();

    const gridParent = document.querySelector('.email-list-container');
    const observer = new ResizeObserver(updatePageSizeAndHeight);
    observer.observe(gridParent as HTMLElement);

    return () => observer.unobserve(gridParent as HTMLElement);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      width: 320,
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
      width: 120,
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
          {selectedCategory}
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

    <Box className='email-list-container' sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <DataGrid
          disableColumnFilter={true}
          sortingOrder={[]}
          rows={gridRows}
          columns={columns}
          paginationModel={{ page: cache.currentPage, pageSize: cache.pageSize }}
          onPaginationModelChange={({ page, pageSize }) => {
            cache.setPageSize(pageSize);
            if (page !== cache.currentPage) cache.setCurrentPage(page);
          }}
          pageSizeOptions={[cache.pageSize]}
          rowCount={cache.totalEmails}
          paginationMode="server"
          autoHeight={false}
          onRowClick={onRowClick}
          loading={cache.loading}
          disableRowSelectionOnClick
          checkboxSelection={false}
          getRowClassName={(params: GridRowClassNameParams<gapi.client.gmail.Message>) => {
            if (!params.row) return '';
            if (params.row.id === cache.selectedEmail?.id) return 'Mui-selected';
            return isRead(params.row) ? 'email-read' : 'email-unread';
          }}
          rowHeight={emailRowHeight}
          sx={{
            border: 0,
            height: containerHeight ? `${containerHeight}px` : '100%',
            minHeight: 300,
            background: 'var(--email-list-container-bg)',
            '.MuiDataGrid-footerContainer': {
              background: 'var(--email-header-bg)',
              borderTop: '1px solid var(--border-color)',
            },
            '.MuiDataGrid-columnHeaders': {
              background: 'var(--email-header-bg)',
              borderBottom: '1px solid var(--border-color)',
            },
          }}
        />
    </Box>
  </>;
};

export default EmailList;

// to pass debug info to Cypress tests
// declare global {
//   interface Window {
//     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//     [index: string]: any;
//   }
// }

// Cypress cy.task logging for debug output in tests
// const cypressLog = (msg: string) => {
//   if (window.Cypress && window.cy && window.cy.task) {
//     window.cy.task('log', msg);
//   }
// };

// Diagnostic: Log DataGrid DOM element heights to Cypress
// useEffect(() => {
//   if (
//     typeof window !== 'undefined' &&
//     window.Cypress &&
//     gridContainerRef.current &&
//     typeof containerHeight === 'number'
//   ) {
//     const gridRoot = gridContainerRef.current.querySelector('.MuiDataGrid-root');
//     const virtualScroller = gridContainerRef.current.querySelector('.MuiDataGrid-virtualScroller');
//     const footer = gridContainerRef.current.querySelector('.MuiDataGrid-footerContainer');
//     const header = gridContainerRef.current.querySelector('.MuiDataGrid-columnHeaders');
//     cypressLog('[DIAG] containerHeight: ' + containerHeight);
//     if (gridRoot) cypressLog('[DIAG] .MuiDataGrid-root height: ' + gridRoot.clientHeight);
//     if (virtualScroller) cypressLog('[DIAG] .MuiDataGrid-virtualScroller height: ' + virtualScroller.clientHeight);
//     if (footer) cypressLog('[DIAG] .MuiDataGrid-footerContainer height: ' + footer.clientHeight);
//     if (header) cypressLog('[DIAG] .MuiDataGrid-columnHeaders height: ' + header.clientHeight);
//   }
// }, [containerHeight]);


// Diagnostic: Log DataGrid DOM element heights to Cypress for overflow debugging
// useEffect(() => {
//   if (
//     typeof window !== 'undefined' &&
//     window.Cypress &&
//     gridContainerRef.current &&
//     typeof containerHeight === 'number'
//   ) {
//     const gridRoot = gridContainerRef.current.querySelector('.MuiDataGrid-root');
//     if (gridRoot) {
//       const virtualScroller = gridRoot.querySelector('.MuiDataGrid-virtualScroller');
//       const footer = gridRoot.querySelector('.MuiDataGrid-footerContainer');
//       const header = gridRoot.querySelector('.MuiDataGrid-columnHeaders');
//       const body = gridRoot.querySelector('.MuiDataGrid-main');
//       window.__EMAILGRID_DEBUG__ = {
//         containerHeight,
//         gridRootHeight: gridRoot ? gridRoot.clientHeight : undefined,
//         virtualScrollerHeight: virtualScroller ? virtualScroller.clientHeight : undefined,
//         footerHeight: footer ? footer.clientHeight : undefined,
//         headerHeight: header ? header.clientHeight : undefined,
//         bodyHeight: body ? body.clientHeight : undefined,
//       };
//       cypressLog(`DOM_DIAG: ${JSON.stringify(window.__EMAILGRID_DEBUG__)}`);
//     }
//   }
// }, [containerHeight]);

