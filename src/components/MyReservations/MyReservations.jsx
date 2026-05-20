import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, MapPinOff, RefreshCw, CheckCircle, Loader2 } from 'lucide-react';
import Button from '../Shared/Button';
import './MyReservations.css';

const COORDENADAS_OFICINA = { 
  lat: Number(import.meta.env.VITE_OFFICE_LAT), 
  lng: Number(import.meta.env.VITE_OFFICE_LNG) 
};
const RADIO_PERMITIDO_METROS = Number(import.meta.env.VITE_OFFICE_RADIUS);

const calcularDistancia = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; 
  const rad = (deg) => deg * (Math.PI / 180);
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(rad(lat1)) * Math.cos(rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const MyReservations = ({ userData }) => {
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Estados para los filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todas');
  const [filterOwnership, setFilterOwnership] = useState('todas');

  // Estado para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Estados para geolocalización
  const [isWithinRange, setIsWithinRange] = useState(false);
  const [locationStatus, setLocationStatus] = useState('pending');
  const [locationMsg, setLocationMsg] = useState('Haz clic en actualizar para verificar.');

  // Estados para Modal de Cancelación
  const [cancelModal, setCancelModal] = useState({ isOpen: false, reservaId: null });
  const [cancelReason, setCancelReason] = useState('');

  const fetchReservas = useCallback(async () => {
    setLoading(true); 
    setErrorMsg('');
    try {
      const baseUrl = '${import.meta.env.VITE_API_BASE_URL}/api/working-reservas';
      const url = userData?.isAdmin 
        ? `${baseUrl}?populate=*` 
        : `${baseUrl}?filters[documento][$eq]=${userData?.cedula}&populate=*`;
        
      const res = await fetch(url);
      if(!res.ok) throw new Error('Error al cargar reservas');
      
      const json = await res.json();
      setReservas(Array.isArray(json.data) ? json.data : []);
    } catch (err) { 
      setErrorMsg('No se pudieron cargar las reservas.'); 
    } 
    finally { 
      setLoading(false); 
    }
  }, [userData]);

  useEffect(() => {
    if (userData?.cedula) fetchReservas();
  }, [fetchReservas, userData]);

  const verificarUbicacion = useCallback(() => {
    setLocationStatus('pending');
    setLocationMsg('Obteniendo coordenadas...');

    if (!navigator.geolocation) {
      setLocationStatus('error');
      setLocationMsg('Geolocalización no soportada.');
      setIsWithinRange(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const distancia = calcularDistancia(latitude, longitude, COORDENADAS_OFICINA.lat, COORDENADAS_OFICINA.lng);

        if (distancia <= RADIO_PERMITIDO_METROS) {
          setIsWithinRange(true);
          setLocationStatus('allowed');
          setLocationMsg(`Estás a ${Math.round(distancia)}m. Puedes confirmar.`);
        } else {
          setIsWithinRange(false);
          setLocationStatus('denied');
          setLocationMsg(`Estás a ${Math.round(distancia)}m. El límite es 1000m.`);
        }
      },
      (error) => {
        setIsWithinRange(false);
        setLocationStatus('error');
        if (error.code === error.PERMISSION_DENIED) {
          setLocationMsg('Permiso de ubicación denegado');
        } else {
          setLocationMsg('No se pudo obtener la ubicación');
        }
      },
      { enableHighAccuracy: true }
    );
  }, []);

  useEffect(() => {
    if (userData && !userData.isAdmin) {
      verificarUbicacion();
    }
  }, [userData, verificarUbicacion]);

  // Manejador para Confirmar
  const handleConfirmarReserva = async (reservaId) => {
    if (!userData?.isAdmin && !isWithinRange) {
      setErrorMsg('No puedes confirmar la reserva si estás fuera del perímetro permitido.');
      return;
    }

    setLoading(true);
    try {
      const url = `${import.meta.env.VITE_API_BASE_URL}/api/working-reservas/${reservaId}`;
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { estado: true } }) 
      });

      if (!res.ok) throw new Error('No se pudo confirmar la reserva en la API.');
      
      setErrorMsg('');
      await fetchReservas();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Manejador para Cancelar
  const handleCancelSubmit = async () => {
    if (!cancelModal.reservaId) return;
    setLoading(true);
    
    let finalReason = cancelReason;
    if (userData?.isAdmin) {
      const date = new Date();
      const dateStr = date.toLocaleDateString('es-ES');
      const timeStr = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      finalReason = `${userData.name} canceló este registro el ${dateStr} a las ${timeStr}. Motivo: ${cancelReason}`;
    }

    try {
      const url = `${import.meta.env.VITE_API_BASE_URL}/api/working-reservas/${reservaId}`;
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { estado: false, motivo_cancelacion: finalReason } }) 
      });

      if (!res.ok) throw new Error('No se pudo cancelar la reserva.');
      
      setCancelModal({ isOpen: false, reservaId: null });
      setCancelReason('');
      setErrorMsg('');
      await fetchReservas();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Manejador para Reactivar
  const handleReactivarReserva = async (reserva) => {
    const attr = reserva.attributes;
    const deskId = attr.working_puestos?.data?.[0]?.id;
    const date = attr.fecha_reserva;
    const horarioId = attr.working_horarios?.data?.[0]?.id;

    // Validación: verificar si el puesto ya fue tomado (estado null o true) en la misma fecha y hora
    const isOccupied = reservas.some(r => 
        r.id !== reserva.id &&
        r.attributes.fecha_reserva === date &&
        r.attributes.working_puestos?.data?.[0]?.id === deskId &&
        r.attributes.working_horarios?.data?.[0]?.id === horarioId &&
        r.attributes.estado !== false 
    );

    if (isOccupied) {
        setErrorMsg("No se puede reactivar. El escritorio ya fue reservado por otra persona en esa fecha y horario.");
        return;
    }

    setLoading(true);
    try {
      const url = `${import.meta.env.VITE_API_BASE_URL}/api/working-reservas/${reservaId}`;
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { estado: null, motivo_cancelacion: null } }) 
      });

      if (!res.ok) throw new Error('No se pudo reactivar la reserva.');
      
      setErrorMsg('');
      await fetchReservas();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filtrado de la data
  const filteredReservas = reservas.filter((reserva) => {
    const attr = reserva.attributes;
    
    const nombreColaborador = (attr.Nombre || attr.nombre || attr.documento || '').toLowerCase();
    const idReserva = String(reserva.id);
    const documento = String(attr.documento || '');

    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
                          idReserva.includes(searchLower) || 
                          nombreColaborador.includes(searchLower) || 
                          documento.includes(searchLower);

    // Lógica nueva de estado (null, true, false)
    let estadoTexto = 'pendiente';
    if (attr.estado === true) estadoTexto = 'confirmada';
    if (attr.estado === false) estadoTexto = 'cancelada';
    
    const matchesStatus = filterStatus === 'todas' || estadoTexto === filterStatus;

    const isOwner = attr.documento === userData?.cedula;
    let matchesOwnership = true;
    if (userData?.isAdmin) {
      if (filterOwnership === 'mis_reservas') matchesOwnership = isOwner;
      if (filterOwnership === 'otras') matchesOwnership = !isOwner;
    }

    return matchesSearch && matchesStatus && matchesOwnership;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterOwnership]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentReservas = filteredReservas.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredReservas.length / itemsPerPage);

  return (
    <div className="container flex-1 py-8" style={{paddingTop: '2rem'}}>
      {/* Modal de Cancelación */}
      {cancelModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Cancelar Reserva</h3>
            <p>Por favor, indica el motivo de la cancelación:</p>
            <textarea 
              value={cancelReason} 
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Escribe el motivo aquí..."
            />
            <div className="modal-actions">
              <Button variant="secondary" onClick={() => {
                setCancelModal({ isOpen: false, reservaId: null });
                setCancelReason('');
              }}>
                Cerrar
              </Button>
              <Button onClick={handleCancelSubmit} disabled={!cancelReason.trim() || loading}>
                {loading ? <Loader2 className="spin" size={16} /> : 'Confirmar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="reservations-layout">
        {!userData?.isAdmin && (
          <div className="res-sidebar">
            <div className="res-user-card">
              <img src={userData?.photo} alt={userData?.name} />
              <h3>{userData?.name}</h3>
              <span className={`role-badge role-user`}>
                User
              </span>
            </div>
            
            <div className="location-card">
              <div className="location-status">
                {locationStatus === 'allowed' ? (
                  <MapPin color="var(--success, #22c55e)" size={28} style={{margin: '0 auto'}} />
                ) : locationStatus === 'pending' ? (
                  <Loader2 className="spin" size={28} style={{margin: '0 auto', color: 'var(--primary)'}} />
                ) : (
                  <MapPinOff color="var(--danger, #ef4444)" size={28} style={{margin: '0 auto'}} />
                )}
                <p style={{ fontWeight: '600', marginTop: '0.5rem' }}>
                  {locationStatus === 'allowed' ? 'En el perímetro' : locationStatus === 'pending' ? 'Verificando...' : 'Acceso restringido'}
                </p>
                <span style={{ fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>{locationMsg}</span>
              </div>
              <Button 
                className="btn-w-full" 
                variant="secondary" 
                onClick={verificarUbicacion}
                disabled={locationStatus === 'pending'}
              >
                <RefreshCw size={16} className={locationStatus === 'pending' ? 'spin' : ''} style={{ marginRight: '8px' }} /> 
                Actualizar
              </Button>
            </div>
          </div>
        )}
        
        <div className="table-container" style={{ flex: 1 }}>
           <div className="table-header">
              <h3>{userData?.isAdmin ? 'Gestión de reservas' : 'Detalles de reserva'}</h3>
           </div>

           <div className="filters-bar-reservations">
             <input 
               type="text" 
               placeholder="Buscar por ID, nombre o identificación..." 
               value={searchTerm} 
               onChange={(e) => setSearchTerm(e.target.value)} 
               className="filter-input"
             />
             <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="filter-select">
               <option value="todas">Todos los estados</option>
               <option value="confirmada">Confirmada</option>
               <option value="pendiente">Pendiente</option>
               <option value="cancelada">Cancelada</option>
             </select>
             {userData?.isAdmin && (
               <select value={filterOwnership} onChange={(e) => setFilterOwnership(e.target.value)} className="filter-select">
                 <option value="todas">Todas las reservas</option>
                 <option value="mis_reservas">Mis reservas</option>
                 <option value="otras">Otras reservas</option>
               </select>
             )}
           </div>

           {errorMsg && <div className="alert alert-danger" style={{margin: '1rem', marginBottom: 0}}>{errorMsg}</div>}
           <div className="table-wrapper">
             {loading && <div className="overlay-loader"><Loader2 className="spin" size={32} color="var(--primary)" /></div>}
             <table className="data-table">
               <thead>
                 <tr>
                   <th>ID</th>
                   {userData?.isAdmin && <th>Colaborador</th>}
                   <th>Fecha</th>
                   <th>Escritorio</th>
                   <th>Horario</th>
                   <th>Estado</th>
                   <th>Motivo</th>
                   <th>Acciones</th>
                 </tr>
               </thead>
               <tbody>
                 {currentReservas.map((reserva) => {
                   const attr = reserva.attributes;
                   
                   const escritorioNombre = attr.working_puestos?.data?.[0]?.attributes?.nombre || '';
                   const escritorio = escritorioNombre.replace(/\D/g, '') || '-';

                   const horarioAttr = attr.working_horarios?.data?.[0]?.attributes;
                   const turno = horarioAttr ? `${horarioAttr.inicio?.slice(0,5) || ''} - ${horarioAttr.fin?.slice(0,5) || ''}` : 'Sin turno';
                   
                   const nombreColaborador = attr.Nombre || attr.nombre || attr.documento || 'Desconocido';
                   
                   // Estados precisos basados en null/true/false
                   let estadoTexto = 'Pendiente';
                   if (attr.estado === true) estadoTexto = 'Confirmada';
                   if (attr.estado === false) estadoTexto = 'Cancelada';
                   
                   const isOwner = attr.documento === userData?.cedula;
                   
                   let sClass = estadoTexto.toLowerCase();

                   return (
                     <tr key={reserva.id}>
                       <td style={{fontWeight: 600}}>#{reserva.id}</td>
                       {userData?.isAdmin && <td style={{textTransform: 'capitalize', fontSize: '0.85rem', fontWeight: 500}}>{nombreColaborador.toLowerCase()}</td>}
                       <td>{attr.fecha_reserva}</td>
                       <td style={{textTransform: 'capitalize'}}>{escritorio}</td>
                       <td style={{textTransform: 'capitalize'}}>{turno}</td>
                       <td><span className={`status-badge ${sClass}`}>{estadoTexto}</span></td>
                       <td style={{color: 'var(--text-muted)', fontSize: '0.85rem'}}>{attr.motivo_cancelacion || 'Ninguno'}</td>
                       <td>
                         <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                           {/* Confirmar: Si es nula (Pendiente). Administradores siempre, Usuarios dentro de rango */}
                           {attr.estado === null && (
                             <button 
                               className="action-btn confirm-btn"
                               disabled={!userData?.isAdmin && (!isWithinRange || loading)}
                               onClick={() => handleConfirmarReserva(reserva.id)}
                               title={!userData?.isAdmin && !isWithinRange ? "Debes estar a menos de 1000m de la oficina" : ""}
                               style={{ 
                                 opacity: (!userData?.isAdmin && !isWithinRange) ? 0.5 : 1, 
                                 cursor: (!userData?.isAdmin && !isWithinRange) ? 'not-allowed' : 'pointer' 
                               }}
                             >
                               Confirmar
                             </button>
                           )}

                           {/* Cancelar: Si no está cancelada, en cualquier momento */}
                           {attr.estado !== false && (
                             <button 
                               className="action-btn cancel-btn"
                               onClick={() => {
                                 setCancelReason('');
                                 setCancelModal({ isOpen: true, reservaId: reserva.id });
                               }}
                             >
                               Cancelar
                             </button>
                           )}

                           {/* Reactivar: Solo Admins si el estado es cancelado (false) */}
                           {attr.estado === false && userData?.isAdmin && (
                             <button 
                               className="action-btn"
                               style={{ borderColor: 'var(--success, #22c55e)', color: 'var(--success, #22c55e)' }}
                               onClick={() => handleReactivarReserva(reserva)}
                             >
                               Reactivar
                             </button>
                           )}
                         </div>
                       </td>
                     </tr>
                   );
                 })}
                 {!loading && filteredReservas.length === 0 && <tr><td colSpan={userData?.isAdmin ? "8" : "7"} style={{textAlign: 'center', padding: '3rem'}}>No hay reservas.</td></tr>}
               </tbody>
             </table>
           </div>

           {totalPages > 1 && (
             <div className="pagination-controls">
               <button 
                 disabled={currentPage === 1} 
                 onClick={() => setCurrentPage(p => p - 1)}
                 className="action-btn"
               >
                 Anterior
               </button>
               <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                 Página {currentPage} de {totalPages}
               </span>
               <button 
                 disabled={currentPage === totalPages} 
                 onClick={() => setCurrentPage(p => p + 1)}
                 className="action-btn"
               >
                 Siguiente
               </button>
             </div>
           )}

        </div>
      </div>
    </div>
  );
};

export default MyReservations;