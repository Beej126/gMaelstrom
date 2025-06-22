import React from 'react';
import { SvgIcon, SvgIconProps } from '@mui/material';

interface gMaelstromIconProps extends SvgIconProps {
  fontSize?: 'inherit' | 'small' | 'medium' | 'large';
}

const GMaelstromIcon: React.FC<gMaelstromIconProps> = (props) => {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      {/* Base Email Envelope Icon */}
      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
      
      {/* Lightning bolt - rotated 10 degrees, scaled down to 75%, and moved up 80% of its height */}
      <g transform="rotate(20) scale(0.75) translate(3, -4)">
        <path 
          d="M8.9 23c0 0 8.1-17.5 8.1-17.5l0.4-1c-1.7 0.5-5.6 1.5-5.6 1.5c0.4-1.1 2.1-6.3 2.1-6.3c-1.7 0-3.3 0-5 0l-0.5 2.4l-2.1 8.7l5.6-1.5L8.9 23z"
          fill="#FFD700" 
          stroke="#FFFFFF"
          strokeWidth="0.3"
        />
      </g>
    </SvgIcon>
  );
};

export default GMaelstromIcon;