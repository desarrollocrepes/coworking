import React, { useState, useEffect } from 'react';
import { Calendar, Monitor, Clock, AlertTriangle, Loader2, SquareArrowDown, SquareArrowLeft, SquareArrowUp, ArrowDown, ArrowUp, Ticket } from 'lucide-react';
import Button from '../Shared/Button';
import tableImg from '../../assets/tables/table.png';
import chair1Img from '../../assets/chairs/chair1.png';
import chair2Img from '../../assets/chairs/chair2.png';
import chair3Img from '../../assets/chairs/chair3.png';
import './DeskSelection.css';

const API = `${import.meta.env.VITE_API_BASE_URL}/api`;
const DESKS_MONITOR = [1, 3, 6];
const desks = [1, 2, 3, 4, 5, 6];

const getDeskId = r => r.attributes?.working_puestos?.data?.[0]?.id || r.attributes?.escritorio;
const getTurnoId = r => r.attributes?.working_horarios?.data?.[0]?.id || r.attributes?.turno_id;
const getName = r => r.attributes?.Nombre || r.attributes?.nombre || '';

const DeskSelection = ({ room, userData, onSuccess }) => {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [horarios, setHorarios] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [availableDates, setAvailableDates] = useState([]);
  const [bookingDesk, setBookingDesk] = useState(null);
  const [selectedTurno, setSelectedTurno] = useState('');
  const [lastUserDesk, setLastUserDesk] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [simulatedDateTime, setSimulatedDateTime] = useState(''); //SIMULADOR DE TIEMPO TEMPORAL
  const getNow = () => simulatedDateTime ? new Date(simulatedDateTime) : new Date();
  const now = getNow();

  const isMorning1 = now.getHours() >= 0 && now.getHours() < 5;
  const todayStr = now.toISOString().split('T')[0];

  const docId = userData?.cedula || userData?.documento;
  const isMorning = new Date().getHours() >= 0 && new Date().getHours() < 5;

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      let dts = [], i = 0, d = new Date(); // modificar let dts = [], i = 0, d = new Date();
      while (dts.length < 2 && i < (isMorning ? 2 : 7)) {
        let curr = new Date(d); curr.setDate(d.getDate() + i++);
        if (curr.getDay() !== 0 && curr.getDay() !== 6) dts.push(curr.toISOString().split('T')[0]);
      }
      setAvailableDates(dts);
      if (dts.length && selectedDate === d.toISOString().split('T')[0]) setSelectedDate(dts[0]);

      try {
        const [hRes, rRes] = await Promise.all([
          fetch(`${API}/working-horarios`).then(r => r.json()),
          fetch(`${API}/working-reservas?populate=*`).then(r => r.json())
        ]);
        setHorarios(hRes.data || []);
        const userR = rRes.data.filter(r => 
          r.attributes?.documento === docId && 
          (r.attributes?.estado === true || r.attributes?.estado === null)
        );
        if (userR.length) setLastUserDesk(getDeskId(userR[userR.length - 1]));
      } catch { setErrorMsg('Error al cargar inicial'); }
      setLoading(false);
    };
    init();
  }, [docId, isMorning, selectedDate]);

  useEffect(() => {
    if (!selectedDate) return;
    setLoading(true);
    fetch(`${API}/working-reservas?populate=*`)
      .then(r => r.json())
      .then(d => setReservas(d.data.filter(r => 
        (r.attributes?.fecha_reserva || r.attributes?.fecha) === selectedDate && 
        (r.attributes?.estado === true || r.attributes?.estado === null)
      )))
      .catch(() => setErrorMsg('Error al cargar reservas'))
      .finally(() => setLoading(false));
  }, [selectedDate, docId]);

  const getDeskR = id => reservas.filter(r => getDeskId(r) === id);
  const canSelect = id => lastUserDesk === null || lastUserDesk !== id;
  const isAvail = (id, tId) => {
    const dr = getDeskR(id);
    return !dr.some(r => getTurnoId(r) === 3 || getTurnoId(r) === tId) && !(tId === 3 && dr.length > 0);
  };
  const getStatus = id => {
    const len = getDeskR(id).length;
    return getDeskR(id).some(r => getTurnoId(r) === 3) || len >= 2 ? 'bg-occupied occupied' : len === 1 ? 'bg-limited' : 'bg-available';
  };

  const handleBooking = async () => {
    if (!selectedTurno || !bookingDesk) return setErrorMsg('Selecciona escritorio y turno');
    if (!canSelect(bookingDesk)) return setErrorMsg(`Rotación: No puedes usar el escritorio ${lastUserDesk} de nuevo`);
    if (reservas.some(r => r.attributes?.documento === docId && r.attributes?.estado)) return setErrorMsg('Una reserva por día');
    if (!isAvail(bookingDesk, parseInt(selectedTurno))) return setErrorMsg('Escritorio no disponible');

    setLoading(true); setErrorMsg('');
    try {
      for (let i = 0; i < 3; i++) {
        const { data } = await fetch(`${API}/working-reservas?populate=*`).then(r => r.json());
        const dr = data.filter(r => 
          getDeskId(r) === bookingDesk && 
          r.attributes?.fecha_reserva === selectedDate && 
          (r.attributes?.estado === true || r.attributes?.estado === null)
        );
        if (dr.some(r => getTurnoId(r) === 3 || getTurnoId(r) == selectedTurno) || (selectedTurno == 3 && dr.length))
          throw new Error('El escritorio fue reservado mientras confirmabas');
      }

      const res = await fetch(`${API}/working-reservas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` },
        body: JSON.stringify({ data: {
          Nombre: userData?.name || '', foto: userData?.photo || '', documento: docId || '', area: userData?.department || '',
          fecha_reserva: selectedDate, estado: null, motivo_cancelacion: null,
          working_puestos: { connect: [bookingDesk] }, working_horarios: { connect: [parseInt(selectedTurno)] }
        }})
      });
      if (!res.ok) throw new Error((await res.json()).message || 'No se pudo crear la reserva');
      
      setBookingDesk(null); setSelectedTurno(''); onSuccess?.();
    } catch (err) { setErrorMsg(`Error: ${err.message}`); }
    finally { setLoading(false); }
  };

  return (
    <>
      <div className="container flex-1">
        <div className="desk-layout">
          
          <div className="desk-sidebar">
            <div 
              className="sidebar-header"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              style={{ cursor: 'pointer', justifyContent: 'space-between' }}
            >
              <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                Estado de escritorios
              </div>
              <span className="toggle-icon-mobile">{isSidebarOpen ? <ArrowUp size={18}/> : <ArrowDown size={18}/>}</span>
            </div>
            <div className={`sidebar-body ${!isSidebarOpen ? 'hidden-mobile' : ''}`}>
              {desks.map(id => {
                const dr = getDeskR(id);
                return (
                  <div key={id} className="sidebar-item" style={{opacity: !canSelect(id) ? 0.5 : 1}}>
                    <div className="sidebar-desk-info">
                      <p className="title">Escritorio {id} {DESKS_MONITOR.includes(id) && <Monitor size={18} color="var(--primary)" />}</p>
                      {dr.length > 0 && <div>
                        {dr.map((r, i) => {
                          const t = horarios.find(h => h.id === getTurnoId(r));
                          const inicio = t?.attributes?.inicio?.slice(0, 5) || t?.inicio?.slice(0,5) || '--:--';
                          const fin = t?.attributes?.fin?.slice(0, 5) || t?.fin?.slice(0,5) || '--:--';
                          const lbl = `${inicio} - ${fin}`;
                          return (
                            <div key={i} style={{marginBottom:'0.5rem', padding:'0.5rem', background:'transparent', borderRadius:'4px', display:'flex', gap:'0.5rem'}}>
                              {r.attributes?.foto && <img src={r.attributes.foto} alt="foto" style={{width:32, height:32, borderRadius:'50%', objectFit:'cover'}} />}
                              <div style={{flex: 1, minWidth: 0}}>
                                <strong style={{fontSize:'0.85rem', display:'block', overflow:'hidden', textOverflow:'ellipsis'}}>{getName(r)}</strong>
                                <span style={{fontSize:'0.7rem', color:'#666', display:'block'}}>{lbl}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>}
                      {!canSelect(id) && <p style={{fontSize: '0.75rem', color: 'red'}}>Debes seleccionar otro escritorio</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="desk-main-area">
            {errorMsg && <div className="alert alert-danger flex-between"><span>{errorMsg}</span><button onClick={() => setErrorMsg('')} style={{background:'none', border:'none', cursor:'pointer'}}><AlertTriangle size={18}/></button></div>}

            <div className="filters-bar">
              <div className="flex-center gap-2">
                <Calendar color="var(--primary)" size={18} />
                <select value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="date-picker" style={{padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '4px'}}>
                  {availableDates.map(d => {
                    const dObj = new Date(d + 'T00:00:00');
                    return <option key={d} value={d}>{dObj.toLocaleDateString('es-ES', { weekday: 'short' })} - {dObj.toLocaleDateString('es-ES')}</option>;
                  })}
                </select>
                {isMorning && <span style={{fontSize: '0.85rem', color: 'var(--warning)'}}>⚠️ Horario restringido (madrugada)</span>}
              </div>
              <div className="legend-items">
                <div className="flex-center gap-2">
                  <img src={chair1Img} alt="Disponible" style={{ width: '15px', height: 'auto' }} /> Disponible
                </div>
                <div className="flex-center gap-2">
                  <img src={chair2Img} alt="Limitado" style={{ width: '15px', height: 'auto' }} /> Limitado
                </div>
                <div className="flex-center gap-2">
                  <img src={chair3Img} alt="Ocupado" style={{ width: '15px', height: 'auto' }} /> Ocupado
                </div>
                <div className="flex-center gap-2" style={{marginLeft: '0.5rem'}}>
                  <Monitor size={18}/> Con monitor
                </div>
              </div>
            </div>

            <div className="map-container">
              {loading && <div className="overlay-loader"><Loader2 className="spin" size={18} color="var(--primary)"/></div>}
              <div className="table-graphic">
                <img src={tableImg} alt="Mesa Principal" className="table-image" />
                {desks.map((id, idx) => {
                  const isTop = idx < 3, status = getStatus(id);
                  const isOcc = status.includes('occupied'), isRotDisabled = !canSelect(id);
                  const names = getDeskR(id).map(getName).join(', ');
                  return (
                    <div 
                      key={id} className={`desk-node ${isTop ? 'top' : 'bottom'} ${status}`} 
                      style={{ left: `${isTop ? 20+(idx*30) : 20+((idx-3)*30)}%`, opacity: isRotDisabled ? 0.5 : 1 }}
                      title={isRotDisabled ? 'Rotación: usado recientemente' : isOcc ? `Ocupado por: ${names}` : 'Disponible'}
                      onClick={() => !isOcc && canSelect(id) && setBookingDesk(id)}
                    >
                      <img src={isOcc ? chair3Img : status.includes('limited') ? chair2Img : chair1Img} alt={`Silla ${id}`} className="chair-image" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {bookingDesk && (
        <div className="modal-overlay">
          <div className="modal-content ticket-modal">
            <div className="ticket-container">
              
              {/* tickeeeet */}
              <div className="ticket-header">
                <h3 style={{ color: "#ffffff" }}>
                  <Ticket size={24} color="#ffffff" />
                  Ticket de reserva
                </h3>
              </div>

              {/* Cuerpo del ticket con la información */}
              <div className="ticket-body">
                {/* ... otros campos ... */}
                <div className="ticket-select-group">
                  <span className="ticket-label">Horario</span>
                  <select 
                    value={selectedTurno} 
                    onChange={e => setSelectedTurno(e.target.value)} 
                    className="ticket-select"
                  >
                    <option value="">Selecciona un turno...</option>
                    {horarios.map(h => {
                      const inicio = h.attributes?.inicio?.slice(0, 5) || h.inicio?.slice(0,5) || '--:--';
                      const fin = h.attributes?.fin?.slice(0, 5) || h.fin?.slice(0,5) || '--:--';
                      
                      // NUEVO: Lógica para bloquear turnos que ya pasaron HOY
                      const inicioHour = parseInt(inicio.split(':')[0]); // Extrae la hora (ej. '08' -> 8)
                      const isPastTurn = selectedDate === todayStr && now.getHours() >= inicioHour;

                      return (
                        // MODIFICADO: Deshabilita si no hay disponibilidad o si el turno ya pasó
                        <option key={h.id} value={h.id} disabled={!isAvail(bookingDesk, h.id) || isPastTurn}>
                          {inicio} - {fin} {isPastTurn ? '(Finalizado)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="ticket-footer">
                <div className="ticket-actions">
                  <Button 
                    variant="secondary" 
                    onClick={() => { setBookingDesk(null); setSelectedTurno(''); }}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={handleBooking} disabled={!selectedTurno || loading}>
                    {loading ? <Loader2 className="spin" size={18} /> : 'Confirmar'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SIMULADOR DE TIEMPO (Solo para Fase Beta) */}
      <div style={{
        position: 'fixed', bottom: '20px', right: '20px', 
        background: 'white', padding: '10px 15px', borderRadius: '8px', 
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 9999,
        border: '1px solid var(--primary)', display: 'flex', flexDirection: 'column', gap: '5px'
      }}>
        <div style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--primary)'}}>
          <Clock size={16} /> Simulador de Tiempo Beta
        </div>
        <input 
          type="datetime-local" 
          value={simulatedDateTime} 
          onChange={(e) => setSimulatedDateTime(e.target.value)}
          style={{ padding: '4px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.8rem' }}
        />
        <button 
          onClick={() => setSimulatedDateTime('')}
          style={{ background: '#f4f4f4', border: 'none', padding: '4px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}
        >
          Restablecer a Hora Real
        </button>
      </div>
    </>
  );
};

export default DeskSelection;