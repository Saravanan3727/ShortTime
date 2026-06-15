import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { Link, Sparkles, Calendar, Upload, AlertCircle, CheckCircle, FileSpreadsheet } from 'lucide-react';

export default function URLForm({ onUrlCreated }) {
  const { fetchWithAuth, user } = useAuth();
  
  // Single shorten state
  const [originalUrl, setOriginalUrl] = useState('');
  const [name, setName] = useState('');
  const [showAlias, setShowAlias] = useState(false);
  const [customAlias, setCustomAlias] = useState('');
  const [showExpiry, setShowExpiry] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  // CSV State
  const [csvFile, setCsvFile] = useState(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvStatus, setCsvStatus] = useState(null);
  const fileInputRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!originalUrl) return;

    // Fast URL format validation
    try {
      new URL(originalUrl);
    } catch (_) {
      setStatus({ type: 'error', message: 'Please enter a valid URL, including http:// or https://' });
      return;
    }

    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const payload = {
        originalUrl,
        name: name.trim() || undefined,
        customAlias: showAlias ? customAlias : undefined,
        expiresAt: showExpiry ? expiresAt : undefined,
      };

      const response = await fetchWithAuth('/urls', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to shorten URL.');
      }

      setStatus({ type: 'success', message: `Shortened URL successfully! Code: ${data.shortCode}` });
      setOriginalUrl('');
      setName('');
      setCustomAlias('');
      setExpiresAt('');
      setShowAlias(false);
      setShowExpiry(false);
      
      if (onUrlCreated) {
        onUrlCreated();
      }
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCsvChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        alert('Please select a valid CSV file.');
        return;
      }
      setCsvFile(file);
    }
  };

  const handleCsvSubmit = async (e) => {
    e.preventDefault();
    if (!csvFile) return;

    setCsvLoading(true);
    setCsvStatus(null);

    const formData = new FormData();
    formData.append('file', csvFile);

    try {
      const response = await fetchWithAuth('/urls/bulk', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'CSV processing failed.');
      }

      setCsvStatus({
        successCount: data.successCount,
        errorCount: data.errorCount,
        errors: data.errors || []
      });

      setCsvFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      if (onUrlCreated) {
        onUrlCreated();
      }
    } catch (err) {
      setCsvStatus({
        error: err.message
      });
    } finally {
      setCsvLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Shorten URL Form */}
      <div className="glass-card">
        <h3 style={{ marginBottom: '1.25rem', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={18} style={{ color: '#3b82f6' }} />
          <span>Shorten a URL</span>
        </h3>

        {status.message && (
          <div className={`alert alert-${status.type}`}>
            {status.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span>{status.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Destination URL</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="input-field"
                placeholder="https://example.com/very-long-destination-path"
                value={originalUrl}
                onChange={(e) => setOriginalUrl(e.target.value)}
                required
                disabled={loading}
                style={{ paddingLeft: '2.5rem' }}
              />
              <Link size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Link Name / Title (optional)</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. My Website (Automatically fetched if left blank)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                style={{ paddingLeft: '2.5rem' }}
              />
              <Sparkles size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.25rem' }}>
            <div className="form-switch" onClick={() => setShowAlias(!showAlias)}>
              <input type="checkbox" checked={showAlias} readOnly />
              <span>Custom Alias</span>
            </div>

            <div className="form-switch" onClick={() => setShowExpiry(!showExpiry)}>
              <input type="checkbox" checked={showExpiry} readOnly />
              <span>Set Expiration</span>
            </div>
          </div>

          {showAlias && (
            <div className="form-group" style={{ animation: 'fadeIn 0.2s ease-out' }}>
              <label className="form-label">Custom Alias (optional)</label>
              <input
                type="text"
                className="input-field"
                placeholder="my-custom-slug"
                value={customAlias}
                onChange={(e) => setCustomAlias(e.target.value)}
                disabled={loading}
              />
            </div>
          )}

          {showExpiry && (
            <div className="form-group" style={{ animation: 'fadeIn 0.2s ease-out' }}>
              <label className="form-label">Expires At</label>
              <input
                type="datetime-local"
                className="input-field"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                disabled={loading}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? <span className="spinner"></span> : <span>Shorten URL</span>}
          </button>
        </form>
      </div>

      {/* CSV Bulk Shortening */}
      {user?.role === 'midleuser' && (
        <div className="glass-card">
          <h3 style={{ marginBottom: '0.5rem', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileSpreadsheet size={18} style={{ color: '#8b5cf6' }} />
            <span>Bulk Shortener</span>
          </h3>
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '1.25rem' }}>
            Upload a CSV file with headers: <code>url</code>, <code>alias</code>, and <code>expiresAt</code>.
          </p>

          {csvStatus && (
            <div style={{ marginBottom: '1rem', fontSize: '0.825rem' }}>
              {csvStatus.error ? (
                <div className="alert alert-error">
                  <AlertCircle size={16} />
                  <span>{csvStatus.error}</span>
                </div>
              ) : (
                <div className="glass-card" style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' }}>
                  <div style={{ color: '#34d399', fontWeight: 'bold' }}>
                    ✓ Processed CSV: {csvStatus.successCount} links created.
                  </div>
                  {csvStatus.errorCount > 0 && (
                    <div style={{ color: '#f87171', marginTop: '0.25rem', fontWeight: 'bold' }}>
                      ✗ Errors encountered: {csvStatus.errorCount} rows failed.
                    </div>
                  )}
                  {csvStatus.errors.length > 0 && (
                    <div style={{ maxHeight: '100px', overflowY: 'auto', marginTop: '0.5rem', background: '#090d16', padding: '0.5rem', borderRadius: '4px', fontSize: '0.7rem', color: '#94a3b8' }}>
                      {csvStatus.errors.map((err, idx) => (
                        <div key={idx} style={{ marginBottom: '0.25rem' }}>
                          Row {err.row}: {err.error} {err.url ? `(${err.url})` : ''}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleCsvSubmit}>
            <div className="form-group">
              <div 
                className="csv-dropzone" 
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
              >
                <Upload size={24} className="csv-icon" />
                <div className="csv-label">
                  {csvFile ? (
                    <span style={{ color: '#f8fafc', fontWeight: '500' }}>{csvFile.name}</span>
                  ) : (
                    <span>Click to browse and upload CSV</span>
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept=".csv"
                  onChange={handleCsvChange}
                  disabled={csvLoading}
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-secondary" 
              style={{ width: '100%' }} 
              disabled={csvLoading || !csvFile}
            >
              {csvLoading ? <span className="spinner"></span> : <span>Process CSV File</span>}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
