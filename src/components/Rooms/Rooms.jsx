import React, { useState, useEffect } from 'react';
import { User, Monitor, ChevronLeft, Loader2, Armchair } from 'lucide-react';
import './Rooms.css';

const BASE = 'https://macfer.crepesywaffles.com';

const Rooms = ({ onSelectRoom }) => {
  const [salas, setSalas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Normaliza una sala desde la API
  const normalizeSala = (item) => {
    const a = item.attributes ?? item;
    let imagenUrl = null;
    const fotoArr = a.foto?.data;
    
    if (Array.isArray(fotoArr) && fotoArr.length > 0) {
      const url = fotoArr[0].attributes?.url;
      if (url) imagenUrl = url.startsWith('http') ? url : `${BASE}${url}`;
    }

    return {
      id: item.id,
      nombre: a.nombre ?? `Sala ${item.id}`,
      capacidad: a.capacidad ?? 0,
      monitores: a.monitores ?? 0,
      imagen: imagenUrl,
    };
  };

  useEffect(() => {
    const fetchSalas = async () => {
      setLoading(true); 
      setErrorMsg('');
      try {
        const res = await fetch(`${BASE}/api/working-salas?populate=foto`);
        if(!res.ok) throw new Error('Error al cargar salas');
        const response = await res.json();
        const salasNormalizadas = (response.data || []).map(normalizeSala);
        setSalas(salasNormalizadas);
      } catch (err) { 
        setErrorMsg('No se pudieron cargar las salas disponibles.'); 
      } 
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
          <div key={sala.id} onClick={() => onSelectRoom(sala)} className="room-card">
            <div className="room-img-container">
              <img src={sala.imagen} alt={sala.nombre} className="room-img" />
              <div className="room-overlay"></div>
              <h3 className="room-title">{sala.nombre}</h3>
            </div>
            <div className="room-info">
              <div className="room-features">
                <p><Armchair size={18} color="var(--primary)" /> <strong>{sala.capacidad || 0} puestos</strong></p>
                <p><Monitor size={18} color="var(--primary)" /> <span>{sala.monitores || 0} con monitor</span></p>
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