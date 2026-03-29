import { Layout, Menu, Dropdown, Avatar, Typography } from 'antd';
import type { ReactNode } from 'react';
import type { MenuProps } from 'antd';
import { Navigate, useLocation, useNavigate, Routes, Route } from 'react-router-dom';
import { ReadOutlined, HistoryOutlined, SettingOutlined, LogoutOutlined } from '@ant-design/icons';
import Home from './pages/Home';
import Archive from './pages/Archive';
import FeedManager from './pages/FeedManager';
import DigestDetail from './pages/DigestDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import { AuthProvider, useAuth } from './context/AuthContext';
import './App.css';

const { Header, Content } = Layout;
const { Text } = Typography;

// A custom wrapper that redirects unauthenticated users to /login
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, userName, userEmail } = useAuth();

  const menuItems = [
    { key: '/', icon: <ReadOutlined />, label: 'Today' },
    { key: '/archive', icon: <HistoryOutlined />, label: 'Archive' },
    { key: '/feeds', icon: <SettingOutlined />, label: 'Feed Manager' }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userInitial = userName ? userName.charAt(0).toUpperCase() : 'U';

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      label: (
        <div style={{ padding: '4px 8px' }}>
          <Text strong style={{ display: 'block', color: '#fff' }}>{userName || 'User'}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>{userEmail}</Text>
        </div>
      ),
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined style={{ color: '#ff4d4f' }} />,
      label: <Text style={{ color: '#ff4d4f' }}>Logout</Text>,
      onClick: handleLogout,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header className="briefr-navbar">
        <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => navigate('/')}>
          <ReadOutlined style={{ fontSize: '24px', color: '#6c63ff' }} />
          <span className="briefr-logo-text">Briefr</span>
        </div>
        <Menu
          mode="horizontal"
          selectedKeys={[location.pathname.split('/').slice(0, 2).join('/') || '/']}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ flex: 1, justifyContent: 'flex-end', background: 'transparent', borderBottom: 'none' }}
        />
        <div style={{ marginLeft: '24px', display: 'flex', alignItems: 'center' }}>
          <Dropdown menu={{ items: userMenuItems }} trigger={['click']} placement="bottomRight">
            <Avatar 
              size={36} 
              style={{ backgroundColor: 'rgba(108, 99, 255, 0.15)', color: '#6c63ff', border: '1px solid rgba(108, 99, 255, 0.3)', cursor: 'pointer', fontWeight: 600 }}
            >
              {userInitial}
            </Avatar>
          </Dropdown>
        </div>
      </Header>
      
      <Content>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/archive" element={<Archive />} />
          <Route path="/archive/:id" element={<DigestDetail />} />
          <Route path="/feeds" element={<FeedManager />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Content>
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/*" element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        } />
      </Routes>
    </AuthProvider>
  );
}

export default App;
