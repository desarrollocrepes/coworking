import React, { useState, useEffect } from 'react';
import { User, Monitor, ChevronLeft, Loader2 } from 'lucide-react';
import './Rooms.css';

const Rooms = ({ onSelectRoom }) => {
  const [salas, setSalas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchSalas = async () => {
      setLoading(true); setErrorMsg('');
      try {
        const res = await fetch('https://macfer.crepesywaffles.com/api/working-salas');
        if(!res.ok) throw new Error('Error al cargar salas');
        const data = await res.json();
        setSalas(Array.isArray(data) ? data : []);
      } catch (err) { setErrorMsg('No se pudieron cargar las salas disponibles.'); } 
      finally { setLoading(false); }
    };
    fetchSalas();
  }, []);

  return (
    <div className="container flex-1">
      <div className="page-header">
        <div><h2>Elige tu sala</h2><p>Selecciona la sala para continuar con tu reserva.</p></div>
        {loading && <Loader2 className="spin text-primary" size={28} color="var(--primary)" />}
      </div>
      {errorMsg && <div className="alert alert-danger">{errorMsg}</div>}
      <div className="rooms-grid">
        {salas.map((sala) => (
          <div key={sala.id} onClick={() => onSelectRoom({ ...sala, capacity: sala.capacidad || 6, withMonitor: sala.con_monitor || [] })} className="room-card">
            <div className="room-img-container">
              <img src={sala.imagen || 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80'} alt={sala.nombre} className="room-img" />
              <div className="room-overlay"></div>
              <h3 className="room-title">{sala.nombre}</h3>
            </div>
            <div className="room-info">
              <div className="room-features">
                <p><User size={18} color="var(--primary)" /> <strong>{sala.capacidad || 0} puestos</strong></p>
                <p><Monitor size={18} color="var(--primary)" /> <span>{(sala.con_monitor || []).length} con monitor</span></p>
              </div>
              <div className="room-action-icon"><ChevronLeft style={{transform: 'rotate(180deg)'}} size={24} /></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Rooms;