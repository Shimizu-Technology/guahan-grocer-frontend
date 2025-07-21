const tintColorLight = '#1F2937'; // Dark gray for active tabs - clearly visible
const tintColorDark = '#fff';

export default {
  light: {
    text: '#000',
    background: '#fff',
    tint: tintColorLight,
    tabIconDefault: '#D1D5DB', // Lighter gray for inactive tabs - better contrast
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#fff',
    background: '#000',
    tint: tintColorDark,
    tabIconDefault: '#6B7280', // Darker gray for dark mode inactive tabs
    tabIconSelected: tintColorDark,
  },
};
