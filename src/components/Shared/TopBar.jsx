import React from 'react';
import { ChevronLeft, Building, Calendar, LogOut } from 'lucide-react';
import './Topbar.css';

const Topbar = ({ title, showBack, onBack, userData, onNavigate, onLogout }) => (
  <header className="topbar">
    <div className="flex-center gap-3">
      {showBack && <button onClick={onBack} className="btn-icon-only"><ChevronLeft size={24} /></button>}
      <h1 className="topbar-title"><Building color="var(--primary)" size={24} /> {title}</h1>
    </div>
    {userData && (
      <div className="flex-center gap-3">
        <button onClick={() => onNavigate('myReservations')} className="nav-link"><Calendar size={18} /> Mis Reservas</button>
        <div className="divider-v"></div>
        <div className="user-info-text">
          <p>{userData.name}</p>
          <span>ID: {userData.cedula}</span>
        </div>
        <img src={userData.photo} alt="Perfil" className="user-avatar" />
        <button onClick={onLogout} className="btn-icon-only" title="Cerrar sesión"><LogOut size={20} /></button>
      </div>
    )}
  </header>
);

export default Topbar;