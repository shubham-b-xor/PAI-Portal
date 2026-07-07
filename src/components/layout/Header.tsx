import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
  Chip,
} from '@mui/material';
import {
  // Brightness4,
  // Brightness7,
  Logout,
  Settings,
  Menu as MenuIcon,
} from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  // const { mode, toggleTheme } = useThemeMode();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const userNameOverrides: Record<string, string> = {
    "Procurement Specialist 1": "John",
    "Procurement Specialist 2": "Karl",
    "Procurement Specialist 3": "Smith",
    "Procurement Specialist 4": "David",
    "Procurement Specialist 5": "Michael",
    "Procurement Specialist 6": "James",
    "Procurement Specialist 7": "Robert",
    "Procurement Specialist 8": "William",
    "Procurement Specialist 9": "Thomas",
    "Procurement Specialist 10": "Daniel",
    "Procurement Specialist 11": "Chris",
    "Procurement Specialist 12": "Kevin",
  };

  const getDisplayName = (name?: string) => {
    if (!name) return "";
    return userNameOverrides[name] || name;
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
    navigate('/login');
  };

  const getRoleDisplay = (role: string) => {
    switch(role) {
      case 'ADMIN':
        return 'Admin';
      case 'PROCUREMENT_SPECIALIST':
        return 'Procurement Specialist';
      case 'SUPPLIER':
        return 'Supplier';
      default:
        return role;
    }
  };

    const getPortalName = (role: string) => {
    switch(role) {
      case 'ADMIN':
        return 'Admin Portal';
      case 'PROCUREMENT_SPECIALIST':
        return 'Procurement Cockpit';
      case 'SUPPLIER':
        return 'Supplier Collaboration';
      default:
        return 'Procurement Cockpit';
    }
  };

  const getRoleColor = (role: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch(role) {
      case 'ADMIN':
        return 'error';
      case 'PROCUREMENT_SPECIALIST':
        return 'primary';
      case 'SUPPLIER':
        return 'secondary';
      default:
        return 'default';
    }
  };

  return (
    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={onMenuClick}
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>

        <Box
          sx={{
            flexGrow: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Typography
            noWrap
            component="div"
            sx={{
              fontSize: '1.25rem',
              fontWeight: 400,
              color: '#FFFFFF',
            }}
          >
            {getPortalName(user?.role || '')}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {user && (
            <Chip
              label={getRoleDisplay(user.role)}
              color={getRoleColor(user.role)}
              size="small"
              sx={{ display: { xs: 'none', sm: 'flex' } }}
            />
          )}

          {/* <Tooltip title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}>
            <IconButton onClick={toggleTheme} color="inherit">
              {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
            </IconButton>
          </Tooltip> */}

          {user && (
            <>
              <Tooltip title="Account settings">
                <IconButton onClick={handleMenuOpen} sx={{ p: 0 }}>
                  <Avatar
                    alt={getDisplayName(user.name)}
                    sx={{ width: 36, height: 36, bgcolor: 'secondary.main' }}
                  >
                    {getDisplayName(user.name).charAt(0).toUpperCase()}
                  </Avatar>
                </IconButton>
              </Tooltip>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                onClick={handleMenuClose}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              >
                <MenuItem disabled>
                  <Typography variant="body2" fontWeight="bold">
                     {getDisplayName(user.name)}
                  </Typography>
                </MenuItem>
                <MenuItem disabled>
                  <Typography variant="caption" color="text.secondary">
                    {user.email}
                  </Typography>
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    handleMenuClose();
                    navigate('/settings');
                  }}
                >
                  <Settings sx={{ mr: 1 }} fontSize="small" />
                  Settings
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                  <Logout sx={{ mr: 1 }} fontSize="small" />
                  Logout
                </MenuItem>
              </Menu>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;