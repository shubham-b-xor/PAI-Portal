import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Divider,
  Box,
  useTheme,
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  SwapHoriz as DelegationIcon,
  Chat as ChatIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/models';

const drawerWidth = 240;

interface SidebarProps {
  mobileOpen: boolean;
  onDrawerToggle: () => void;
  desktopOpen: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onDrawerToggle, desktopOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { user } = useAuth();

  const menuItems = [
    // {
    //   text: 'Dashboard',
    //   icon: <DashboardIcon />,
    //   path: '/dashboard',
    //   allowedRoles: [UserRole.ADMIN, UserRole.PROCUREMENT_SPECIALIST, UserRole.SUPPLIER],
    // },
    {
      text: 'PO Listing',
      icon: <ReceiptIcon />,
      path: '/purchase-orders',
      allowedRoles: [UserRole.ADMIN, UserRole.PROCUREMENT_SPECIALIST, UserRole.SUPPLIER],
    },
    {
      text: 'Delegation',
      icon: <DelegationIcon />,
      path: '/delegation',
      allowedRoles: [UserRole.ADMIN, UserRole.PROCUREMENT_SPECIALIST],
    },
    // {
    //   text: 'Chat',
    //   icon: <ChatIcon />,
    //   path: '/chat',
    //   allowedRoles: [UserRole.ADMIN, UserRole.PROCUREMENT_SPECIALIST, UserRole.SUPPLIER],
    // },
    // {
    //   text: 'Settings',
    //   icon: <SettingsIcon />,
    //   path: '/settings',
    //   allowedRoles: [UserRole.ADMIN, UserRole.PROCUREMENT_SPECIALIST, UserRole.SUPPLIER],
    // },
  ];

  // Filter menu items based on user role
  const filteredMenuItems = menuItems.filter(
    (item) => !user?.role || item.allowedRoles.includes(user.role)
  );

  const handleNavigation = (path: string) => {
    navigate(path);
    if (mobileOpen) {
      onDrawerToggle();
    }
  };

  const drawer = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        // height: '100%',
        bgcolor: 'background.paper',
        color: 'text.primary',
        borderRight: '1px solid',
        borderColor: 'divider',
        marginTop: '5rem',
        
      }}
    >
      <Toolbar
        sx={{
          px: 0,
          py: 0,
          marginLeft: 0,
          minHeight: 88,
          bgcolor: 'background.default',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        <Box
          component="img"
          src="/fls_logo.png"
          alt="App logo"
          sx={{ width: '100%', height: 50, objectFit: 'contain' }}
        />
      </Toolbar>
      <Divider />
      <List sx={{ flexGrow: 1, p: 0 }}>
        {filteredMenuItems.map((item) => {
          const isSelected =
            location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path));

          return (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                selected={isSelected}
                onClick={() => handleNavigation(item.path)}
                sx={{
                  justifyContent: 'initial',
                  px: 2.5,
                  borderRadius: '0px',
                  mx: 0,
                  color: 'text.primary',
                  '&.Mui-selected': {
                    backgroundColor: theme.palette.secondary.light,
                    color: theme.palette.text.primary,
                    '& .MuiListItemIcon-root': {
                      color: theme.palette.text.primary,
                    },
                  },
                  '&.Mui-selected:hover': {
                    backgroundColor: theme.palette.secondary.main,
                    color: theme.palette.primary.contrastText,
                  },
                  '&:hover': {
                    backgroundColor: theme.palette.action.hover,
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: 3,
                    justifyContent: 'center',
                    color: isSelected ? theme.palette.primary.main : theme.palette.primary.main,
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{
        width: { sm: desktopOpen ? drawerWidth : 0 },
        flexShrink: { sm: 0 },
        transition: 'width 0.2s ease',
        bgcolor: 'background.paper',
        overflow: 'hidden',
      }}
      aria-label="navigation menu"
    >
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
          },
        }}
      >
        {drawer}
      </Drawer>

      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          visibility: desktopOpen ? 'visible' : 'hidden',
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: desktopOpen ? drawerWidth : 0,
            transition: 'width 0.2s ease',
            overflowX: 'hidden',
            display: desktopOpen ? 'block' : 'none',
          },
        }}
        open
      >
        {drawer}
      </Drawer>
    </Box>
  );
};

export default Sidebar;
