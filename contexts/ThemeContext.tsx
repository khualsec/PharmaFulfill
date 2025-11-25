import { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark' | 'rainbow';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('pharma-theme') as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('pharma-theme', theme);
    
    const root = document.documentElement;
    
    // Remove all theme classes and attributes
    root.classList.remove('light', 'dark', 'rainbow');
    root.removeAttribute('data-theme');
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'rainbow') {
      root.setAttribute('data-theme', 'rainbow');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}