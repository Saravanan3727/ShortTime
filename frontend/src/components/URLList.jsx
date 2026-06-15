import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { Copy, Check, Trash2, Edit2, BarChart2, QrCode, Download, Save, X, Calendar } from 'lucide-react';

export default function URLList({ urls, now, onRefresh, onViewAnalytics }) {
  const { fetchWithAuth, BACKEND_URL, user } = useAuth();
  
  // Tabs and Editing state
  const [activeTab, setActiveTab] = useState('admin');
  const [editingId, setEditingId] = useState(null);
  const [editUrlText, setEditUrlText] = useState('');
  const [editNameText, setEditNameText] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // QR Code viewer modal state
  const [qrModalUrl, setQrModalUrl] = useState(null);

  // Copied feedback states
  const [copiedId, setCopiedId] = useState(null);

  const handleCopy = (id, shortCode) => {
    const fullLink = `${BACKEND_URL}/${shortCode}`;
    navigator.clipboard.writeText(fullLink);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this shortened URL? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetchWithAuth(`/urls/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        onRefresh();
      } else {
        const errData = await response.json();
        alert(errData.message || 'Failed to delete short URL.');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert(error.message);
    }
  };

  const startEdit = (urlItem) => {
    setEditingId(urlItem.id);
    setEditUrlText(urlItem.originalUrl);
    setEditNameText(urlItem.name || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditUrlText('');
    setEditNameText('');
  };

  const saveEdit = async (id) => {
    if (!editUrlText) return;
    setEditLoading(true);

    try {
      const response = await fetchWithAuth(`/urls/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ 
          originalUrl: editUrlText,
          name: editNameText.trim() || null
        }),
      });

      if (response.ok) {
        setEditingId(null);
        onRefresh();
      } else {
        const errData = await response.json();
        alert(errData.message || 'Failed to update URL destination.');
      }
    } catch (err) {
      console.error('Edit error:', err);
      alert(err.message);
    } finally {
      setEditLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatDateTime = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isExpired = (expiresAt) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) <= (now || new Date());
  };

  const adminUrls = urls.filter(u => !u.user || u.user.role === 'admin' || u.user.role === 'midleuser');
  const userUrls = urls.filter(u => u.user && u.user.role === 'user');
  const displayedUrls = activeTab === 'admin' ? adminUrls : userUrls;

  return (
    <div className="glass-card" style={{ flex: 1 }}>
      <h3 style={{ marginBottom: '1.25rem', fontSize: '1.25rem' }}>Shortened URLs</h3>

      {/* Glassmorphism Tabs Switcher */}
      {user?.role !== 'midleuser' && (
        <div className="tabs-header" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
          <button
            className={`tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('admin');
              cancelEdit();
            }}
            style={{
              background: 'none',
              border: 'none',
              color: activeTab === 'admin' ? '#06b6d4' : '#64748b',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              transition: 'all 0.3s ease',
              textShadow: activeTab === 'admin' ? '0 0 10px rgba(6, 182, 212, 0.4)' : 'none',
              borderBottom: activeTab === 'admin' ? '2px solid #06b6d4' : '2px solid transparent',
              marginBottom: '-0.85rem'
            }}
          >
            {user?.role === 'user' ? 'Global Links' : 'Admin Links'} ({adminUrls.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'user' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('user');
              cancelEdit();
            }}
            style={{
              background: 'none',
              border: 'none',
              color: activeTab === 'user' ? '#a855f7' : '#64748b',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              transition: 'all 0.3s ease',
              textShadow: activeTab === 'user' ? '0 0 10px rgba(168, 85, 247, 0.4)' : 'none',
              borderBottom: activeTab === 'user' ? '2px solid #a855f7' : '2px solid transparent',
              marginBottom: '-0.85rem'
            }}
          >
            {user?.role === 'user' ? 'My Personal Links' : 'User Links'} ({userUrls.length})
          </button>
        </div>
      )}

      {displayedUrls.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: '#64748b' }}>
          <p>No URLs in this section.</p>
        </div>
      ) : (
        <div className="url-list-wrapper">
          <table className="url-table">
            <thead>
              <tr>
                <th>Short Link</th>
                <th>Link Name</th>
                <th>Destination</th>
                <th>Status</th>
                <th>Created</th>
                <th>End Time</th>
                {(user?.role !== 'user' || activeTab === 'user') && <th style={{ textAlign: 'center' }}>Clicks</th>}
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedUrls.map((urlItem) => {
                const fullLink = `${BACKEND_URL}/${urlItem.shortCode}`;
                const expired = isExpired(urlItem.expiresAt);

                return (
                  <tr key={urlItem.id}>
                    {/* Short link and Copy button */}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {expired ? (
                          <span 
                            className="link-short" 
                            style={{ 
                              textDecoration: 'line-through', 
                              opacity: 0.5, 
                              cursor: 'not-allowed',
                              color: '#64748b'
                            }}
                            title="This link has expired"
                          >
                            /{urlItem.shortCode}
                          </span>
                        ) : (
                          <a href={fullLink} target="_blank" rel="noopener noreferrer" className="link-short">
                            /{urlItem.shortCode}
                          </a>
                        )}
                        <button 
                          className="btn btn-secondary btn-icon btn-sm" 
                          onClick={() => handleCopy(urlItem.id, urlItem.shortCode)}
                          title={expired ? "Link expired" : "Copy Link"}
                          disabled={expired}
                          style={{ 
                            padding: '0.25rem', 
                            opacity: expired ? 0.5 : 1, 
                            cursor: expired ? 'not-allowed' : 'pointer' 
                          }}
                        >
                          {copiedId === urlItem.id ? (
                            <Check size={12} style={{ color: '#34d399' }} />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Link Name */}
                    <td>
                      {editingId === urlItem.id ? (
                        <input
                          type="text"
                          className="input-field"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.825rem', width: '150px' }}
                          value={editNameText}
                          onChange={(e) => setEditNameText(e.target.value)}
                          disabled={editLoading}
                          placeholder="Link Name"
                        />
                      ) : (
                        <span style={{ fontWeight: '500', color: '#f8fafc' }}>
                          {urlItem.name || 'Untitled'}
                        </span>
                      )}
                    </td>

                    {/* Destination URL or Inline Edit Form */}
                    <td>
                      {editingId === urlItem.id ? (
                        <div className="edit-inline-form">
                          <input
                            type="text"
                            className="input-field"
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.825rem' }}
                            value={editUrlText}
                            onChange={(e) => setEditUrlText(e.target.value)}
                            disabled={editLoading}
                          />
                          <button 
                            className="btn btn-primary btn-sm btn-icon" 
                            onClick={() => saveEdit(urlItem.id)} 
                            disabled={editLoading}
                            title="Save"
                          >
                            <Save size={12} />
                          </button>
                          <button 
                            className="btn btn-secondary btn-sm btn-icon" 
                            onClick={cancelEdit} 
                            disabled={editLoading}
                            title="Cancel"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <div className="link-original" title={urlItem.originalUrl}>
                          {urlItem.originalUrl}
                        </div>
                      )}
                    </td>

                    {/* Expiry / Status tags */}
                    <td>
                      {expired ? (
                        <span className="tag tag-expired">Expired</span>
                      ) : urlItem.expiresAt ? (
                        <span className="tag tag-active" title={`Expires on ${formatDate(urlItem.expiresAt)}`}>
                          Active
                        </span>
                      ) : (
                        <span className="tag tag-active">Permanent</span>
                      )}
                    </td>

                    {/* Creation Date */}
                    <td style={{ color: '#64748b', fontSize: '0.75rem' }}>
                      {formatDate(urlItem.createdAt)}
                    </td>

                    {/* Expiration Date / End Time */}
                    <td style={{ color: '#64748b', fontSize: '0.75rem' }}>
                      {urlItem.expiresAt ? formatDateTime(urlItem.expiresAt) : 'Permanent'}
                    </td>

                    {/* Clicks */}
                    {(user?.role !== 'user' || activeTab === 'user') && (
                       <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                         {urlItem.clicks}
                       </td>
                     )}

                    {/* Action buttons */}
                    <td style={{ textAlign: 'right' }}>
                      <div className="link-actions">
                        <button 
                          className="btn btn-secondary btn-sm btn-icon"
                          onClick={() => setQrModalUrl(urlItem)}
                          title="QR Code"
                        >
                          <QrCode size={14} />
                        </button>
                        {(user?.role !== 'user' || urlItem.userId === user?.id) && (
                          <button 
                            className="btn btn-secondary btn-sm btn-icon"
                            onClick={() => onViewAnalytics(urlItem.id)}
                            title="View Analytics"
                          >
                            <BarChart2 size={14} />
                          </button>
                        )}
                        {(user?.role === 'admin' || user?.role === 'midleuser' || (user?.role === 'user' && activeTab === 'user')) && (
                          <>
                            <button 
                              className="btn btn-secondary btn-sm btn-icon"
                              onClick={() => startEdit(urlItem)}
                              disabled={editingId === urlItem.id}
                              title="Edit Destination"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              className="btn btn-danger btn-sm btn-icon"
                              onClick={() => handleDelete(urlItem.id)}
                              title="Delete Link"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* QR Code Modal Popup */}
      {qrModalUrl && (
        <div className="modal-backdrop" onClick={() => setQrModalUrl(null)}>
          <div className="modal-content" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h4 className="modal-title">QR Code Link</h4>
              <button className="modal-close" onClick={() => setQrModalUrl(null)}>&times;</button>
            </div>
            <div className="modal-body qr-container">
              <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                Scan to visit: <code>/{qrModalUrl.shortCode}</code>
              </p>
              
              {qrModalUrl.qrCodeDataUrl ? (
                <>
                  <img 
                    src={qrModalUrl.qrCodeDataUrl} 
                    alt="Short Link QR Code" 
                    className="qr-image" 
                  />
                  <a 
                    href={qrModalUrl.qrCodeDataUrl} 
                    download={`qr-code-${qrModalUrl.shortCode}.png`} 
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: '0.5rem' }}
                  >
                    <Download size={14} />
                    <span>Download QR Image</span>
                  </a>
                </>
              ) : (
                <div style={{ color: '#f87171', fontSize: '0.875rem' }}>
                  QR Code not generated for this link.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
