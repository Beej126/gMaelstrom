import React, { useMemo, useCallback } from 'react';
import { Box, IconButton, MenuItem, Typography } from '@mui/material';
import { DataGrid, GridColDef, GridColumnMenu, GridColumnMenuItemProps, GridColumnMenuProps, GridColumnResizeParams, GridRenderCellParams, GridRowParams } from '@mui/x-data-grid';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CompareArrows from '@mui/icons-material/CompareArrows';
import SubdirectoryArrowRightIcon from '@mui/icons-material/SubdirectoryArrowRight';
import { useDataCache } from './services/ctxDataCache';
import { getFrom, getSubject, getDate } from './helpers/emailParser';
import useMuiGridHelpers from './helpers/useMuiGridHelpers';
import { GThreadHeader } from './services/gMailApi';
import { ThreadListAutoSizeField, ThreadListColumnWidths, useSettings } from './services/ctxSettings';

const emailRowHeight = 26;
const DEFAULT_THREAD_LIST_COLUMN_WIDTHS: Record<ThreadListAutoSizeField, number> = {
  from: 150,
  subject: 360,
  date: 120,
  labels: 180,
};

type ThreadListColumnMenuAutoSizeItemProps = GridColumnMenuItemProps & {
  autoSizeField?: ThreadListAutoSizeField;
  onSetAutoSizeField?: (field: ThreadListAutoSizeField) => void;
};

const ThreadListColumnMenuAutoSizeItem: React.FC<ThreadListColumnMenuAutoSizeItemProps> = ({
  autoSizeField,
  colDef,
  onClick,
  onSetAutoSizeField,
}) => {
  const handleClick = useCallback((event: React.MouseEvent<HTMLLIElement>) => {
    if (!onSetAutoSizeField) return;
    onSetAutoSizeField(colDef.field as ThreadListAutoSizeField);
    onClick(event);
  }, [colDef.field, onClick, onSetAutoSizeField]);

  return (
    <MenuItem selected={autoSizeField === colDef.field} onClick={handleClick}>
      <CompareArrows fontSize="small" style={{ marginRight: 16 }} />
      Auto-size
    </MenuItem>
  );
};

type ThreadListColumnMenuProps = GridColumnMenuProps & {
  autoSizeField?: ThreadListAutoSizeField;
  onSetAutoSizeField?: (field: ThreadListAutoSizeField) => void;
};

const ThreadListColumnMenu: React.FC<ThreadListColumnMenuProps> = ({ autoSizeField, onSetAutoSizeField, ...props }) => (
  <GridColumnMenu
    {...props}
    slots={{
      columnMenuAutoSizeItem: ThreadListColumnMenuAutoSizeItem,
    }}
    slotProps={{
      columnMenuAutoSizeItem: {
        autoSizeField,
        displayOrder: 25,
        onSetAutoSizeField,
      },
    }}
  />
);

