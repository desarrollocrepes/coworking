import React, { useState, useEffect } from 'react';
import { Monitor, ChevronRight, Loader2, Armchair } from 'lucide-react';
import './Rooms.css';

const BASE = 'https://macfer.crepesywaffles.com';

export default function Rooms({ onSelectRoom }) {
  const [{ salas, loading, err }, setState] = useState({ salas: [], loading: true, err: '' });

  useEffect(() => {
    fetch(`${BASE}/api/working-salas?populate=foto`)
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(({ data }) => setState({ loading: false, err: '', salas: (data || []).map(i => {
        const a = i.attributes || i, u = a.foto?.data?.[0]?.attributes?.url;
        return { 
          ...a, id: i.id, nombre: a.nombre || `Sala ${i.id}`, 
          imagen: u ? (u.startsWith('http') ? u : BASE + u) : null 
        };
      })}))
      .catch(() => setState({ salas: [], loading: false, err: 'No se pudieron cargar las salas disponibles.' }));
  }, []);

  return (
    <div className="container flex-1">
      {err && <div className="alert alert-danger">{err}</div>}
      <div className="rooms-grid">
        {salas.map((s) => (
          <div key={s.id} onClick={() => onSelectRoom(s)} className="room-card">
            <div className="room-img-container">
              <img src={s.imagen} alt={s.nombre} className="room-img" />
              <div className="room-overlay" />
              <h3 className="room-title">{s.nombre}</h3>
            </div>
            <div className="room-info">
              <div className="room-features">
                <p><Armchair size={18} color="var(--primary)" /> <strong>{s.capacidad || 0} puestos</strong></p>
                <p><Monitor size={18} color="var(--primary)" /> <span>{s.monitores || 0} con monitor</span></p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}