
import RefreshIcon from '@mui/icons-material/Refresh';
// Extend Window interface for __EMAILGRID_DEBUG__
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Box, Chip, useTheme } from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams, GridRowClassNameParams, GridRowParams } from '@mui/x-data-grid';
import { formatDistanceToNow } from 'date-fns';
import { useEmailContext } from '../app/ctxEmail';
import { getFrom, getSubject, getDate, isRead } from '../helpers/emailParser';
import { useNavigate } from 'react-router-dom';
import { mui_DataGrid_Vars } from '../app/MUI.DataGrid.vars';

// to pass debug info to Cypress tests
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    __EMAILGRID_DEBUG__?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Cypress?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cy?: any;
  }
}

// Cypress cy.task logging for debug output in tests
const cypressLog = (msg: string) => {
  if (window.Cypress && window.cy && window.cy.task) {
    window.cy.task('log', msg);
  }
};


const EmailList: React.FC<{
  checkedEmails?: Record<string, boolean>;
  setCheckedEmails?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}> = props => {

  const rowHeight = 26; // Set to desired tightness (e.g., 36px)
  const headerHeight = mui_DataGrid_Vars.dataGridHeaderHeight;
  const footerHeight = mui_DataGrid_Vars.dataGridFooterHeight;

  const [refreshing, setRefreshing] = useState(false);

  const {
    getPageEmails,
    fetchEmails,
    selectedEmail,
    loading,
    labelVisibility,
    totalEmails,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize
  } = useEmailContext() as ReturnType<typeof useEmailContext> & { getPageEmails: (page: number, pageSize: number) => gapi.client.gmail.Message[] };

  const navigate = useNavigate();
  const [internalCheckedEmails, internalSetCheckedEmails] = useState<Record<string, boolean>>({});
  const checkedEmails = props.checkedEmails ?? internalCheckedEmails;
  const setCheckedEmails = props.setCheckedEmails ?? internalSetCheckedEmails;
  const theme = useTheme();

  // Use the computed available height for both container and DataGrid
  const [containerHeight, setContainerHeight] = useState<number | undefined>(undefined);
  // const [rowsToShow, setRowsToShow] = useState<number>(10);

  // Sync DataGrid pagination with context
  const [paginationModel, setPaginationModel] = useState({ page: currentPage, pageSize });


  // Diagnostic: Log DataGrid DOM element heights to Cypress
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.Cypress &&
      gridContainerRef.current &&
      typeof containerHeight === 'number'
    ) {
      const gridRoot = gridContainerRef.current.querySelector('.MuiDataGrid-root');
      const virtualScroller = gridContainerRef.current.querySelector('.MuiDataGrid-virtualScroller');
      const footer = gridContainerRef.current.querySelector('.MuiDataGrid-footerContainer');
      const header = gridContainerRef.current.querySelector('.MuiDataGrid-columnHeaders');
      cypressLog('[DIAG] containerHeight: ' + containerHeight);
      if (gridRoot) cypressLog('[DIAG] .MuiDataGrid-root height: ' + gridRoot.clientHeight);
      if (virtualScroller) cypressLog('[DIAG] .MuiDataGrid-virtualScroller height: ' + virtualScroller.clientHeight);
      if (footer) cypressLog('[DIAG] .MuiDataGrid-footerContainer height: ' + footer.clientHeight);
      if (header) cypressLog('[DIAG] .MuiDataGrid-columnHeaders height: ' + header.clientHeight);
    }
  }, [containerHeight]);


  useEffect(() => {
    // Use ResizeObserver on .email-content for robust sizing
    let observer: ResizeObserver | undefined;
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
      setPageSize(rows);
      setPaginationModel((prev) => prev.pageSize === rows ? prev : { ...prev, pageSize: rows });
      // Set container height to headerRowClient height
      setContainerHeight(headerRowClient.clientHeight);
    };
    updatePageSizeAndHeight();
    const gridParent = document.querySelector('.email-content');
    if (gridParent && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        updatePageSizeAndHeight();
      });
      observer.observe(gridParent as HTMLElement);
    }
    return () => {
      if (observer && gridParent) observer.unobserve(gridParent as HTMLElement);
    };
  }, [rowHeight, setPageSize, headerHeight, footerHeight, totalEmails]);


  // Fetch page when pagination changes
  useEffect(() => {
    console.log('[EmailList] useEffect pagination', paginationModel);
    fetchEmails(paginationModel.page, paginationModel.pageSize);
    if (currentPage !== paginationModel.page) setCurrentPage(paginationModel.page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginationModel.page, paginationModel.pageSize, fetchEmails, setCurrentPage, currentPage]);


  const prettifyLabel = useCallback((labelId: string): string => {
    // Prefer dynamic label name from context, but prettify if it looks like a system label
    if (typeof labelVisibility === 'object' && labelId in labelVisibility) {
      // If labelVisibility has a name mapping, use it (not always true)
      // But we don't have dynamicLabelNameMap here, so just prettify
    }
    let label = labelId.replace(/^CATEGORY_/, '').replace(/_/g, ' ');
    label = label.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
    return label;
  }, [labelVisibility]);


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

  // Prepare rows for DataGrid, pad to always match pageSize
  const rows = useMemo(() => {
    const pageEmails = getPageEmails(paginationModel.page, paginationModel.pageSize);
    const baseRows = pageEmails.map((email: gapi.client.gmail.Message) => ({
      ...email,
      id: email.id,
      threadCount: pageEmails.filter((e: gapi.client.gmail.Message) => e.threadId && email.threadId && e.threadId === email.threadId).length
    }));
    if (baseRows.length < paginationModel.pageSize) {
      // Pad with empty rows to always fill the grid
      const emptyRows = Array.from({ length: paginationModel.pageSize - baseRows.length }, (_, i) => ({ id: `empty-${i}`, isPlaceholder: true }));
      return [...baseRows, ...emptyRows];
    }
    return baseRows;
  }, [getPageEmails, paginationModel.page, paginationModel.pageSize]);

  const handleRowClick = useCallback((params: GridRowParams) => {
    navigate(`/email/${params.row.id}`);
  }, [navigate]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchEmails(0, pageSize);
    setRefreshing(false);
  };



  // Use 100% height to fit parent, let parent control the height
  // Ref for the grid container
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const pageSizeRef = useRef(pageSize);
  const paginationModelRef = useRef(paginationModel);
  // Keep refs in sync
  useEffect(() => { pageSizeRef.current = pageSize; }, [pageSize]);
  useEffect(() => { paginationModelRef.current = paginationModel; }, [paginationModel]);

  // Compute grid height based on the container's clientHeight
  useEffect(() => {
    function updatePageSize() {
      let available = 0;
      // Use window.innerHeight minus header/footer heights for accurate available space
      // Header: 64px (main header), Email header: 48px, plus any parent padding/margins if present
      const mainHeader = 64;
      const emailHeader = 48;
      available = window.innerHeight - mainHeader - emailHeader;
      // Subtract fudge factor to avoid overflow
      const fudge = 40;
      const rows = Math.max(10, Math.floor((available - headerHeight - footerHeight - fudge) / rowHeight));
      // Expose debug info for Cypress
      if (typeof window !== 'undefined') {
        window.__EMAILGRID_DEBUG__ = {
          available,
          headerHeight,
          footerHeight,
          rowHeight,
          fudge,
          rows
        };
      }
      // Only update if value actually changes
      if (rows !== pageSizeRef.current) {
        setPageSize(rows);
      }
      if (paginationModelRef.current.pageSize !== rows) {
        setPaginationModel((prev) => prev.pageSize === rows ? prev : { ...prev, pageSize: rows });
      }
    }
    // Initial sizing
    updatePageSize();
    // Stable handler for resize
    const handleResize = () => {
      updatePageSize();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
    // Only run on mount/unmount
  }, [headerHeight, footerHeight, rowHeight, setPageSize]);


  // (No longer needed: containerHeight is set in the above effect)

  // Diagnostic: Log DataGrid DOM element heights to Cypress for overflow debugging
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.Cypress &&
      gridContainerRef.current &&
      typeof containerHeight === 'number'
    ) {
      const gridRoot = gridContainerRef.current.querySelector('.MuiDataGrid-root');
      if (gridRoot) {
        const virtualScroller = gridRoot.querySelector('.MuiDataGrid-virtualScroller');
        const footer = gridRoot.querySelector('.MuiDataGrid-footerContainer');
        const header = gridRoot.querySelector('.MuiDataGrid-columnHeaders');
        const body = gridRoot.querySelector('.MuiDataGrid-main');
        window.__EMAILGRID_DEBUG__ = {
          containerHeight,
          gridRootHeight: gridRoot ? gridRoot.clientHeight : undefined,
          virtualScrollerHeight: virtualScroller ? virtualScroller.clientHeight : undefined,
          footerHeight: footer ? footer.clientHeight : undefined,
          headerHeight: header ? header.clientHeight : undefined,
          bodyHeight: body ? body.clientHeight : undefined,
        };
        cypressLog(`DOM_DIAG: ${JSON.stringify(window.__EMAILGRID_DEBUG__)}`);
      }
    }
  }, [containerHeight]);

  return (
    <Box sx={{ width: '100%', height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
        <button
          onClick={handleRefresh}
          disabled={refreshing || loading}
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 16px', borderRadius: 4, border: 'none', background: '#1976d2', color: '#fff', cursor: 'pointer', fontWeight: 500 }}
        >
          <RefreshIcon fontSize="small" /> Refresh
        </button>
      </Box>
      <div
        ref={gridContainerRef}
        style={{ flex: 1, minHeight: 0, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
      >
        <DataGrid
          rows={rows}
          columns={columns}
          pagination
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[paginationModel.pageSize]}
          rowCount={totalEmails}
          paginationMode="server"
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
            height: containerHeight ? `${containerHeight}px` : '100%',
            minHeight: 0,
            overflow: 'hidden',
            '::-webkit-scrollbar': { display: 'none' },
            scrollbarWidth: 'none',
            '& .MuiDataGrid-virtualScroller': {
              overflowY: 'hidden !important',
            },
            '& .MuiDataGrid-columnSeparator': { cursor: 'col-resize' },
            '& .MuiDataGrid-cell': { cursor: 'pointer' },
          }}
        />
      </div>
    </Box>
  );
};

export default EmailList;