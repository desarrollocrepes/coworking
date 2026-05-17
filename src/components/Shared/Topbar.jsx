import React from 'react';
import { ChevronLeft, LogOut, Tickets } from 'lucide-react';
import './Topbar.css';

const Topbar = ({ showBack, onBack, userData, onNavigate, onLogout }) => (
  <header className="topbar">
    <div className="topbar-left">
      {showBack && (
        <button onClick={onBack} className="btn-icon-only">
          <ChevronLeft size={24} />
        </button>
      )}
      
      <div className="user-profile">
        <img src={userData.photo} alt="Perfil" className="user-avatar" />
        <div className="user-info-text">
          <p>{userData.name.split(' ')[0]}</p>
          <span>{userData.cedula}</span>
        </div>
      </div>
    </div>

    {userData && (
      <div className="topbar-right">
        <button onClick={() => onNavigate('myReservations')} className="nav-link" title="Mis reservas">
          <Tickets size={20} /> 
          <span className="nav-text">Mis reservas</span>
        </button>
        
        <button onClick={onLogout} className="btn-icon-only logout-btn" title="Cerrar sesión">
          <LogOut size={20} />
        </button>
      </div>
    )}
  </header>
);

export default Topbar;