/**
 * PROXIi Global Theme - Cyberpunk Orange/Black/Glass Aesthetic
 * 
 * This is the single source of truth for all colors in the app.
 * All UI components MUST use these colors for consistency.
 */

export const CyberpunkTheme = {
    // Primary Color - Neon Orange
    primary: '#ff6902',

    // Backgrounds
    background: '#000000', // Pure Black
    surface: 'rgba(255, 105, 2, 0.1)', // Translucent Orange for Glassmorphism

    // Text
    text: '#ffffff', // White
    textSecondary: 'rgba(255, 255, 255, 0.7)', // Slightly dimmed white
    textTertiary: 'rgba(255, 255, 255, 0.5)', // Even more dimmed

    // Neon Glow Effects - Use as shadow colors
    glowPrimary: 'rgba(255, 105, 2, 0.6)', // For primary button glows
    glowStrong: 'rgba(255, 105, 2, 0.8)', // For stronger emphasis
    glowSubtle: 'rgba(255, 105, 2, 0.3)', // For subtle accents

    // Inactive/Disabled States
    inactive: 'rgba(255, 255, 255, 0.3)',
    disabled: 'rgba(255, 255, 255, 0.2)',

    // Borders
    border: 'rgba(255, 105, 2, 0.4)',
    borderSubtle: 'rgba(255, 255, 255, 0.1)',
};

// Re-export as default for convenience
export default CyberpunkTheme;
