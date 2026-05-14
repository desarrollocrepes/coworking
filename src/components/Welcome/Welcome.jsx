import React, { useState, useEffect } from 'react';
import { Info, CheckCircle, RefreshCw, Calendar, MapPin, MapPinOff, Loader2, ChevronLeft } from 'lucide-react';
import Button from '../Shared/Button';
import './Welcome.css';

const Welcome = ({ userData, policiesAccepted, onAcceptPolicies, onContinue }) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAccept = async () => {
    setLoading(true); setErrorMsg('');
    try {
      const res = await fetch('https://macfer.crepesywaffles.com/api/working-politicas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documento: userData.cedula, aceptadas: true, fecha: new Date().toISOString() })
      });
      if(!res.ok) throw new Error('No se pudieron registrar las políticas');
      onAcceptPolicies();
    } catch(err) { setErrorMsg('Error al guardar tu confirmación.'); } 
    finally { setLoading(false); }
  };

  return (
    <div className="container container-sm" style={{paddingTop: '2rem'}}>
      <div className="welcome-card">
        <div className="profile-section">
          <img src={userData.photo} alt={userData.name} className="profile-pic" />
          <div className="profile-details">
            <h2>¡Hola, {userData.name}!</h2>
            <p className="subtitle">Bienvenido a tu espacio de trabajo</p>
            <p className="role">{userData.role} • {userData.department}</p>
          </div>
        </div>
        <div className="time-widget">
          <p className="date">{currentTime.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <p className="time">{currentTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>

      {!policiesAccepted ? (
        <div className="policy-box">
          <div className="policy-header"><Info color="var(--primary)" size={24} /> Políticas de reserva</div>
          <div className="policy-body">
            <p style={{marginBottom: '1.5rem', fontWeight: 500}}>Lee las condiciones antes de continuar:</p>
            <ul className="policy-list">
              <li className="policy-item"><div className="policy-icon"><CheckCircle size={20} /></div><div className="policy-text-block"><strong>Una reserva por día</strong>Solo se permite 1 reserva activa por día (pendiente o confirmada)</div></li>
              <li className="policy-item"><div className="policy-icon"><RefreshCw size={20} /></div><div className="policy-text-block"><strong>Rotación de puesto</strong>No puedes usar el mismo puesto en días consecutivos</div></li>
              <li className="policy-item"><div className="policy-icon"><Calendar size={20} /></div><div className="policy-text-block"><strong>Horarios de reserva</strong>Las reservas están habilitadas en días hábiles</div></li>
              <li className="policy-item"><div className="policy-icon"><MapPin size={20} /></div><div className="policy-text-block"><strong>Confirmación en 15 minutos</strong>Debes confirmar el mismo día dentro de los 15 min de tu turno, en un perímetro de 1000m</div></li>
              <li className="policy-item"><div className="policy-icon danger"><MapPinOff size={20} /></div><div className="policy-text-block"><strong>Sin GPS disponible</strong>Si tu dispositivo no permite ubicación, acude a recepción para confirmar</div></li>
            </ul>
            {errorMsg && <div className="alert alert-danger">{errorMsg}</div>}
            <div className="policy-footer">
              <Button disabled={loading} onClick={handleAccept} className="btn-w-full" style={{maxWidth: '300px'}}>
                {loading ? <Loader2 className="spin" size={18} /> : 'He leído y acepto las políticas'} 
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="policy-box flex-between" style={{padding: '1.5rem', flexWrap: 'wrap', gap: '1rem'}}>
           <div className="flex-center gap-3">
              <div style={{background: '#d1fae5', color: '#059669', padding: '0.5rem', borderRadius: '50%'}}><CheckCircle size={24} /></div>
              <div><h3 style={{margin: '0 0 0.25rem'}}>Políticas Aceptadas</h3><p style={{margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)'}}>Ya has confirmado los términos del Co-Working.</p></div>
           </div>
           <Button onClick={onContinue}>Continuar a Salas <ChevronLeft style={{transform: 'rotate(180deg)'}} size={18} /></Button>
        </div>
      )}
    </div>
  );
};

export default Welcome;