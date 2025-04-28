import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@mui/material';

interface ResizableSidebarProps {
    children: React.ReactNode;
    initialWidth?: number;
    minWidth?: number;
    maxWidth?: number;
    onWidthChange?: (width: number) => void;
}

const ResizableSidebar: React.FC<ResizableSidebarProps> = ({
    children,
    initialWidth = 256,
    minWidth = 180,
    maxWidth = 400,
    onWidthChange
}) => {
    const [width, setWidth] = useState<number>(initialWidth);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [isHovering, setIsHovering] = useState<boolean>(false);
    const theme = useTheme();

    // Load saved width from localStorage on component mount
    useEffect(() => {
        const savedWidth = localStorage.getItem('gMaelstrom_sidebarWidth');
        if (savedWidth) {
            const parsedWidth = parseInt(savedWidth, 10);
            if (!isNaN(parsedWidth) && parsedWidth >= minWidth && parsedWidth <= maxWidth) {
                setWidth(parsedWidth);
            }
        }
    }, [minWidth, maxWidth]);

    // Handle mouse movements when dragging
    const handleMouseMove = useCallback(
        (e: MouseEvent) => {
            if (isDragging) {
                const newWidth = e.clientX;

                if (newWidth >= minWidth && newWidth <= maxWidth) {
                    setWidth(newWidth);
                    if (onWidthChange) {
                        onWidthChange(newWidth);
                    }
                    // Save width to localStorage
                    localStorage.setItem('gMaelstrom_sidebarWidth', newWidth.toString());
                }
            }
        },
        [isDragging, minWidth, maxWidth, onWidthChange]
    );

    // Stop dragging when mouse is released
    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
    }, []);

    // Start dragging when handle is clicked
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';
    };

    // Add and remove event listeners
    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, handleMouseMove, handleMouseUp]);

    // Get the resize handle color based on theme and interaction state
    const getHandleColor = () => {
        if (isDragging) {
            return theme.palette.primary.main; // Full color when dragging
        } else if (isHovering) {
            return theme.palette.primary.main + '99'; // 60% opacity when hovering
        }
        // Default color based on theme
        return theme.palette.mode === 'dark' 
            ? 'rgba(255, 255, 255, 0.3)' 
            : 'rgba(0, 0, 0, 0.2)';
    };

    return (
        <div
            className="resizable-sidebar"
            style={{
                position: 'relative',
                width: `${width}px`,
                height: '100%',
                overflowX: 'hidden',
                overflowY: 'auto'
            }}
        >
            {children}
            <div
                className={`resize-handle ${isDragging ? 'dragging' : ''}`}
                style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: '4px', // 4px wide as requested
                    height: '100%',
                    backgroundColor: getHandleColor(),
                    cursor: 'ew-resize',
                    transition: 'background-color 0.2s ease',
                    zIndex: 10,
                }}
                onMouseDown={handleMouseDown}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
            />
        </div>
    );
};

export default ResizableSidebar;