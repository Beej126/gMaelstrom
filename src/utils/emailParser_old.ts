const processEmailContentForDarkMode_keep_old = (htmlContent: string, isDarkMode: boolean): string => {
  if (!isDarkMode || !htmlContent) return htmlContent;
  
  // Calculate brightness of a color
  const calculateBrightness = (colorStr: string): number => {
    // Handle hex colors
    if (colorStr.startsWith('#')) {
      // Convert short hex to full form
      let hex = colorStr;
      if (hex.length === 4) {
        hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
      }
      
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      
      return (r * 299 + g * 587 + b * 114) / 1000;
    }
    
    // Handle rgb/rgba colors
    if (colorStr.startsWith('rgb')) {
      const match = colorStr.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/);
      if (match) {
        const r = parseInt(match[1], 10);
        const g = parseInt(match[2], 10);
        const b = parseInt(match[3], 10);
        
        return (r * 299 + g * 587 + b * 114) / 1000;
      }
    }
    
    // Named colors
    if (colorStr.toLowerCase() === 'white') return 255;
    if (colorStr.toLowerCase() === 'black') return 0;
    
    // Default for unknown formats
    return 0;
  };
  
  // Check if style contains both black text and white/light background
  const hasBlackTextWithLightBackground = (styleAttr: string): boolean => {
    // Check for black text
    const hasBlackText = /(^|;|\s)color\s*:\s*(black|#000|#000000|rgb\(0,\s*0,\s*0\))($|;)/i.test(styleAttr);
    
    // Check for white/light background
    const hasLightBg = /(^|;|\s)background(?:-color)?\s*:\s*(white|#fff|#ffffff|rgb\(255,\s*255,\s*255\))($|;)/i.test(styleAttr) ||
      (() => {
        const bgMatch = styleAttr.match(/(^|;|\s)background(?:-color)?\s*:\s*(#[0-9a-f]{3,6}|rgb\([^)]+\))($|;)/i);
        if (bgMatch) {
          const brightness = calculateBrightness(bgMatch[2]);
          return brightness >= 144; // #909090 or higher
        }
        return false;
      })();
    
    return hasBlackText && hasLightBg;
  };
  
  // Check if we should preserve original text due to background color
  const shouldPreserveText = (styleAttr: string): boolean => {
    // First, handle specific case of black text on white background
    if (hasBlackTextWithLightBackground(styleAttr)) {
      return true;
    }
    
    // Check for direct background-color: white or background: white
    if (/(^|;|\s)background(?:-color)?\s*:\s*(white|#fff|#ffffff|rgb\(255,\s*255,\s*255\))($|;)/i.test(styleAttr)) {
      return true;
    }
    
    // Check for hex and rgb background colors
    const bgColorMatch = styleAttr.match(/(^|;|\s)background(?:-color)?\s*:\s*(#[0-9a-f]{3,6}|rgb\([^)]+\))($|;)/i);
    if (bgColorMatch) {
      const bgColor = bgColorMatch[2];
      const brightness = calculateBrightness(bgColor);
      // #909090 has brightness of 144, so preserve text with backgrounds of this brightness or higher
      return brightness >= 144;
    }
    return false;
  };
  
  // Check if a style attribute has color property
  const hasColorProperty = (styleAttr: string): boolean => {
    return /(^|;|\s)color\s*:\s*(#[0-9a-f]{3,6}|rgb\([^)]+\)|[a-z]+)($|;)/i.test(styleAttr);
  };
  
  // Find elements with style attributes and process them first
  const processedElements = new Map();
  let counter = 0;
  
  // Process style attributes to identify elements that should have their colors preserved
  let processedHtml = htmlContent.replace(
    // /(<[^>]*style=(['"])([^'"]*)\2[^>]*>)/gi,
    /<[^>]*style=(["'])([^>]*?)\1/gi,
    (match, quoteType, styleContent) => {
      const placeholder = `__PRESERVED_ELEMENT_${counter++}__`;
      
      if (shouldPreserveText(styleContent)) {
        // If no color is set, add dark gray color (#606060)
        if (!hasColorProperty(styleContent)) {
          processedElements.set(placeholder, match.replace(
            /style=(['"])([^'"]*)\1/i,
            `style=${quoteType}${styleContent}; color: #606060;${quoteType}`
          ));
        } else {
          // Keep the original style as-is
          processedElements.set(placeholder, match);
        }
        return placeholder;
      }
      
      // Not preserved, return as-is to be processed later
      return match;
    }
  );
  
  // Intelligently invert dark colors - preserving the same offset from black as original from white
  const invertColor = (colorStr: string): string => {
    // Handle named colors
    if (colorStr.toLowerCase() === 'black') return '#ffffff';
    
    // Handle hex colors
    if (colorStr.startsWith('#')) {
      // Convert short hex (#abc) to full form (#aabbcc)
      let hex = colorStr;
      if (hex.length === 4) {
        hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
      }
      
      // Parse the hex value
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      
      // Calculate perceived brightness (formula used by WCAG)
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      
      // Only transform colors darker than threshold
      if (brightness <= 85) { // Equivalent to #555555
        // Calculate how far each component is from 0 (black)
        const distanceFromBlack = [r, g, b];
        
        // Calculate the new color by applying the same distance from 255 (white)
        const newR = Math.max(0, Math.min(255, 255 - distanceFromBlack[0]));
        const newG = Math.max(0, Math.min(255, 255 - distanceFromBlack[1]));
        const newB = Math.max(0, Math.min(255, 255 - distanceFromBlack[2]));
        
        return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
      }
    }
    
    // Handle rgb/rgba colors
    if (colorStr.startsWith('rgb')) {
      const match = colorStr.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/);
      if (match) {
        const r = parseInt(match[1], 10);
        const g = parseInt(match[2], 10);
        const b = parseInt(match[3], 10);
        const a = match[4] ? match[4] : '1'; // Alpha if present
        
        // Calculate perceived brightness
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        
        // Only transform colors darker than threshold
        if (brightness <= 85) {
          // Calculate how far each component is from 0 (black)
          const distanceFromBlack = [r, g, b];
          
          // Calculate the new color by applying the same distance from 255 (white)
          const newR = Math.max(0, Math.min(255, 255 - distanceFromBlack[0]));
          const newG = Math.max(0, Math.min(255, 255 - distanceFromBlack[1]));
          const newB = Math.max(0, Math.min(255, 255 - distanceFromBlack[2]));
          
          return match[4] ? `rgba(${newR}, ${newG}, ${newB}, ${a})` : `rgb(${newR}, ${newG}, ${newB})`;
        }
      }
    }
    
    // Return unchanged if not a recognized dark color format
    return colorStr;
  };
  
  // Now process remaining colors in style attributes
  processedHtml = processedHtml.replace(
    // /style=(['"])([^'"]*)\1/gi,
    /style=(["'])([^>]*?)\1/gi,
    (_match: string, quote, styleContent: string) => {
      // Process color as normal for non-preserved styles
      let newStyle = styleContent.replace(
        /(^|;|\s)color\s*:\s*(#[0-9a-f]{3,6}|black|rgb\([^)]+\))/gi,
        (_colorMatch: string, prefix, colorValue) => {
          return prefix + 'color: ' + invertColor(colorValue);
        }
      );
      
      return `style=${quote}${newStyle}${quote}`;
    }
  );
  
  // Process font tags with color attributes
  processedHtml = processedHtml.replace(
    /<font[^>]*color=['"]?([^'"\s>]*)['"]?[^>]*>/gi,
    (match, colorValue) => {
      const newColor = invertColor(colorValue);
      return match.replace(/color=['"]?([^'"\s>]*)['"]?/gi, `color="${newColor}"`);
    }
  );
  
  // Special case for rgb(0,0,0) with no spaces
  processedHtml = processedHtml.replace(
    /(^|;|\s)color\s*:\s*rgb\(0,0,0\)($|;)/gi,
    '$1color: rgb(255, 255, 255)$2'
  );
  
  // Apply custom link styling for dark mode and handle elements with background colors
  processedHtml = processedHtml.replace(
    /<([a-z][a-z0-9]*)\b([^>]*)>/gi,
    (match, tagName, attributes) => {
      // Skip certain tags that shouldn't have color styles added
      if (['html', 'head', 'script', 'style', 'meta', 'link', 'br', 'hr'].includes(tagName.toLowerCase())) {
        return match;
      }
      
      // Check for background color attributes without style
      const bgColorMatch = attributes.match(/background(?:-color)?=['"]?(#[0-9a-f]{3,6}|rgb\([^'")\s]+\)|white)['"]?/i);
      if (bgColorMatch) {
        const bgColor = bgColorMatch[1];
        if (bgColor.toLowerCase() === 'white' || bgColor === '#fff' || bgColor === '#ffffff') {
          return `<${tagName}${attributes} style="color: #606060;">`;
        }
        
        const brightness = calculateBrightness(bgColor);
        // If background is bright enough, add dark text color
        if (brightness >= 144) {
          return `<${tagName}${attributes} style="color: #606060;">`;
        }
      }
      
      // Special case for links
      if (tagName.toLowerCase() === 'a' && !attributes.includes('style=')) {
        return match.replace('>', ' style="color:#a7b4ff !important;">');
      }
      
      return match;
    }
  );
  
  // Restore preserved elements
  processedElements.forEach((value, key) => {
    processedHtml = processedHtml.replace(key, value);
  });
  
  return processedHtml;
};

