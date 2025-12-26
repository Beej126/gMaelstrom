import RefreshIcon from '@mui/icons-material/Refresh';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, Chip, useTheme } from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams, GridRowClassNameParams, GridRowParams } from '@mui/x-data-grid';
import { formatDistanceToNow } from 'date-fns';
import { useApiDataCache } from '../app/ctxApiDataCache';
import { getFrom, getSubject, getDate, isRead } from '../helpers/emailParser';
import { useNavigate } from 'react-router-dom';

const rowHeight = 26;

// to pass debug info to Cypress tests
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [index: string]: any;
  }
}

// Cypress cy.task logging for debug output in tests
// const cypressLog = (msg: string) => {
//   if (window.Cypress && window.cy && window.cy.task) {
//     window.cy.task('log', msg);
//   }
// };


const EmailList: React.FC<{
  checkedEmails?: Record<string, boolean>;
  setCheckedEmails?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}> = props => {

  const cache = useApiDataCache();

  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();
  const [internalCheckedEmails, internalSetCheckedEmails] = useState<Record<string, boolean>>({});
  const checkedEmails = props.checkedEmails ?? internalCheckedEmails;
  const setCheckedEmails = props.setCheckedEmails ?? internalSetCheckedEmails;
  const theme = useTheme();

  // Use the computed available height for both container and DataGrid
  const [containerHeight, setContainerHeight] = useState<number | undefined>(undefined);

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

  useEffect(() => {

    // Use ResizeObserver on .email-content for robust sizing
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
      const rows = Math.max(10, Math.floor(available / rowHeight));
      cache.setPageSize(rows);
      setContainerHeight(headerRowClient.clientHeight);
    };

    updatePageSizeAndHeight();

    const gridParent = document.querySelector('.email-content');
    const observer = new ResizeObserver(updatePageSizeAndHeight);
    observer.observe(gridParent as HTMLElement);

    return () => observer.unobserve(gridParent as HTMLElement);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  const prettifyLabel = useCallback((labelId: string): string => {
    // Try to find the label name from context.labels
    const found = Object.values(cache.labels).find(l => l.id === labelId);
    if (found) return found.name;
    let label = labelId.replace(/^CATEGORY_/, '').replace(/_/g, ' ');
    label = label.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
    return label;
  }, [cache.labels]);


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
      renderCell: (params: GridRenderCellParams<gapi.client.gmail.Message & { threadCount?: number }>) => (
        params.row && params.row.threadCount && params.row.threadCount > 1 ? <span title="Threaded">→</span> : null
      ),
      resizable: false
    },
    {
      field: 'date',
      headerName: 'Date',
      width: 110,
      valueGetter: (_unused: never, row: gapi.client.gmail.Message & { threadCount?: number }) => {
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
        // Only show labels that are visible in context.labels
        const visibleLabelIds = params.row.labelIds?.filter((labelId: string) => {
          const found = Object.values(cache.labels).find(l => l.id === labelId);
          return found ? found.visible !== false : true;
        }) ?? [];
        return (
          <Box sx={{ display: 'flex', flexDirection: 'row', gap: 0.5, overflow: 'hidden' }}>
            {visibleLabelIds.map((label: string) => (
              <Chip key={label} label={prettifyLabel(label)} size="small" sx={{ height: 18, fontSize: '0.72rem', bgcolor: theme.palette.mode === 'light' ? '#e0e0e0' : '#444', color: theme.palette.text.primary, px: '0px', borderRadius: 1.5, fontWeight: 500, overflow: 'visible', textOverflow: 'clip', whiteSpace: 'nowrap' }} variant="outlined" />
            ))}
          </Box>
        );
      },
      resizable: true
    }
  ], [checkedEmails, setCheckedEmails, cache.labels, prettifyLabel, theme]);


  // Prepare rows for DataGrid, pad to always match pageSize
  const rows = useMemo(() => {
    const pageEmails = cache.getPageEmails(cache.currentPage, cache.pageSize);
    const baseRows = pageEmails.map((email: gapi.client.gmail.Message) => ({
      ...email,
      id: email.id,
      threadCount: pageEmails.filter((e: gapi.client.gmail.Message) => e.threadId && email.threadId && e.threadId === email.threadId).length
    }));
    if (baseRows.length < cache.pageSize) {
      // Pad with empty rows to always fill the grid
      const emptyRows = Array.from({ length: cache.pageSize - baseRows.length }, (_, i) => ({ id: `empty-${i}`, isPlaceholder: true }));
      return [...baseRows, ...emptyRows];
    }
    return baseRows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cache.getPageEmails, cache.currentPage, cache.pageSize]);

  const handleRowClick = useCallback((params: GridRowParams) => {
    navigate(`/email/${params.row.id}`);
  }, [navigate]);


  const handleRefresh = async () => {
    setRefreshing(true);
    await cache.fetchEmails(0, cache.pageSize);
    setRefreshing(false);
  };


  return (
    <Box sx={{ width: '100%', height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
        <button
          onClick={handleRefresh}
          disabled={refreshing || cache.loading}
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 16px', borderRadius: 4, border: 'none', background: '#1976d2', color: '#fff', cursor: 'pointer', fontWeight: 500 }}
        >
          <RefreshIcon fontSize="small" /> Refresh
        </button>
      </Box>
      <div
        // ref={gridContainerRef}
        style={{ flex: 1, minHeight: 0, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
      >
        <DataGrid
          rows={rows}
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
          onRowClick={handleRowClick}
          loading={cache.loading}
          disableRowSelectionOnClick
          checkboxSelection={false}
          getRowClassName={(params: GridRowClassNameParams<gapi.client.gmail.Message>) => {
            if (!params.row) return '';
            if (params.row.id === cache.selectedEmail?.id) return 'Mui-selected';
            return isRead(params.row) ? 'email-read' : 'email-unread';
          }}
          rowHeight={rowHeight}
          sx={{
            border: 0,
            height: containerHeight ? `${containerHeight}px` : '100%',
            minHeight: 300,
            background: 'var(--email-content-bg)',
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
      </div>
    </Box>
  );
};

export default EmailList;