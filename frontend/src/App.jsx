import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Navbar from './components/Navbar.jsx';
import URLForm from './components/URLForm.jsx';
import URLList from './components/URLList.jsx';
import AnalyticsView from './components/AnalyticsView.jsx';
import SystemUsersList from './components/SystemUsersList.jsx';
import { 
  Lock, Mail, User, ShieldAlert, KeyRound, 
  Link as LinkIcon, BarChart3, Activity, Ban, CheckCircle 
} from 'lucide-react';

function Dashboard() {
  const { fetchWithAuth, user } = useAuth();
  const [urls, setUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnalyticsId, setSelectedAnalyticsId] = useState(null);
  const [systemUsers, setSystemUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const [filterMode, setFilterMode] = useState('all'); // 'all', 'active', 'expired'
  const [showAllClicksModal, setShowAllClicksModal] = useState(false);
  const [allClicksData, setAllClicksData] = useState([]);
  const [allClicksLoading, setAllClicksLoading] = useState(false);

  const fetchSystemUsers = async () => {
    if (user?.role !== 'admin') return;
    setUsersLoading(true);
    try {
      const response = await fetchWithAuth('/auth/users');
      if (response.ok) {
        const data = await response.json();
        setSystemUsers(data);
      }
    } catch (err) {
      console.error('Failed to load system users:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchUrls = async () => {
    try {
      const response = await fetchWithAuth('/urls');
      if (response.ok) {
        const data = await response.json();
        setUrls(data);
      }
      if (user?.role === 'admin') {
        fetchSystemUsers();
      }
    } catch (err) {
      console.error('Failed to load URLs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewAllClicks = async () => {
    if (user?.role !== 'admin') return;
    setShowAllClicksModal(true);
    setAllClicksLoading(true);
    try {
      const response = await fetchWithAuth('/urls/all-clicks');
      if (response.ok) {
        const data = await response.json();
        setAllClicksData(data);
      }
    } catch (err) {
      console.error('Failed to load clicks logs:', err);
    } finally {
      setAllClicksLoading(false);
    }
  };

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    fetchUrls();
  }, [user]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Establish connection to backend WebSocket server
    const socket = io('http://localhost:5001');

    // Live click tracker
    socket.on('url_clicked', (data) => {
      // 1. Update the click count of the corresponding short link in state
      setUrls((prevUrls) =>
        prevUrls.map((u) =>
          u.id === data.urlId ? { ...u, clicks: data.clicksCount } : u
        )
      );

      // 2. Append new click entry to Admin's active log modal
      setAllClicksData((prevClicks) => {
        if (prevClicks.some((c) => c.id === data.newClick.id && c.clickedAt === data.newClick.clickedAt)) {
          return prevClicks;
        }
        return [data.newClick, ...prevClicks];
      });
    });

    // Live URL creation tracker
    socket.on('url_created', (newUrl) => {
      setUrls((prevUrls) => {
        if (prevUrls.some((u) => u.id === newUrl.id)) return prevUrls;
        
        // If regular user, only add if it's created by an admin OR a middle user OR if it is their own link
        const isFromAdminOrMiddle = newUrl.user?.role === 'admin' || newUrl.user?.role === 'midleuser';
        const isMine = newUrl.userId === user?.id;
        if (user?.role === 'user' && !isFromAdminOrMiddle && !isMine) {
          return prevUrls;
        }

        return [newUrl, ...prevUrls];
      });

      // Increment linkCount for the owner user in the system users sidebar list
      if (user?.role === 'admin') {
        setSystemUsers((prevUsers) =>
          prevUsers.map((u) =>
            u.id === newUrl.userId ? { ...u, linkCount: u.linkCount + 1 } : u
          )
        );
      }
    });

    // Live URL deletion tracker
    socket.on('url_deleted', (deletedId) => {
      setUrls((prevUrls) => {
        const deletedUrl = prevUrls.find((u) => u.id === Number(deletedId));
        if (deletedUrl && user?.role === 'admin') {
          setSystemUsers((prevUsers) =>
            prevUsers.map((u) =>
              u.id === deletedUrl.userId ? { ...u, linkCount: Math.max(0, u.linkCount - 1) } : u
            )
          );
        }
        return prevUrls.filter((u) => u.id !== Number(deletedId));
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  // Compute metrics
  const totalUrls = urls.length;
  const totalClicks = urls.reduce((acc, curr) => acc + (curr.clicks || 0), 0);
  const expiredUrls = urls.filter(u => u.expiresAt && new Date(u.expiresAt) <= now).length;
  const activeUrls = totalUrls - expiredUrls;

  // Filtered URLs passed to URLList
  const filteredUrls = urls.filter(u => {
    const isExp = u.expiresAt && new Date(u.expiresAt) <= now;
    if (filterMode === 'active') return !isExp;
    if (filterMode === 'expired') return isExp;
    return true;
  });

  if (loading) {
    return (
      <div className="loading-container" style={{ minHeight: '60vh' }}>
        <span className="spinner"></span>
        <p>Loading your ShortTime dashboard...</p>
      </div>
    );
  }

  return (
    <div className="main-content">
      {selectedAnalyticsId ? (
        <AnalyticsView 
          urlId={selectedAnalyticsId} 
          onClose={() => setSelectedAnalyticsId(null)} 
        />
      ) : (
        <>
          {/* KPI Dashboard metrics banner */}
          <div className="metrics-row">
            <div 
              className="metric-card"
              onClick={() => setFilterMode('all')}
              style={{ 
                cursor: 'pointer',
                border: filterMode === 'all' ? '1px solid rgba(6, 182, 212, 0.6)' : '1px solid var(--border-color)'
              }}
              title="Click to view all links"
            >
              <div className="metric-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                <LinkIcon size={12} style={{ color: '#3b82f6' }} />
                <span>Total Links</span>
              </div>
              <div className="metric-value">{totalUrls}</div>
            </div>
            
            {user?.role !== 'user' && (
              <div 
                className="metric-card"
                onClick={user?.role === 'admin' ? handleViewAllClicks : null}
                style={{ 
                  cursor: user?.role === 'admin' ? 'pointer' : 'default',
                  border: '1px solid var(--border-color)'
                }}
                title={user?.role === 'admin' ? "Click to view visitor details & names" : ""}
              >
                <div className="metric-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                  <Activity size={12} style={{ color: '#10b981' }} />
                  <span>Total Clicks</span>
                </div>
                <div className="metric-value" style={{ color: user?.role === 'admin' ? '#34d399' : 'inherit' }}>{totalClicks}</div>
              </div>
            )}

            <div 
              className="metric-card"
              onClick={() => setFilterMode('active')}
              style={{ 
                cursor: 'pointer',
                border: filterMode === 'active' ? '1px solid rgba(16, 185, 129, 0.6)' : '1px solid var(--border-color)'
              }}
              title="Click to view active links"
            >
              <div className="metric-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                <BarChart3 size={12} style={{ color: '#a855f7' }} />
                <span>Active Links</span>
              </div>
              <div className="metric-value">{activeUrls}</div>
            </div>

            <div 
              className="metric-card"
              onClick={() => setFilterMode('expired')}
              style={{ 
                cursor: 'pointer',
                border: filterMode === 'expired' ? '1px solid rgba(244, 63, 94, 0.6)' : '1px solid var(--border-color)'
              }}
              title="Click to view expired links"
            >
              <div className="metric-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                <Ban size={12} style={{ color: '#ef4444' }} />
                <span>Expired Links</span>
              </div>
              <div className="metric-value">{expiredUrls}</div>
            </div>
          </div>

          {/* Core Panel Grid */}
          <div className="dashboard-grid" style={{ gridTemplateColumns: '380px 1fr' }}>
            {user?.role === 'admin' ? (
              <SystemUsersList users={systemUsers} loading={usersLoading} />
            ) : (
              <URLForm onUrlCreated={fetchUrls} />
            )}
            <URLList 
              urls={filteredUrls} 
              now={now}
              onRefresh={fetchUrls} 
              onViewAnalytics={(id) => setSelectedAnalyticsId(id)} 
            />
          </div>

          {/* All Clicks Visitor Details Modal */}
          {showAllClicksModal && (
            <div className="modal-backdrop" onClick={() => setShowAllClicksModal(false)}>
              <div className="modal-content" style={{ maxWidth: '850px' }} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h4 className="modal-title">System-Wide Click Logs</h4>
                  <button className="modal-close" onClick={() => setShowAllClicksModal(false)}>&times;</button>
                </div>
                <div className="modal-body">
                  {allClicksLoading ? (
                    <div className="loading-container">
                      <span className="spinner"></span>
                      <p>Fetching click entries...</p>
                    </div>
                  ) : allClicksData.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#64748b', padding: '3rem 0' }}>No click data recorded yet.</p>
                  ) : (
                    <div className="url-list-wrapper">
                      <table className="url-table" style={{ fontSize: '0.825rem' }}>
                        <thead>
                          <tr>
                            <th>Timestamp</th>
                            <th>Short Link</th>
                            <th>Created By (Owner)</th>
                            <th>IP Address</th>
                            <th>Browser/OS</th>
                            <th>Device</th>
                            <th>Referrer</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allClicksData.map((click) => {
                            const date = new Date(click.clickedAt).toLocaleString();
                            return (
                              <tr key={click.id}>
                                <td>{date}</td>
                                <td>
                                  <span style={{ color: '#06b6d4', fontWeight: 'bold' }}>
                                    /{click.shortUrl?.shortCode || 'deleted'}
                                  </span>
                                </td>
                                <td>
                                  <span className="tag tag-active" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#a855f7', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                                    {click.shortUrl?.user?.username || 'System'}
                                  </span>
                                </td>
                                <td style={{ fontFamily: 'monospace' }}>{click.ipAddress}</td>
                                <td>{click.browser} on {click.os}</td>
                                <td>{click.device}</td>
                                <td style={{ color: '#64748b' }}>{click.referrer}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AuthForm() {
  const { login, register, error: authError } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setSuccessMessage('');
    setLoading(true);

    if (!email || !password || (!isLogin && !username)) {
      setLocalError('Please fill out all required fields.');
      setLoading(false);
      return;
    }

    try {
      let result;
      if (isLogin) {
        result = await login(email, password);
        if (result.success) {
          setLocalError('');
          setSuccessMessage('');
        }
      } else {
        result = await register(username, email, password);
        if (result.success) {
          // Reset fields and toggle to login page
          setUsername('');
          setEmail('');
          setPassword('');
          setIsLogin(true);
          setLocalError('');
          setSuccessMessage('Registration successful! Please sign in with your credentials.');
        }
      }

      if (result && !result.success) {
        setLocalError(result.message);
      }
    } catch (err) {
      setLocalError('Authentication failed. Check server status.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setUsername('');
    setEmail('');
    setPassword('');
    setLocalError('');
    setSuccessMessage('');
  };

  const displayedError = localError || authError;

  return (
    <div className="auth-page">
      <div className="glass-card auth-card">
        <h2 className="auth-title">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
        <p className="auth-subtitle">
          {isLogin ? 'Sign in to access your dashboard' : 'Join ShortTime to shorten & track links'}
        </p>

        {displayedError && (
          <div className="alert alert-error">
            <ShieldAlert size={16} />
            <span>{displayedError}</span>
          </div>
        )}

        {successMessage && (
          <div className="alert alert-success" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', borderRadius: '6px', fontSize: '0.875rem', marginBottom: '1rem' }}>
            <CheckCircle size={16} style={{ flexShrink: 0 }} />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label className="form-label">Username</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="john_doe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  style={{ paddingLeft: '2.5rem' }}
                />
                <User size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                className="input-field"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ paddingLeft: '2.5rem' }}
              />
              <Mail size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingLeft: '2.5rem' }}
              />
              <KeyRound size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
            {loading ? <span className="spinner"></span> : <span>{isLogin ? 'Sign In' : 'Register'}</span>}
          </button>
        </form>

        <div className="auth-footer">
          <span>{isLogin ? "Don't have an account? " : "Already have an account? "}</span>
          <span className="auth-link" onClick={toggleMode}>
            {isLogin ? 'Register now' : 'Sign in'}
          </span>
        </div>
      </div>
    </div>
  );
}

function MainLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container" style={{ minHeight: '100vh' }}>
        <span className="spinner"></span>
        <p>Loading ShortTime secure session...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Navbar />
      {user ? <Dashboard /> : <AuthForm />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
