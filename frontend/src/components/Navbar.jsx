import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { LogOut, Link2, User } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <Link2 size={24} style={{ stroke: 'url(#brand-grad)', filter: 'drop-shadow(0 0 8px rgba(59,130,246,0.5))' }} />
        <span>ShortTime</span>
        
        {/* SVG definition to color the icon using a gradient */}
        <svg width="0" height="0" style={{ position: 'absolute' }}>
          <defs>
            <linearGradient id="brand-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#d946ef" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {user && (
        <div className="nav-user">
          <div className="nav-username">
            <User size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
            <span>{user.username}</span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={logout}>
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      )}
    </nav>
  );
}
