import React, { useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Checkbox,
} from '@mui/material';
import { useDataCache } from './services/ctxDataCache';
import { useResizableWidth } from './helpers/useResizableWidth';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import CheckIcon from '@mui/icons-material/Check';

const LabelsSidePanel: React.FC = () => {

  const cache = useDataCache();
  const navigate = useNavigate();
  const location = useLocation();

  const { containerRef, width, handleProps } = useResizableWidth('labelsSidePanelWidth', 240, 100, 300);

  const getUnreadCount = (labelId: string) => cache.labels.byId(labelId)?.unreadThreadCount ?? 0;

  // Prefer Inbox on first load, otherwise fall back to the first visible label.
  const { selectedLabelId, setSelectedLabelId, labels } = cache; // destructure these specific values to silence lint wanting the entire cache object added to the dependency array
  useEffect(() => {
    if (selectedLabelId || !labels.sortedFiltered.length) return;
    setSelectedLabelId('INBOX'); //we've ensured INBOX can never be hidden
  }, [selectedLabelId, labels.sortedFiltered.length, setSelectedLabelId]);

  const handleLabelClick = (labelId: string) => {
    if (labelId !== cache.selectedLabelId) {
      cache.setSelectedLabelId(labelId);
    }

    if (location.pathname !== '/' || location.search) {
      navigate('/');
    }
  };


  return (
    <Box ref={containerRef}
      sx={{
        position: 'relative',
        display: 'flex', flexDirection: 'column',
        height: '100%', minHeight: 0,
        width: width, minWidth: width
      }}>


      <Box
        onPointerDown={handleProps.onPointerDown}
        sx={{
          position: 'absolute', top: 0, right: 0, bottom: 0, width: 8,
          cursor: 'col-resize', zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto'
        }}
      >
        <Box sx={{ width: 2, height: 28, borderRadius: 1, bgcolor: 'text.secondary', opacity: 0.28 }} />
      </Box>

      <DragDropContext onDragEnd={(result: DropResult) => {
        const { source, destination } = result;
        if (!destination || source.index === destination.index) return;

        const items = cache.labels.sortedFiltered;
        const next = Array.from(items);
        const [moved] = next.splice(source.index, 1);
        next.splice(destination.index, 0, moved);

        cache.labels.patchLabelItem(moved, { sortNum: destination.index });
      }}>
        <Droppable droppableId="labels-droppable">
          {(provided) => (
            <List
              ref={provided.innerRef}
              {...provided.droppableProps}
              component="nav"
              dense
              aria-label="mail categories"
              sx={{
                WebkitOverflowScrolling: 'touch',
                flex: 1,
                py: 0,
                overflowY: 'auto',
                overflowX: 'hidden'
              }}
            >
              {cache.labels?.sortedFiltered.map((label, index) => (
                <Draggable key={label.id} draggableId={String(label.id)} index={index} isDragDisabled={!cache.settingsEditMode}>
                  {(providedDraggable, snapshot) => (
                    <div
                      ref={providedDraggable.innerRef}
                      {...providedDraggable.draggableProps}
                    >
                      <ListItemButton
                        dense
                        selected={cache.selectedLabelId === label.id}
                        onClick={() => handleLabelClick(label.id)}
                        sx={{ px: 0 }}
                      >
                        <ListItemIcon sx={{ mt: "-3px", minWidth: 24, display: 'flex', justifyContent: 'center' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {label.icon}
                          </Box>
                        </ListItemIcon>

                        {/* Drag handle - visible in edit mode */}
                        {cache.settingsEditMode && (
                          <Box
                            {...providedDraggable.dragHandleProps}
                            sx={{ zIndex: 1, display: 'flex', alignItems: 'center', mt: "-3px", py: 0, color: 'text.secondary', cursor: snapshot.isDragging ? 'grabbing' : 'grab' }}
                          >
                            <DragIndicatorIcon sx={{ fontSize: 13.7 }} />
                          </Box>
                        )}

                        {cache.settingsEditMode && label.isSystem && (
                          <Box sx={{ height: "15px", fontSize: 11, borderRadius: '50%', mt: "-4px", mr: "5px", px: "5px", py: 0, bgcolor: "blue" }}>s</Box>
                        )}

                        <ListItemText primary={`${label.displayName} (${getUnreadCount(label.id)})`}
                          slotProps={{
                            primary: {
                              noWrap: true,
                              fontWeight: 300,
                              fontSize: 13.7,
                              lineHeight: 1.1,
                              my: -0.4 // 'my' sets the vertical gap between labels
                            }
                          }}
                        />

                        {cache.settingsEditMode && (
                          label.id === 'INBOX' ? (
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mr: 0.25,
                                color: 'primary.main'
                              }}
                              aria-label={`${label.displayName} is always visible`}
                            >
                              <CheckIcon sx={{ height: '15px' }} />
                            </Box>
                          ) : (
                            <Checkbox
                              sx={{
                                // alignSelf: 'center',
                                p: 0, // remove Checkbox padding
                                mr: 0.5,
                                '& .MuiSvgIcon-root': {
                                  height: '15px', // 15px is approximately equal to label font size 13.7px + lineHeight 1.1 set above
                                  // transform: 'scale(1.2)', // use >1 to enlarge the glyph inside the svg if it has internal whitespace
                                }
                              }}
                              size="small"
                              checked={label.isVisible}
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                              onChange={(e) => cache.labels.patchLabelItem(label, { isVisible: e.target.checked })}
                              inputProps={{ 'aria-label': `Toggle visibility for ${label.displayName}` }}
                            />
                          )
                        )}

                      </ListItemButton>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </List>
          )}
        </Droppable>
      </DragDropContext>
    </Box>
  );
};

export default LabelsSidePanel;