import React, { useMemo, useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams, GridRowParams } from '@mui/x-data-grid';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useDataCache } from './services/ctxDataCache';
import { getFrom, getSubject, getDate } from './helpers/emailParser';
import useMuiGridHelpers from './helpers/useMuiGridHelpers';
import { GThreadHeader } from './services/gMailApi';
import { useSettings } from './services/ctxSettings';

const emailRowHeight = 26;

const ThreadList: React.FC = () => {
  const cache = useDataCache();
  const settings = useSettings();
  const navigate = useNavigate();
  const refGrid = useMuiGridHelpers(emailRowHeight, cache.setPageSize);

  const columns = useMemo<GridColDef<GThreadHeader>[]>(() => [
    {
      field: 'from',
      headerName: 'From',
      width: 150,
      valueGetter: (_unused, row) => getFrom(row.latestMessage),
      resizable: true,
    },
    {
      field: 'subject',
      headerName: 'Subject',
      flex: 1,
      minWidth: 360,
      resizable: true,
      renderCell: (params: GridRenderCellParams<GThreadHeader>) => (
        <Box sx={{ overflow: 'hidden', py: 0.25 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: params.row.hasUnread ? settings.listFontWeight + 400 : settings.listFontWeight,
              opacity: settings.listFontOpacity,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {getSubject(params.row.latestMessage) || '(No subject)'}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              opacity: settings.listFontOpacity,
              display: 'block',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {params.row.snippet}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'count',
      headerName: 'Count',
      width: 70,
      align: 'center',
      headerAlign: 'center',
      valueGetter: (_unused, row) => row.messageCount,
      resizable: false,
    },
    {
      field: 'date',
      headerName: 'Date',
      width: 120,
      valueGetter: (_unused, row) => {
        const date = getDate(row.latestMessage);
        return date ? formatDistanceToNow(date) : '';
      },
      resizable: true,
    },
  ], [settings.listFontOpacity, settings.listFontWeight]);

  const onRowClick = useCallback((params: GridRowParams<GThreadHeader>) => {
    navigate(`/thread/${params.row.id}?mode=threads`);
  }, [navigate]);

  return (
    <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }} ref={refGrid}>
      <DataGrid
        autoHeight={false}
        loading={cache.loading}
        rows={cache.currentPageThreads}
        rowHeight={emailRowHeight}
        rowCount={cache.totalThreads}
        onRowClick={onRowClick}
        getRowClassName={params => params.row.hasUnread ? 'email-unread' : 'email-read'}
        columns={columns}
        checkboxSelection={true}
        disableRowSelectionOnClick={true}
        rowSelectionModel={cache.checkedRowIds}
        onRowSelectionModelChange={cache.setCheckedRowIds}
        disableColumnFilter={true}
        sortingOrder={[]}
        paginationMode="server"
        paginationModel={{ page: cache.currentPage, pageSize: cache.pageSize }}
        onPaginationModelChange={({ page, pageSize }) => {
          cache.setPageSize(pageSize);
          if (page !== cache.currentPage) cache.setCurrentPage(page);
        }}
        pageSizeOptions={[cache.pageSize]}
        sx={{
          '--DataGrid-checkboxSelectionColWidth': '26px',
          '& .MuiDataGrid-columnHeaderTitle': {
            fontWeight: settings.listFontWeight,
            opacity: settings.listFontOpacity,
          },
          '& .MuiDataGrid-cell': { fontWeight: settings.listFontWeight },
          '& .MuiDataGrid-cellContent': {
            opacity: settings.listFontOpacity,
          },
          '& .MuiDataGrid-cellCheckbox, & .MuiDataGrid-columnHeaderCheckbox': {
            px: 0,
            width: 26,
            minWidth: '26px !important',
            maxWidth: '26px !important',
          },
          '& .MuiDataGrid-cellCheckbox .MuiCheckbox-root, & .MuiDataGrid-columnHeaderCheckbox .MuiCheckbox-root': {
            p: 0,
            m: 0,
            opacity: 0.1,
            transition: 'opacity 140ms ease-in-out',
          },
          '& .MuiDataGrid-row:hover .MuiDataGrid-cellCheckbox .MuiCheckbox-root, & .MuiDataGrid-cellCheckbox:hover .MuiCheckbox-root, & .MuiDataGrid-columnHeaderCheckbox:hover .MuiCheckbox-root': {
            opacity: 1,
          },
          '& .MuiDataGrid-row': {
            cursor: 'pointer',
          },
          '& .MuiDataGrid-row.email-read': {
            backgroundColor: theme => theme.palette.background.default,
          },
          '& .MuiDataGrid-row.email-read.Mui-selected': {
            backgroundColor: theme => theme.palette.action.selected,
          },
        }}
      />
    </Box>
  );
};

export default ThreadList;