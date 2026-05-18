import React from 'react';
import { ChevronLeft, LogOut, Tickets, Shield } from 'lucide-react';
import './Topbar.css';

const Topbar = ({ showBack, onBack, userData, onNavigate, onLogout }) => (
  <header className="topbar">
    <div className="topbar-left">
      {showBack && (
        <button onClick={onBack} className="btn-icon-only">
          <ChevronLeft size={18} />
        </button>
      )}
      
      <div className="user-profile">
        <img src={userData.photo} alt="Perfil" className="user-avatar" />
        <div className="user-info-text">
          <p>{userData.name.split(' ')[0]}</p>
          <span>{userData.cedula}
          </span>
        </div>
      </div>
    </div>

    {userData && (
      <div className="topbar-right">
        <button 
          onClick={() => onNavigate('myReservations')} 
          className="nav-link" 
          title={userData.isAdmin ? "Gestión reservas" : "Mis reservas"}
        >
          <Tickets size={18} /> 
          <span className="nav-text">
            {userData.isAdmin ? "Gestión reservas" : "Mis reservas"}
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