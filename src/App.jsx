import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import './App.css';
import Topbar from './components/Shared/Topbar';
import Button from './components/Shared/Button';
import Login from './components/Login/Login';
import Welcome from './components/Welcome/Welcome';
import Rooms from './components/Rooms/Rooms';
import DeskSelection from './components/DeskSelection/DeskSelection';
import MyReservations from './components/MyReservations/MyReservations';

export default function CoworkingApp() {
  const [currentView, setCurrentView] = useState('login'); 
  const [userData, setUserData] = useState(null);
  const [policiesAccepted, setPoliciesAccepted] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLoginSuccess = (data, policies) => {
    setUserData(data);
    setPoliciesAccepted(policies);
    setCurrentView('welcome');
  };

  const handleLogout = () => {
    setCurrentView('login');
    setUserData(null);
    setPoliciesAccepted(false);
    setSelectedRoom(null);
    setShowLogoutModal(false);
  };

  const getTitle = () => {
    switch(currentView) {
      case 'welcome': return 'Inicio';
      case 'rooms': return 'Salas';
      case 'deskSelection': return `Reservar en ${selectedRoom?.nombre}`;
      case 'myReservations': return userData?.isAdmin ? 'Todas las reservas' : 'Mis reservas';
      default: return 'Coworking';
    }
  };

  return (
    <div className="cw-app">
      {currentView !== 'login' && (
        <Topbar
          showBack={currentView === 'rooms' || currentView === 'deskSelection' || currentView === 'myReservations'}
          onBack={() => {
            if(currentView === 'myReservations' || currentView === 'rooms') setCurrentView('welcome');
            if(currentView === 'deskSelection') setCurrentView('rooms');
          }}
          userData={userData} 
          onNavigate={setCurrentView} 
          onLogout={() => setShowLogoutModal(true)} 
        />
      )}

      {currentView === 'login' && <Login onLoginSuccess={handleLoginSuccess} />}
      
      {currentView === 'welcome' && (
        <Welcome 
          userData={userData} policiesAccepted={policiesAccepted} 
          onAcceptPolicies={() => setPoliciesAccepted(true)} 
          onContinue={() => setCurrentView('rooms')} 
        />
      )}
      
      {currentView === 'rooms' && (
        <Rooms onSelectRoom={(room) => { setSelectedRoom(room); setCurrentView('deskSelection'); }} />
      )}
      
      {currentView === 'deskSelection' && (
        <DeskSelection room={selectedRoom} userData={userData} onSuccess={() => setCurrentView('myReservations')} />
      )}
      
      {currentView === 'myReservations' && (
        <MyReservations userData={userData} />
      )}

      {showLogoutModal && (
        <div className="modal-overlay" style={{zIndex: 100}}>
          <div className="modal-content">
            <h3 style={{color: 'var(--danger)', margin:'0 0 1rem', display:'flex', alignItems:'center', gap:'0.5rem'}}>¿Cerrar Sesión?</h3>
            <p style={{marginBottom:'1.5rem', color: 'var(--text-muted)'}}>¿Estás seguro de que deseas salir de tu sesión actual?</p>
            <div className="modal-actions">
              <Button variant="secondary" onClick={() => setShowLogoutModal(false)}>Cancelar</Button>
              <Button variant="danger" onClick={handleLogout}>Sí, salir</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}