const ThreadList: React.FC = () => {
  const cache = useDataCache();
  const settings = useSettings();
  const navigate = useNavigate();
  const refGrid = useMuiGridHelpers(emailRowHeight, cache.setPageSize);

  const onTrashThread = useCallback(async (event: React.MouseEvent, threadId: string) => {
    event.stopPropagation();
    await cache.trashThreadById(threadId);
  }, [cache]);

  const getStoredWidth = useCallback((field: ThreadListAutoSizeField) => {
    return settings.threadListColumnWidths[field] ?? DEFAULT_THREAD_LIST_COLUMN_WIDTHS[field];
  }, [settings.threadListColumnWidths]);

  const onColumnWidthChange = useCallback((params: GridColumnResizeParams) => {
    const field = params.colDef.field as ThreadListAutoSizeField;
    if (!['from', 'subject', 'date', 'labels'].includes(field)) return;

    const nextWidth = Math.round(params.width);
    if (settings.threadListColumnWidths[field] === nextWidth) return;

    settings.setThreadListColumnWidths({
      ...settings.threadListColumnWidths,
      [field]: nextWidth,
    } satisfies ThreadListColumnWidths);
  }, [settings]);

  const renderHeaderLabel = useCallback((label: string, field: ThreadListAutoSizeField) => (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
      <Box component="span">{label}</Box>
      {settings.threadListAutoSizeField === field ? <CompareArrows fontSize="small" titleAccess="Auto-sized column" /> : null}
    </Box>
  ), [settings.threadListAutoSizeField]);

  const columns = useMemo<GridColDef<GThreadHeader>[]>(() => [
    {
      field: 'from',
      headerName: 'From',
      renderHeader: () => renderHeaderLabel('From', 'from'),
      ...(settings.threadListAutoSizeField === 'from' ? { flex: 1, minWidth: 150 } : { width: getStoredWidth('from') }),
      valueGetter: (_unused, row) => getFrom(row.latestMessage),
      resizable: true,
    },
    {
      field: 'subject',
      headerName: 'Subject',
      renderHeader: () => renderHeaderLabel('Subject', 'subject'),
      ...(settings.threadListAutoSizeField === 'subject' ? { flex: 1, minWidth: 360 } : { width: getStoredWidth('subject') }),
      resizable: true,
      renderCell: (params: GridRenderCellParams<GThreadHeader>) => (
        <Box sx={{ width: '100%', overflow: 'hidden' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
            <Typography
              variant="body2"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                flex: 1,
                minWidth: 0,
                fontWeight: params.row.hasUnread ? settings.listFontWeight + 400 : settings.listFontWeight,
                opacity: settings.listFontOpacity,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {params.row.hasAttachments ? (
                <AttachFileIcon fontSize="inherit" titleAccess="Attachment" sx={{ flexShrink: 0, fontSize: '1.05em' }} />
              ) : null}
              <Box component="span" sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {getSubject(params.row.latestMessage) || '(No subject)'}
              </Box>
              {params.row.messageCount > 1 ? (
                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', ml: 0.5, fontSize: '0.95em' }}>
                  
                  [<SubdirectoryArrowRightIcon sx={{ fontSize: '1.05em', mr: 0.125 }} />{params.row.messageCount}]
                </Box>
              ) : null}
            </Typography>
            <Box className="thread-row-actions" sx={{ display: 'flex', alignItems: 'center', flexShrink: 0, transform: 'translateY(-2px)'}}>
              <IconButton
                size="small"
                aria-label="Move thread to trash"
                title="Move thread to trash"
                onClick={event => void onTrashThread(event, params.row.id)}
                onMouseDown={event => event.stopPropagation()}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
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
      field: 'date',
      headerName: 'Date',
      renderHeader: () => renderHeaderLabel('Date', 'date'),
      ...(settings.threadListAutoSizeField === 'date' ? { flex: 1, minWidth: 120 } : { width: getStoredWidth('date') }),
      valueGetter: (_unused, row) => {
        const date = getDate(row.latestMessage);
        return date ? formatDistanceToNow(date).replace(/^about\s+/, '~') : '';
      },
      resizable: true,
    },
    {
      field: 'labels',
      headerName: 'Labels',
      renderHeader: () => renderHeaderLabel('Labels', 'labels'),
      ...(settings.threadListAutoSizeField === 'labels' ? { flex: 1, minWidth: 160 } : { width: getStoredWidth('labels') }),
      renderCell: (params: GridRenderCellParams<GThreadHeader>) => {
        const labels = (params.row.labelIds ?? [])
          .map(labelId => cache.labels.byId(labelId))
          .filter((label): label is NonNullable<ReturnType<typeof cache.labels.byId>> => !!label);

        const userLabels = labels
          .filter(label => !label.isSystem)
          .map(label => label.displayName)
          .sort();

        const systemLabels = labels
          .filter(label => label.isSystem)
          .map(label => label.displayName)
          .sort();

        return (
          <Box sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {userLabels.length ? userLabels.join(', ') : null}
            {systemLabels.length ? (
              <Box component="span" sx={{ fontSize: '0.82em', opacity: 0.72 }}>
                {userLabels.length ? ` - ${systemLabels.join(', ')}` : systemLabels.join(', ')}
              </Box>
            ) : null}
          </Box>
        );
      },
      resizable: true,
    },
  ], [cache, getStoredWidth, onTrashThread, renderHeaderLabel, settings.listFontOpacity, settings.listFontWeight, settings.threadListAutoSizeField]);

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
        onColumnWidthChange={onColumnWidthChange}
        getRowClassName={params => params.row.hasUnread ? 'email-unread' : 'email-read'}
        columns={columns}
        slots={{
          columnMenu: ThreadListColumnMenu,
        }}
        slotProps={{
          columnMenu: {
            autoSizeField: settings.threadListAutoSizeField,
            onSetAutoSizeField: settings.setThreadListAutoSizeField,
          } as ThreadListColumnMenuProps,
        }}
        checkboxSelection={true}
        disableRowSelectionOnClick={true}
        rowSelectionModel={cache.checkedRowIds}
        onRowSelectionModelChange={cache.setCheckedRowIds}
        disableColumnFilter={true}
        disableColumnSorting={true}
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
          '& .thread-row-actions': {
            opacity: 0,
            pointerEvents: 'none',
            transition: 'opacity 140ms ease-in-out',
          },
          '& .MuiDataGrid-row:hover .thread-row-actions': {
            opacity: 1,
            pointerEvents: 'auto',
          },
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