import React, { useState, useEffect } from 'react';
import { Calendar, Monitor, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import Button from '../Shared/Button';
import './DeskSelection.css';

const DeskSelection = ({ room, userData, onSuccess }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [horarios, setHorarios] = useState([]);
  const [ocupacion, setOcupacion] = useState({});
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [bookingDesk, setBookingDesk] = useState(null); 
  const [selectedTurno, setSelectedTurno] = useState('');
  const [motivoReserva, setMotivoReserva] = useState('');

  useEffect(() => {
    const fetchDisponibilidad = async () => {
      setLoading(true); setErrorMsg('');
      try {
        const [resH, resO] = await Promise.all([
          fetch('https://macfer.crepesywaffles.com/api/working-horarios'),
          fetch(`https://macfer.crepesywaffles.com/api/working-puesto?sala_id=${room.id}&fecha=${selectedDate}`)
        ]);
        if(!resH.ok || !resO.ok) throw new Error('Error al cargar datos');
        
        const hData = await resH.json();
        const oData = await resO.json();
        
        setHorarios(Array.isArray(hData) ? hData : []);
        const ocupMap = {};
        if (Array.isArray(oData)) {
          oData.forEach(item => { ocupMap[item.escritorio || item.puesto_id] = item; });
        }
        setOcupacion(ocupMap);
      } catch (err) { setErrorMsg('No se pudo cargar la disponibilidad.'); } 
      finally { setLoading(false); }
    };
    fetchDisponibilidad();
  }, [room.id, selectedDate]);

  const handleBooking = async () => {
    if (!selectedTurno) { setErrorMsg('Selecciona un turno'); return; }
    setLoading(true); setErrorMsg('');
    try {
       const res = await fetch('https://macfer.crepesywaffles.com/api/working-reservas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documento: userData.cedula, sala_id: room.id, escritorio: bookingDesk, fecha: selectedDate, turno: selectedTurno, motivo: motivoReserva || 'Ninguno' })
       });
       if(!res.ok) throw new Error('No se pudo crear la reserva');
       setBookingDesk(null);
       onSuccess();
    } catch(err) { setErrorMsg('Error al procesar tu reserva.'); } 
    finally { setLoading(false); }
  };

  const desks = Array.from({ length: room.capacity || 6 }, (_, i) => i + 1);
  const getStatusClass = (id) => {
    const status = (ocupacion[id]?.estado || 'available').toLowerCase();
    if (status.includes('ocupado')) return 'bg-occupied occupied';
    if (status.includes('limitado')) return 'bg-limited';
    return 'bg-available';
  };

  return (
    <>
      <div className="container flex-1">
        <div className="desk-layout">
          <div className="desk-main-area">
            {errorMsg && <div className="alert alert-danger flex-between"><span>{errorMsg}</span><button onClick={() => setErrorMsg('')} style={{background:'none', border:'none', cursor:'pointer'}}><AlertTriangle size={18}/></button></div>}

            <div className="filters-bar">
              <div className="flex-center gap-2"><Calendar color="var(--primary)" size={20} /><input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="date-picker" /></div>
              <div className="legend-items">
                <div className="flex-center gap-2"><span className="legend-dot" style={{background: 'var(--success)'}}></span> Disponible</div>
                <div className="flex-center gap-2"><span className="legend-dot" style={{background: 'var(--warning)'}}></span> Medio Turno</div>
                <div className="flex-center gap-2"><span className="legend-dot" style={{background: 'var(--danger)'}}></span> Ocupado</div>
                <div className="flex-center gap-2" style={{marginLeft: '0.5rem'}}><Monitor size={16}/> Esc: {(room.con_monitor || []).join(', ')}</div>
              </div>
            </div>

            <div className="map-container">
              {loading && <div className="overlay-loader"><Loader2 className="spin" size={40} color="var(--primary)"/></div>}
              <div className="table-graphic">
                <div className="table-surface"><div className="table-surface-inner"></div><span className="table-label">Mesa<br/>Principal</span></div>
                {desks.map((deskId, idx) => {
                  const isTop = idx < desks.length / 2;
                  const leftPercent = isTop ? 20 + (idx * 30) : 20 + ((idx - desks.length/2) * 30);
                  const hasMonitor = (room.con_monitor || []).includes(deskId);
                  const statusClass = getStatusClass(deskId);
                  return (
                    <div key={deskId} className={`desk-node ${isTop ? 'top' : 'bottom'} ${statusClass.includes('occupied') ? 'occupied' : ''}`} style={{ left: `${leftPercent}%` }} onClick={() => { if (!statusClass.includes('occupied')) setBookingDesk(deskId); }}>
                      {isTop && hasMonitor && <Monitor size={20} color="#4b5563" />}
                      <div className={`desk-box ${statusClass}`}>{deskId}</div>
                      <span className="desk-badge">Esc. {deskId}</span>
                      {!isTop && hasMonitor && <Monitor size={20} color="#4b5563" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="desk-sidebar">
            <div className="sidebar-header"><Clock size={20} /> Ocupación Actual</div>
            <div className="sidebar-body">
              {desks.map(deskId => (
                <div key={deskId} className="sidebar-item">
                  <div className={`sidebar-desk-icon ${getStatusClass(deskId).split(' ')[0]}`}>{deskId}</div>
                  <div className="sidebar-desk-info">
                    <p className="title">Esc. {deskId} {(room.con_monitor || []).includes(deskId) && <Monitor size={14} color="var(--primary)" />}</p>
                    <p className="status" style={!ocupacion[deskId]?.usuario ? {color: 'var(--success)', fontWeight: 500} : {}}>{ocupacion[deskId]?.usuario || 'Libre'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {bookingDesk && (
         <div className="modal-overlay">
           <div className="modal-content">
             <h3 style={{color: 'var(--primary)', display:'flex', alignItems:'center', gap:'0.5rem', margin:'0 0 1rem'}}><Calendar /> Confirmar Reserva</h3>
             <p style={{marginBottom:'1rem'}}>Reservando <strong>Escritorio {bookingDesk}</strong> para el <strong>{selectedDate}</strong>.</p>
             <select value={selectedTurno} onChange={(e) => setSelectedTurno(e.target.value)} className="form-select">
                <option value="">Selecciona un turno...</option>
                {horarios.map(h => <option key={h.id || h.nombre} value={h.id || h.nombre}>{h.etiqueta || h.nombre || h.id}</option>)}
             </select>
             <input type="text" value={motivoReserva} onChange={(e) => setMotivoReserva(e.target.value)} placeholder="Motivo de reserva (Opcional)" className="form-select" style={{marginBottom: '1.5rem'}} />
             <div className="modal-actions">
                <Button variant="secondary" onClick={() => setBookingDesk(null)}>Cancelar</Button>
                <Button onClick={handleBooking} disabled={!selectedTurno || loading}>{loading ? <Loader2 className="spin" size={18} /> : 'Confirmar Reserva'}</Button>
             </div>
           </div>
         </div>
      )}
    </>
  );
};

export default DeskSelection;