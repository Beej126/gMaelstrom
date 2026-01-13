import React, { useMemo, useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams, GridRowParams } from '@mui/x-data-grid';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useApiDataCache } from './ctxApiDataCache';
import { getFrom, getSubject, getDate, isRead } from './helpers/emailParser';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import useMuiGridHelpers from './helpers/useMuiGridHelpers';
import { GMessage } from './gMailApi';

const emailRowHeight = 26;

const EmailList: React.FC = _ => {

  const cache = useApiDataCache();
  const navigate = useNavigate();
  const refGrid = useMuiGridHelpers(emailRowHeight, cache.setPageSize);


  type GridRowModel = Required<Pick<GMessage, "id">> & GMessage & { threadCount?: number };

  const columns = useMemo<GridColDef[]>(() => [
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
      resizable: true,
      renderCell: (params: GridRenderCellParams<GridRowModel>) => (
        <Typography
          variant="body2"
          sx={{
            fontWeight: isRead(params.row) ? 300 : 700,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {getSubject(params.row)}
        </Typography>
      )
    },
    {
      field: 'attachment',
      headerName: 'Attachment',
      renderHeader: () => <AttachFileIcon fontSize="small" titleAccess="Attachment" />,
      width: 32,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params: GridRenderCellParams<GMessage>) => (
        params.row?.payload?.parts?.some(part => part.filename && part.filename.length > 0) ? (
          <AttachFileIcon fontSize="small" titleAccess="Attachment" />
          // <span title="Has attachment">📎</span>
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
  ], [cache]); //move dependencies into separate memos per event handler


  const onRowClick = useCallback((params: GridRowParams<GridRowModel>) => {
    navigate(`/email/${params.row.id}`);
  }, [navigate]);



  return <>
    {/* In 2026, the "two-Box" pattern is the standard fix for a fundamental conflict between how Flexbox calculates sizes and how the MUI DataGrid measures its available space.
      The two containers serve distinct roles:

      1. The Outer Box: Defining the Layout
      The outer Box defines the available area.
      It uses display: flex and height: 400 (or 100%) to stake out a claim in the UI.
      Without this, the DataGrid has no reference point and may collapse to 0px or expand infinitely. 

      2. The Inner Box: The "Sizing Sandbox"
      The inner Box is the actual "fix." It acts as a buffer to solve two specific issues:
      The Flex-Shrink Bug: By default, flex items have min-height: auto, which prevents them from shrinking smaller than their content. If the DataGrid has 50 rows, it will try to be 2000px tall. The inner Box with min-height: 0 breaks this, forcing the DataGrid to acknowledge the 400px limit and show its own scrollbars.
      Resize Awareness: The DataGrid uses a ResizeObserver to detect its parent's size. If you place the DataGrid directly in a flex container, it sometimes fails to "shrink" because the flex parent is waiting for the child to define its size—a circular dependency. The inner Box provides a stable, non-flex container for the grid to measure.
    */}

    <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }} ref={refGrid}>
      <DataGrid
        autoHeight={false}

        loading={cache.loading}
        rows={cache.currentPageMessages}
        rowHeight={emailRowHeight}
        rowCount={cache.totalMessages}
        onRowClick={onRowClick}
        getRowClassName={params => isRead(params.row) ? 'email-read' : 'email-unread'}

        columns={columns}

        checkboxSelection={true}
        //mui datagrid uses the .id property on the objects passed to rows as the unique row identifier
        //so it's convenient gmail messages already have an id property
        rowSelectionModel={cache.checkedMessageIds}
        onRowSelectionModelChange={cache.setCheckedMessageIds}

        disableColumnFilter={true}
        sortingOrder={[]}

        paginationMode='server' //important for rowcount to work
        // it seemed most sense to ask google server for each page and cache, versus requesting all emails and paginating client side
        // in tandem with deliberate search retrievals being the way to dig through large folders (like trash, etc)
        paginationModel={{ page: cache.currentPage, pageSize: cache.pageSize }}
        onPaginationModelChange={({ page, pageSize }) => {
          cache.setPageSize(pageSize);
          if (page !== cache.currentPage) cache.setCurrentPage(page);
        }}
        pageSizeOptions={[cache.pageSize]}

        sx={{
          '& .MuiDataGrid-columnHeaderTitle, & .MuiDataGrid-cell': { fontWeight: 300 },
          '& .MuiDataGrid-row.email-read': {
            backgroundColor: theme => theme.palette.background.default,
          },
          '& .MuiDataGrid-row.email-read.Mui-selected': {
            backgroundColor: theme => theme.palette.action.selected,
          }
        }}

      />
    </Box>
  </>;
};

export default EmailList;
