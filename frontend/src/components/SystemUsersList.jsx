import React from 'react';
import { Users, Shield, Calendar, Link2, Mail, User } from 'lucide-react';

export default function SystemUsersList({ users, loading }) {
  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getRoleBadgeColor = (role) => {
    if (role === 'admin') return { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' };
    if (role === 'midleuser') return { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' };
    return { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' };
  };

  const getRoleDisplayName = (role) => {
    if (role === 'admin') return 'Admin';
    if (role === 'midleuser') return 'Middle User';
    return 'Standard User';
  };

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '400px' }}>
      <h3 style={{ marginBottom: '1.25rem', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Users size={18} style={{ color: '#06b6d4' }} />
        <span>System Users</span>
      </h3>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#64748b', gap: '0.75rem', padding: '2rem 0' }}>
          <span className="spinner"></span>
          <span style={{ fontSize: '0.875rem' }}>Loading user details...</span>
        </div>
      ) : users.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: '#64748b' }}>
          <p>No registered users found.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', maxHeight: '520px', paddingRight: '0.25rem' }} className="url-list-wrapper">
          {users.map((item) => {
            const badge = getRoleBadgeColor(item.role);
            return (
              <div 
                key={item.id} 
                className="glass-card" 
                style={{ 
                  padding: '1rem', 
                  background: 'rgba(255,255,255,0.02)', 
                  borderColor: 'rgba(255,255,255,0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.625rem'
                }}
              >
                {/* Username & Role Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600', color: '#f8fafc', fontSize: '0.925rem' }}>
                    <User size={14} style={{ color: '#94a3b8' }} />
                    <span>{item.username}</span>
                  </div>
                  <span 
                    style={{ 
                      fontSize: '0.7rem', 
                      fontWeight: '600', 
                      padding: '0.15rem 0.5rem', 
                      borderRadius: '4px',
                      backgroundColor: badge.bg,
                      color: badge.text,
                      border: badge.border
                    }}
                  >
                    {getRoleDisplayName(item.role)}
                  </span>
                </div>

                {/* Email Address */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                  <Mail size={13} style={{ color: '#64748b' }} />
                  <span style={{ wordBreak: 'break-all' }}>{item.email}</span>
                </div>

                {/* Info row: links & joined date */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.625rem', marginTop: '0.25rem', fontSize: '0.75rem', color: '#64748b' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Link2 size={12} />
                    <span>{item.linkCount} {item.linkCount === 1 ? 'link' : 'links'} created</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Calendar size={12} />
                    <span>Joined {formatDate(item.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
