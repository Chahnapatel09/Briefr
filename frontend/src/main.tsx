import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import './index.css';
import App from './App.tsx';

// Briefr specific theme based on user's wireframe
const briefrTheme = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#6c63ff', // Soft purple
    colorInfo: '#00d4aa',    // Teal green
    colorBgBase: '#0b0a15',  // Primary background
    colorBgContainer: '#161625', // Card background
    colorBorderSecondary: '#2a2a4a', // Subtle card borders
    fontFamily: "'Inter', sans-serif",
    fontSize: 16,
    borderRadius: 8,
  },
  components: {
    Card: {
      colorBorderSecondary: '#2a2a4a',
      borderRadiusLG: 12,
    },
    Layout: {
      headerBg: '#1a1a2e',
      siderBg: '#1a1a2e',
    },
    Menu: {
      activeBarHeight: 0, // Removes the default bottom line highlight
      itemBorderRadius: 16,
      itemSelectedBg: 'rgba(108, 99, 255, 0.15)', // Soft purple tinted box
      itemSelectedColor: '#6c63ff',
      itemHoverBg: 'rgba(255, 255, 255, 0.05)',
      itemHoverColor: '#6c63ff',
      itemColor: '#94a3b8',
      horizontalItemSelectedColor: '#6c63ff',
      horizontalItemSelectedBg: 'rgba(108, 99, 255, 0.15)'
    }
  }
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ConfigProvider theme={briefrTheme}>
        <App />
      </ConfigProvider>
    </BrowserRouter>
  </StrictMode>
);
