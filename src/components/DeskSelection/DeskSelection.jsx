import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Monitor, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import Button from '../Shared/Button';
import tableImg from '../../assets/tables/table.png';
import chair1Img from '../../assets/chairs/chair1.png';
import chair2Img from '../../assets/chairs/chair2.png';
import chair3Img from '../../assets/chairs/chair3.png';
import './DeskSelection.css';

const DESKS_WITH_MONITOR = [1, 3, 6];

const DeskSelection = ({ room, userData, onSuccess }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [horarios, setHorarios] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [availableDates, setAvailableDates] = useState([]);
  
  const [bookingDesk, setBookingDesk] = useState(null); 
  const [selectedTurno, setSelectedTurno] = useState('');
  const [lastUserDesk, setLastUserDesk] = useState(null);
  const socketRef = useRef(null);

  // DEBUG: Verificar qué userData llega
  useEffect(() => {
    console.log('📋 userData recibido en DeskSelection:', userData);
    console.log('name:', userData?.name);
    console.log('photo:', userData?.photo);
    console.log('department:', userData?.department);
    console.log('cedula:', userData?.cedula);
  }, [userData]);

  // Calcula solo los próximos 2 días hábiles (lunes a viernes)
  const getAvailableDates = () => {
    const dates = [];
    const today = new Date();
    const currentHour = today.getHours();
    
    // Bloqueo de madrugada: 12:00 AM a 5:00 AM
    const isMorningBlock = currentHour >= 0 && currentHour < 5;

    let daysToCheck = isMorningBlock ? 2 : 7; // Si es madrugada, solo mira hoy y mañana
    let daysFound = 0;

    for (let i = 0; i < daysToCheck && daysFound < 2; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayOfWeek = date.getDay();

      // Omitir sábados (6) y domingos (0)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        dates.push(date.toISOString().split('T')[0]);
        daysFound++;
      }
    }

    return dates;
  };

  // Valida si hoy está en la ventana de bloqueo
  const isInMorningBlock = () => {
    const now = new Date();
    return now.getHours() >= 0 && now.getHours() < 5;
  };

  // Obtiene el último escritorio usado por el usuario
  const fetchLastUserDesk = async () => {
    try {
      const res = await fetch('https://macfer.crepesywaffles.com/api/working-reservas?populate=*');
      if (!res.ok) return;
      
      const data = await res.json();
      const userReservas = data.data.filter(r => 
        r.attributes?.documento === userData?.cedula || r.attributes?.documento === userData?.documento
      );
      
      if (userReservas.length > 0) {
        // Obtener la última reserva activa (estado: true)
        const activeReservas = userReservas.filter(r => r.attributes?.estado === true);
        if (activeReservas.length > 0) {
          const lastReserva = activeReservas[activeReservas.length - 1];
          // Obtener deskId desde la relación Strapi
          const deskId = lastReserva.attributes?.working_puestos?.data?.id || 
                        lastReserva.attributes?.escritorio;
          setLastUserDesk(deskId);
        }
      }
    } catch (err) {
      console.error('Error fetching last desk:', err);
    }
  };

  // Inicialización: calcular fechas disponibles, obtener horarios y último escritorio
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      setErrorMsg('');
      
      try {
        const availDates = getAvailableDates();
        setAvailableDates(availDates);
        
        if (availDates.length > 0 && selectedDate === new Date().toISOString().split('T')[0]) {
          setSelectedDate(availDates[0]);
        }

        // Obtener horarios
        const horariosRes = await fetch('https://macfer.crepesywaffles.com/api/working-horarios');
        if (horariosRes.ok) {
          const horariosData = await horariosRes.json();
          setHorarios(Array.isArray(horariosData.data) ? horariosData.data : []);
        }

        // Obtener último escritorio usado
        await fetchLastUserDesk();
      } catch (err) {
        console.error('Error en inicialización:', err);
        setErrorMsg('Error al cargar configuración inicial');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [userData?.cedula]);

  // Obtiene las reservas para la fecha seleccionada
  useEffect(() => {
    const fetchReservas = async () => {
      setLoading(true);
      setErrorMsg('');
      try {
        const res = await fetch('https://macfer.crepesywaffles.com/api/working-reservas?populate=*');
        if (!res.ok) throw new Error('Error al cargar reservas');
        
        const data = await res.json();
        // Filtrar por fecha seleccionada, estado activo, y que tengan una fecha_reserva válida
        const reservasDelDia = data.data.filter(r => {
          const fechaReserva = r.attributes?.fecha_reserva || r.attributes?.fecha;
          const estado = r.attributes?.estado === true;
          return fechaReserva === selectedDate && estado;
        });
        
        console.log('📅 Reservas para', selectedDate, ':', reservasDelDia);
        console.log('Detalles completos:', data.data.map(r => ({
          fecha: r.attributes?.fecha_reserva,
          estado: r.attributes?.estado,
          nombre: r.attributes?.Nombre,
          puestoId: r.attributes?.working_puestos?.data?.[0]?.id,
          horarioId: r.attributes?.working_horarios?.data?.[0]?.id,
          puestosData: r.attributes?.working_puestos,
          horariosData: r.attributes?.working_horarios,
          documento: r.attributes?.documento
        })));
        
        setReservas(reservasDelDia);
      } catch (err) { 
        console.error('Error fetching reservas:', err);
        setErrorMsg('No se pudo cargar la disponibilidad.');
        setReservas([]);
      } finally { 
        setLoading(false); 
      }
    };

    if (selectedDate) {
      fetchReservas();
    }
  }, [selectedDate, userData?.cedula || userData?.documento]);

  // Validación triple (optimista/pesimista) para evitar race conditions
  const tripleCheckBooking = async () => {
    try {
      // Check 1
      const check1 = await fetch('https://macfer.crepesywaffles.com/api/working-reservas?populate=*');
      if (!check1.ok) throw new Error('Error en validación 1');
      const data1 = await check1.json();
      const reservasCheck1 = data1.data.filter(r => {
        const rDeskId = r.attributes?.working_puestos?.data?.[0]?.id || r.attributes?.escritorio;
        return rDeskId === bookingDesk && r.attributes?.fecha_reserva === selectedDate;
      });

      // Check 2
      const check2 = await fetch('https://macfer.crepesywaffles.com/api/working-reservas?populate=*');
      if (!check2.ok) throw new Error('Error en validación 2');
      const data2 = await check2.json();
      const reservasCheck2 = data2.data.filter(r => {
        const rDeskId = r.attributes?.working_puestos?.data?.[0]?.id || r.attributes?.escritorio;
        return rDeskId === bookingDesk && r.attributes?.fecha_reserva === selectedDate;
      });

      // Check 3
      const check3 = await fetch('https://macfer.crepesywaffles.com/api/working-reservas?populate=*');
      if (!check3.ok) throw new Error('Error en validación 3');
      const data3 = await check3.json();
      const reservasCheck3 = data3.data.filter(r => {
        const rDeskId = r.attributes?.working_puestos?.data?.[0]?.id || r.attributes?.escritorio;
        return rDeskId === bookingDesk && r.attributes?.fecha_reserva === selectedDate;
      });

      // Verificar que en todas las validaciones se mantiene la disponibilidad
      const turnoId = parseInt(selectedTurno);
      const disponible1 = isDeskAvailableForTurno(bookingDesk, turnoId);
      const disponible2 = isDeskAvailableForTurno(bookingDesk, turnoId);
      const disponible3 = isDeskAvailableForTurno(bookingDesk, turnoId);

      if (disponible1 && disponible2 && disponible3) {
        return true;
      }
      
      setErrorMsg('El escritorio fue reservado mientras confirmabas. Intenta de nuevo.');
      return false;
    } catch (err) {
      console.error('Error en validación triple:', err);
      setErrorMsg('Error al validar la disponibilidad');
      return false;
    }
  };

  const handleBooking = async () => {
    // Validaciones previas
    if (!selectedTurno) { 
      setErrorMsg('Selecciona un turno'); 
      return; 
    }

    if (!bookingDesk) {
      setErrorMsg('Debes seleccionar un escritorio');
      return;
    }

    if (!canSelectDesk(bookingDesk)) {
      setErrorMsg(`Rotación activa: No puedes usar el escritorio ${lastUserDesk} nuevamente. Elige otro.`);
      return;
    }

    if (userHasReservaForDate(selectedDate)) {
      setErrorMsg('Ya tienes una reserva para esta fecha. Una reserva por día.');
      return;
    }

    const turnoId = parseInt(selectedTurno);
    if (!isDeskAvailableForTurno(bookingDesk, turnoId)) {
      setErrorMsg('Este escritorio no está disponible para el turno seleccionado');
      return;
    }

    // Validación triple
    setLoading(true);
    setErrorMsg('');
    
    try {
      const isValid = await tripleCheckBooking();
      if (!isValid) {
        setLoading(false);
        return;
      }

      // Realizar reserva con todos los datos del usuario
      const res = await fetch('https://macfer.crepesywaffles.com/api/working-reservas', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({ 
          data: {
            // Datos del usuario
            Nombre: userData?.name || '',
            foto: userData?.photo || '',
            documento: userData?.cedula || '',
            area: userData?.department || '',
            
            // Datos de la reserva
            fecha_reserva: selectedDate,
            estado: true,
            motivo_cancelacion: null,
            
            // Relaciones en formato Strapi (usando connect para relaciones)
            working_puestos: {
              connect: [bookingDesk]
            },
            working_horarios: {
              connect: [parseInt(selectedTurno)]
            }
          }
        })
      });

      // DEBUG: Mostrar qué se envió
      const bodyToSend = {
        Nombre: userData?.name || '',
        foto: userData?.photo || '',
        documento: userData?.cedula || '',
        area: userData?.department || '',
        fecha_reserva: selectedDate,
        estado: true,
        working_puestos: `connect: [${bookingDesk}]`,
        working_horarios: `connect: [${parseInt(selectedTurno)}]`
      };
      console.log('📤 Datos enviados al POST:', bodyToSend);

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'No se pudo crear la reserva');
      }

      setBookingDesk(null);
      setSelectedTurno('');
      onSuccess && onSuccess();
    } catch (err) { 
      console.error('Booking error:', err);
      setErrorMsg(`Error al procesar tu reserva: ${err.message}`); 
    } finally { 
      setLoading(false); 
    }
  };

  const desks = Array.from({ length: 6 }, (_, i) => i + 1);

  // Calcula el estado del escritorio basado en las reservas
  const getStatusClass = (deskId) => {
    const deskReservas = reservas.filter(r => {
      // Obtener el ID del escritorio desde relación o campo directo
      const rDeskId = r.attributes?.working_puestos?.data?.[0]?.id || 
                     r.attributes?.escritorio;
      return rDeskId === deskId;
    });
    
    if (deskReservas.length === 0) return 'bg-available';
    
    // Si hay una reserva Completo (turno 3: 08:00-17:00), está completamente ocupado
    const tieneCompleto = deskReservas.some(r => {
      const turnoId = r.attributes?.working_horarios?.data?.[0]?.id || 
                     r.attributes?.turno_id;
      return turnoId === 3;
    });
    
    if (tieneCompleto) return 'bg-occupied occupied';
    
    // Si tiene AM y PM, está ocupado
    if (deskReservas.length >= 2) return 'bg-occupied occupied';
    
    // Si tiene solo AM o solo PM, estado limitado
    if (deskReservas.length === 1) return 'bg-limited';
    
    return 'bg-available';
  };

  // Obtiene la imagen de la silla según el estado
  const getChairImage = (deskId) => {
    const status = getStatusClass(deskId);
    if (status.includes('occupied')) return chair3Img;
    if (status.includes('limited')) return chair2Img;
    return chair1Img;
  };

  // Verifica si un escritorio está disponible para el turno seleccionado
  const isDeskAvailableForTurno = (deskId, turnoId) => {
    const deskReservas = reservas.filter(r => {
      // Obtener el ID del escritorio desde relación o campo directo
      const rDeskId = r.attributes?.working_puestos?.data?.[0]?.id || 
                     r.attributes?.escritorio;
      return rDeskId === deskId;
    });
    
    // Si tiene una reserva Completo, no está disponible para nada
    const tieneCompleto = deskReservas.some(r => {
      const rTurnoId = r.attributes?.working_horarios?.data?.[0]?.id || 
                      r.attributes?.turno_id;
      return rTurnoId === 3;
    });
    
    if (tieneCompleto) return false;
    
    // Si intenta reservar Completo y hay cualquier otra reserva, no puede
    if (turnoId === 3 && deskReservas.length > 0) return false;
    
    // Si intenta un turno específico (1 o 2) y ya existe, no puede
    const tieneEseTurno = deskReservas.some(r => {
      const rTurnoId = r.attributes?.working_horarios?.data?.[0]?.id || 
                      r.attributes?.turno_id;
      return rTurnoId === turnoId;
    });
    
    if (tieneEseTurno) return false;
    
    return true;
  };

  // Verifica si el usuario ya tiene una reserva para esa fecha
  const userHasReservaForDate = (date) => {
    const userDoc = userData?.cedula || userData?.documento;
    return reservas.some(r => {
      const rDoc = r.attributes?.documento;
      const rEstado = r.attributes?.estado === true;
      return rDoc === userDoc && rEstado;
    });
  };

  // Valida si el usuario puede seleccionar este escritorio (rotación obligatoria)
  const canSelectDesk = (deskId) => {
    if (lastUserDesk === null) return true; // Primera reserva
    if (lastUserDesk !== deskId) return true; // Diferente al anterior
    return false; // Mismo escritorio de la última reserva
  };

  return (
    <>
      <div className="container flex-1">
        <div className="desk-layout">
          <div className="desk-main-area">
            {errorMsg && <div className="alert alert-danger flex-between"><span>{errorMsg}</span><button onClick={() => setErrorMsg('')} style={{background:'none', border:'none', cursor:'pointer'}}><AlertTriangle size={18}/></button></div>}

            <div className="filters-bar">
              <div className="flex-center gap-2">
                <Calendar color="var(--primary)" size={20} />
                <select 
                  value={selectedDate} 
                  onChange={(e) => setSelectedDate(e.target.value)} 
                  className="date-picker"
                  style={{padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '4px'}}
                >
                  {availableDates.map(date => {
                    const dateObj = new Date(date + 'T00:00:00');
                    const dayName = dateObj.toLocaleDateString('es-ES', { weekday: 'short' });
                    const formatted = dateObj.toLocaleDateString('es-ES');
                    return <option key={date} value={date}>{dayName} - {formatted}</option>;
                  })}
                </select>
                {isInMorningBlock() && <span style={{fontSize: '0.85rem', color: 'var(--warning)'}}>⚠️ Horario restringido (madrugada)</span>}
              </div>
              <div className="legend-items">
                <div className="flex-center gap-2"><span className="legend-dot" style={{background: 'var(--success)'}}></span> Disponible</div>
                <div className="flex-center gap-2"><span className="legend-dot" style={{background: 'var(--warning)'}}></span> Medio Turno</div>
                <div className="flex-center gap-2"><span className="legend-dot" style={{background: 'var(--danger)'}}></span> Ocupado</div>
                <div className="flex-center gap-2" style={{marginLeft: '0.5rem'}}><Monitor size={16}/> Esc: {DESKS_WITH_MONITOR.join(', ')}</div>
              </div>
            </div>

            <div className="map-container">
              {loading && <div className="overlay-loader"><Loader2 className="spin" size={40} color="var(--primary)"/></div>}
              <div className="table-graphic">
                <img src={tableImg} alt="Mesa Principal" className="table-image" />
                {desks.map((deskId, idx) => {
                  const isTop = idx < desks.length / 2;
                  const leftPercent = isTop ? 10 + (idx * 30) : 20 + ((idx - desks.length/2) * 30);
                  const chairImage = getChairImage(deskId);
                  const isDisabledByRotation = !canSelectDesk(deskId) && lastUserDesk !== null;
                  const status = getStatusClass(deskId);
                  const isOccupied = status.includes('occupied');
                  
                  // Obtener quién está en este desk
                  const deskReservas = reservas.filter(r => {
                    const rDeskId = r.attributes?.working_puestos?.data?.[0]?.id || r.attributes?.escritorio;
                    return rDeskId === deskId;
                  });
                  const occupantNames = deskReservas.map(r => r.attributes?.Nombre || r.attributes?.nombre || 'Usuario').join(', ');
                  const tooltipText = isDisabledByRotation ? `Rotación: usado recientemente` : isOccupied ? `Ocupado por: ${occupantNames}` : 'Disponible';
                  
                  return (
                    <div 
                      key={deskId} 
                      className={`desk-node ${isTop ? 'top' : 'bottom'} ${status}`}
                      style={{ left: `${leftPercent}%`, opacity: isDisabledByRotation ? 0.5 : 1 }}
                      onClick={() => { 
                        if (!isOccupied && canSelectDesk(deskId)) {
                          setBookingDesk(deskId);
                        }
                      }}
                      title={tooltipText}
                    >
                      <img 
                        src={chairImage} 
                        alt={`Silla ${deskId}`} 
                        className="chair-image" 
                        style={{
                          cursor: isOccupied || isDisabledByRotation ? 'not-allowed' : 'pointer',
                          filter: isDisabledByRotation ? 'grayscale(1)' : 'none'
                        }} 
                      />
                      <span className="desk-badge">Esc. {deskId}{DESKS_WITH_MONITOR.includes(deskId) ? '📺' : ''}</span>
                      {isOccupied && occupantNames && (
                        <span className="desk-occupant" style={{
                          position: 'absolute',
                          bottom: '-20px',
                          fontSize: '0.7rem',
                          background: 'rgba(0,0,0,0.7)',
                          color: 'white',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          whiteSpace: 'nowrap',
                          zIndex: 10
                        }}>{occupantNames}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="desk-sidebar">
            <div className="sidebar-header"><Clock size={20} /> Estado de Escritorios</div>
            <div className="sidebar-body">
              {desks.map(deskId => {
                const status = getStatusClass(deskId);
                const isDisabled = !canSelectDesk(deskId) && lastUserDesk !== null;
                const deskReservas = reservas.filter(r => {
                  const rDeskId = r.attributes?.working_puestos?.data?.[0]?.id || r.attributes?.escritorio;
                  return rDeskId === deskId;
                });
                
                return (
                  <div 
                    key={deskId} 
                    className="sidebar-item"
                    style={{opacity: isDisabled ? 0.5 : 1}}
                  >
                    <div className={`sidebar-desk-icon ${status.split(' ')[0]}`}>{deskId}</div>
                    <div className="sidebar-desk-info">
                      <p className="title">
                        Esc. {deskId} {DESKS_WITH_MONITOR.includes(deskId) && <Monitor size={14} color="var(--primary)" />}
                      </p>
                      <p className="status" style={{
                        color: status.includes('available') ? 'var(--success)' : status.includes('limited') ? 'var(--warning)' : 'var(--danger)',
                        fontWeight: 500
                      }}>
                        {deskReservas.length === 0 ? 'Libre' : deskReservas.length === 1 ? 'Semi-ocupado' : 'Ocupado'}
                      </p>
                      {deskReservas.length > 0 && (
                        <div style={{marginTop: '0.5rem'}}>
                          {deskReservas.map((r, idx) => {
                            const turnoId = r.attributes?.working_horarios?.data?.[0]?.id || 
                                           r.attributes?.turno_id;
                            const turnoData = horarios.find(h => h.id === turnoId);
                            const turnoNombre = turnoData?.attributes?.nombre || `Turno ${turnoId}`;
                            const personaNombre = r.attributes?.Nombre || r.attributes?.nombre || 'Usuario';
                            const personaFoto = r.attributes?.foto || '';
                            const personaArea = r.attributes?.area || r.attributes?.department || '';
                            
                            // Mapear turno a etiqueta (AM, PM, Todo el día)
                            const turnoLabel = turnoNombre === 'Entrada' ? '🌅 AM' : 
                                             turnoNombre === 'Salida' ? '🌆 PM' : 
                                             turnoNombre === 'Completo' ? '☀️ Todo el día' : turnoNombre;
                            
                            return (
                              <div key={idx} style={{
                                marginBottom: '0.5rem', 
                                padding: '0.5rem', 
                                background: '#f5f5f5', 
                                borderRadius: '4px',
                                display: 'flex',
                                gap: '0.5rem',
                                alignItems: 'flex-start'
                              }}>
                                {personaFoto && (
                                  <img 
                                    src={personaFoto} 
                                    alt={personaNombre}
                                    style={{
                                      width: '32px',
                                      height: '32px',
                                      borderRadius: '50%',
                                      objectFit: 'cover',
                                      flexShrink: 0
                                    }}
                                  />
                                )}
                                <div style={{flex: 1, minWidth: 0}}>
                                  <strong style={{fontSize: '0.85rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis'}}>{personaNombre}</strong>
                                  <span style={{fontSize: '0.7rem', color: '#666', display: 'block'}}>{turnoLabel}</span>
                                  {personaArea && <span style={{fontSize: '0.65rem', color: '#999', display: 'block'}}>{personaArea}</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {isDisabled && <p style={{fontSize: '0.75rem', color: 'var(--warning)'}}>⚠️ Rotación</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {bookingDesk && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{color: 'var(--primary)', display:'flex', alignItems:'center', gap:'0.5rem', margin:'0 0 1rem'}}><Calendar /> Confirmar Reserva</h3>
            <p style={{marginBottom:'1rem'}}>Reservando <strong>Escritorio {bookingDesk}</strong> para el <strong>{selectedDate}</strong>.</p>
            <select 
              value={selectedTurno} 
              onChange={(e) => setSelectedTurno(e.target.value)} 
              className="form-select"
            >
              <option value="">Selecciona un turno...</option>
              {horarios.map(h => {
                const turnoId = h.id;
                const isAvailable = isDeskAvailableForTurno(bookingDesk, turnoId);
                return (
                  <option 
                    key={h.id} 
                    value={h.id}
                    disabled={!isAvailable}
                  >
                    {h.attributes?.nombre || h.nombre || h.id} ({h.attributes?.inicio || h.inicio} - {h.attributes?.fin || h.fin})
                  </option>
                );
              })}
            </select>
            <div className="modal-actions">
              <Button variant="secondary" onClick={() => {
                setBookingDesk(null);
                setSelectedTurno('');
              }}>Cancelar</Button>
              <Button 
                onClick={handleBooking} 
                disabled={!selectedTurno || loading}
              >
                {loading ? <Loader2 className="spin" size={18} /> : 'Confirmar Reserva'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DeskSelection;