import React from 'react';
import { ChevronLeft, LogOut, Tickets, Shield } from 'lucide-react';
import './Topbar.css';

// 1. Recibe showProfileInfo en lugar de showPhoto
const Topbar = ({ showBack, showProfileInfo, onBack, userData, onNavigate, onLogout }) => (
  <header className="topbar">
    <div className="topbar-left">
      {showBack && (
        <button onClick={onBack} className="btn-icon-only">
          <ChevronLeft size={18} />
        </button>
      )}
      
      {/* 2. Envuelve TODO el contenedor del perfil con la condición */}
      {showProfileInfo && (
        <div className="user-profile">
          <img src={userData.photo} alt="Perfil" className="user-avatar" />
          <div className="user-info-text">
            <p>{userData.name.split(' ')[0]}</p>
            <span>{userData.cedula}</span>
          </div>
        </div>
      )}
    </div>

    {userData && (
      <div className="topbar-right">
        <button 
          onClick={() => onNavigate('myReservations')} 
          className="nav-link" 
          title={userData.isAdmin ? "Gestión reservas" : "Mis reservas"}
        >
          <span className="nav-text">
            <Tickets size={18} /> {userData.isAdmin ? "Gestión reservas" : "Mis reservas"}
          </span>
        </button>
        
        <button onClick={onLogout} className="btn-icon-only logout-btn" title="Cerrar sesión">
          <LogOut size={18} />
        </button>
      </div>
    )}
  </header>
);

export default Topbar;