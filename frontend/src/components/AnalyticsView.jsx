import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { Calendar, Globe, Monitor, Compass, Shield, History, ArrowLeft } from 'lucide-react';

const COLORS = ['#3b82f6', '#a855f7', '#10b981', '#ec4899', '#f59e0b', '#06b6d4'];

export default function AnalyticsView({ urlId, onClose }) {
  const { fetchWithAuth } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetchWithAuth(`/urls/${urlId}/analytics`);
        const result = await response.json();
        if (response.ok) {
          setData(result);
        } else {
          throw new Error(result.message || 'Failed to load analytics.');
        }
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (urlId) {
      fetchAnalytics();
    }
  }, [urlId]);

  if (loading) {
    return (
      <div className="loading-container">
        <span className="spinner"></span>
        <p>Analyzing link performance records...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error" style={{ margin: '2rem' }}>
        <span>Error: {error}</span>
        <button className="btn btn-secondary btn-sm" onClick={onClose} style={{ marginLeft: 'auto' }}>
          Back
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { urlDetails, analyticsSummary } = data;

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderPieChartLegend = (chartData) => {
    if (!chartData || chartData.length === 0) return null;
    return (
      <div className="custom-legend">
        {chartData.map((entry, index) => (
          <div key={`legend-${index}`} className="legend-item">
            <span className="legend-color" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
            <span>{entry.name}: {entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Detail Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button className="btn btn-secondary btn-icon btn-sm" onClick={onClose} title="Go Back">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Analytics Performance</h2>
          <p style={{ fontSize: '0.825rem', color: '#94a3b8', maxWidth: '500px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Original Destination: <a href={urlDetails.originalUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none' }}>{urlDetails.originalUrl}</a>
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="analytics-grid-cards" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="metric-card">
          <div className="metric-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
            <History size={12} />
            <span>Total Clicks</span>
          </div>
          <div className="metric-value">{analyticsSummary.totalClicks}</div>
        </div>

        <div className="metric-card">
          <div className="metric-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
            <Calendar size={12} />
            <span>Last Visited</span>
          </div>
          <div style={{ fontSize: '0.875rem', fontWeight: 'bold', marginTop: '0.5rem', color: '#f8fafc' }}>
            {formatDate(analyticsSummary.lastVisited)}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
            <Shield size={12} />
            <span>Link Expiration</span>
          </div>
          <div style={{ fontSize: '0.875rem', fontWeight: 'bold', marginTop: '0.5rem', color: '#f8fafc' }}>
            {urlDetails.expiresAt ? new Date(urlDetails.expiresAt).toLocaleDateString() : 'Permanent'}
          </div>
        </div>
      </div>

      <>
          {/* Main Charts Row */}
          <div className="analytics-charts-grid">
            {/* Trend Area Chart */}
            <div className="chart-card">
              <h4 className="chart-title">Daily Visit Trends (Last 7 Days)</h4>
              <div className="chart-container-inner">
                {analyticsSummary.dailyTrends && analyticsSummary.dailyTrends.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analyticsSummary.dailyTrends} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#64748b" 
                        fontSize={10} 
                        tickFormatter={(tick) => tick.substring(5)} 
                      />
                      <YAxis stroke="#64748b" fontSize={10} allowDecimals={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f8fafc', fontFamily: 'Plus Jakarta Sans' }} 
                      />
                      <Area type="monotone" dataKey="clicks" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorClicks)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.875rem' }}>
                    No click trend data available.
                  </div>
                )}
              </div>
            </div>

            {/* Device Type Distribution */}
            <div className="chart-card">
              <h4 className="chart-title">Device Types</h4>
              <div className="chart-container-inner">
                {analyticsSummary.devices && analyticsSummary.devices.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height="75%">
                      <PieChart>
                        <Pie
                          data={analyticsSummary.devices}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={60}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {analyticsSummary.devices.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    {renderPieChartLegend(analyticsSummary.devices)}
                  </>
                ) : (
                  <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.875rem' }}>
                    No device data.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* OS & Browser Breakdown Charts Row */}
          <div className="analytics-charts-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            {/* Browsers Chart */}
            <div className="chart-card" style={{ height: '280px' }}>
              <h4 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Compass size={14} />
                <span>Browsers</span>
              </h4>
              <div className="chart-container-inner">
                {analyticsSummary.browsers && analyticsSummary.browsers.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsSummary.browsers} layout="vertical" margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                      <XAxis type="number" stroke="#64748b" fontSize={9} allowDecimals={false} />
                      <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={9} width={90} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }} />
                      <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.875rem' }}>
                    No browser data.
                  </div>
                )}
              </div>
            </div>

            {/* Operating Systems Chart */}
            <div className="chart-card" style={{ height: '280px' }}>
              <h4 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Monitor size={14} />
                <span>Operating Systems</span>
              </h4>
              <div className="chart-container-inner">
                {analyticsSummary.operatingSystems && analyticsSummary.operatingSystems.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsSummary.operatingSystems} layout="vertical" margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                      <XAxis type="number" stroke="#64748b" fontSize={9} allowDecimals={false} />
                      <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={9} width={90} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }} />
                      <Bar dataKey="value" fill="#ec4899" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.875rem' }}>
                    No OS data.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Referrers Chart Row */}
          <div className="chart-card" style={{ height: '260px', marginBottom: '1.5rem' }}>
            <h4 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Globe size={14} />
              <span>Traffic Referrers</span>
            </h4>
            <div className="chart-container-inner">
              {analyticsSummary.referrers && analyticsSummary.referrers.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsSummary.referrers} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={9} />
                    <YAxis stroke="#64748b" fontSize={9} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }} />
                    <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.875rem' }}>
                  No traffic source details available.
                </div>
              )}
            </div>
          </div>

          {/* Recent Visits Table */}
          <div className="glass-card">
            <h3 style={{ marginBottom: '1.25rem', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <History size={16} style={{ color: '#3b82f6' }} />
              <span>Recent Visitor Logs</span>
            </h3>

            {analyticsSummary.recentHistory && analyticsSummary.recentHistory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748b', fontSize: '0.875rem' }}>
                This short link has not received any clicks yet.
              </div>
            ) : (
              <div className="url-list-wrapper">
                <table className="url-table" style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>IP Address</th>
                      <th>Browser</th>
                      <th>OS</th>
                      <th>Device</th>
                      <th>Referrer</th>
                      <th>Geoloc (Mock)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsSummary.recentHistory && analyticsSummary.recentHistory.map((click) => (
                      <tr key={click.id}>
                        <td>{formatDate(click.clickedAt)}</td>
                        <td style={{ fontFamily: 'monospace', color: '#94a3b8' }}>{click.ipAddress}</td>
                        <td>{click.browser}</td>
                        <td>{click.os}</td>
                        <td>
                          <span className="tag" style={{ background: 'rgba(255,255,255,0.04)', color: '#f8fafc' }}>
                            {click.device}
                          </span>
                        </td>
                        <td style={{ color: '#64748b' }}>{click.referrer}</td>
                        <td>{click.country}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
    </div>
  );
}
