import React, { useState, useEffect } from 'react';
import { Info, CheckCircle, RefreshCw, Calendar, MapPin, MapPinOff, Loader2, ChevronLeft } from 'lucide-react';
import Button from '../Shared/Button';
import './Welcome.css';

const API_URL = 'https://macfer.crepesywaffles.com/api/working-politicas';

const Welcome = ({ userData, policiesAccepted, onAcceptPolicies, onContinue }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(new Date());
  const [checked, setChecked] = useState(false);
  const [accepted, setAccepted] = useState(policiesAccepted);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!userData?.cedula) return;
    fetch(`${API_URL}?filters[documento][$eq]=${userData.cedula}`)
      .then(r => r.json())
      .then(d => { if (d.data?.length) { setAccepted(true); onAcceptPolicies(); } })
      .catch(console.error)
      .finally(() => setChecked(true));
  }, [userData?.cedula, onAcceptPolicies]);

  const handleAccept = () => {
    setLoading(true); setError('');
    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { documento: userData.cedula, acepto: true } })
    })
      .then(r => { if (!r.ok) throw new Error(); setAccepted(true); onAcceptPolicies(); })
      .catch(() => setError('Error al guardar tu confirmación.'))
      .finally(() => setLoading(false));
  };

  const policies = [
    { Icon: CheckCircle, t: 'Una reserva por día', d: 'Solo se permite 1 reserva activa por día (pendiente o confirmada)' },
    { Icon: RefreshCw, t: 'Rotación de puesto', d: 'No puedes usar el mismo puesto en días consecutivos' },
    { Icon: Calendar, t: 'Horarios de reserva', d: 'Las reservas están habilitadas en días hábiles' },
    { Icon: MapPin, t: 'Confirmación en 15 minutos', d: 'Debes confirmar el mismo día dentro de los 15 min de tu turno, en un perímetro de 1000m' },
    { Icon: MapPinOff, t: 'Sin GPS disponible', d: 'Si tu dispositivo no permite ubicación, acude a recepción para confirmar', danger: true }
  ];

  return (
    <div className="container" style={{ paddingTop: '2rem' }}>
      <div className="welcome-card">
        <div className="profile-section">
          <img src={userData.photo} alt={userData.name} className="profile-pic" />
          <div className="profile-details">
            <h2>¡Hola, {userData.name}!</h2>
            <p className="role">{userData.cedula}</p>
          </div>
        </div>
        <div className="time-widget">
          <p className="date">{now.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <p className="time">{now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
        </div>
      </div>

      {!checked ? (
        <div className="policy-box">
          <div className="flex-center" style={{ padding: '2rem', gap: '1rem' }}><Loader2 className="spin" size={18} /><p>Verificando políticas...</p></div>
        </div>
      ) : !accepted ? (
        <div className="policy-box">
          <div className="policy-header">Políticas de reserva</div>
          <div className="policy-body">
            <p style={{ marginBottom: '1.5rem', fontWeight: 500 }}>Lee las condiciones antes de continuar:</p>
            <ul className="policy-list">
              {policies.map(({ Icon, t, d, danger }, i) => (
                <li key={i} className="policy-item">
                  <div className={`policy-icon ${danger ? 'danger' : ''}`}><Icon size={18} /></div>
                  <div className="policy-text-block"><strong>{t}</strong>{d}</div>
                </li>
              ))}
            </ul>
            {error && <div className="alert alert-danger">{error}</div>}
            <div className="policy-footer">
              <Button disabled={loading} onClick={handleAccept} className="btn-w-full" style={{ maxWidth: '300px' }}>
                {loading ? <Loader2 className="spin" size={18} /> : 'He leído y acepto las políticas'}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="policy-box flex-between" style={{ padding: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div className="flex-center gap-3">
            <div>
              <h3 style={{ margin: '0 0 0.25rem' }}>Ya has confirmado las Políticas de Reserva del Co-Working</h3>
            </div>
          </div>
          <Button onClick={onContinue}>Continuar<ChevronLeft style={{ transform: 'rotate(180deg)' }} size={18} /></Button>
        </div>
      )}
    </div>
  );
};

export default Welcome;