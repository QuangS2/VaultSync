import { useState, useEffect } from 'react';
import { MainLayout } from './components/layout/MainLayout';

export type AppTheme = 'sun' | 'cloud' | 'night';

export default function App() {
  const [theme, setTheme] = useState<AppTheme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vaultsync_theme') as AppTheme;
      if (saved === 'sun' || saved === 'cloud' || saved === 'night') return saved;
    }
    return 'sun'; // Default to warm cream Sun mode
  });

  useEffect(() => {
    // Apply data-theme attribute to document root
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('vaultsync_theme', theme);
  }, [theme]);

  return (
    <MainLayout
      theme={theme}
      onThemeChange={setTheme}
    />
  );
}
