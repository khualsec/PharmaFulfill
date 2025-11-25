import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from './ui/button';
import { Pill, LogOut, Sun, Moon, Sparkles } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

export default function Navigation() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  // Decide where the logo should send the user
  const dashboardLink = (() => {
    if (!user) return '/';

    switch (user.role) {
      case 'Patient':
        return '/dashboard/patient';
      case 'Pharmacist':
        return '/dashboard/pharmacist';
      case 'Tech':
        return '/dashboard/tech';
      case 'Admin':
        return '/dashboard/admin';
      default:
        return '/';
    }
  })();

  const renderThemeIcon = () => {
    if (theme === 'dark') return <Moon className="size-4" />;
    if (theme === 'rainbow') return <Sparkles className="size-4" />;
    return <Sun className="size-4" />;
  };

  const currentThemeLabel =
    theme === 'dark'
      ? 'Dark mode'
      : theme === 'rainbow'
      ? 'Rainbow mode'
      : 'Light mode';

  return (
    <nav className="border-b bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo → sends to dashboard if logged in, otherwise home */}
        <Link
          to={dashboardLink}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <Pill className="size-8 text-primary" />
          <span className="text-2xl font-semibold">PharmaFulfill</span>
        </Link>

        <div className="flex items-center gap-3">
          {/* Theme switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                aria-label={`Theme: ${currentThemeLabel}`}
                title={currentThemeLabel}
              >
                {renderThemeIcon()}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme('light')}>
                <Sun className="size-4 mr-2" />
                Light Mode
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('dark')}>
                <Moon className="size-4 mr-2" />
                Dark Mode
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('rainbow')}>
                <Sparkles className="size-4 mr-2" />
                Rainbow Mode
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Auth section */}
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm">
                Welcome,{' '}
                <span className="font-semibold">
                  {user.name || 'User'}
                </span>
                {user.role && ` (${user.role})`}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
              >
                <LogOut className="size-4 mr-2" />
                Logout
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/login">Login</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/signup">Sign Up</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}