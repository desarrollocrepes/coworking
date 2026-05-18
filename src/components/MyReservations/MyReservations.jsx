import React, { useState, useEffect } from 'react';
import { MapPin, MapPinOff, RefreshCw, CheckCircle, Loader2 } from 'lucide-react';
import Button from '../Shared/Button';
import './MyReservations.css';

const MyReservations = ({ userData }) => {
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Estados para los filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todas');
  const [filterOwnership, setFilterOwnership] = useState('todas');

  useEffect(() => {
    const fetchReservas = async () => {
      setLoading(true); 
      setErrorMsg('');
      try {
        const baseUrl = 'https://macfer.crepesywaffles.com/api/working-reservas';
        const url = userData.isAdmin 
          ? `${baseUrl}?populate=*` 
          : `${baseUrl}?filters[documento][$eq]=${userData.cedula}&populate=*`;
          
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
    };
    if (userData?.cedula) fetchReservas();
  }, [userData]);

  // Filtrado de la data
  const filteredReservas = reservas.filter((reserva) => {
    const attr = reserva.attributes;
    
    // Variables para la búsqueda global
    const nombreColaborador = (attr.Nombre || attr.nombre || attr.documento || '').toLowerCase();
    const idReserva = String(reserva.id);
    const documento = String(attr.documento || '');

    // 1. Filtro Búsqueda Global
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
                          idReserva.includes(searchLower) || 
                          nombreColaborador.includes(searchLower) || 
                          documento.includes(searchLower);

    // 2. Filtro Estado
    let estadoTexto = attr.estado ? 'confirmada' : 'pendiente';
    if (attr.motivo_cancelacion) estadoTexto = 'cancelada';
    const matchesStatus = filterStatus === 'todas' || estadoTexto === filterStatus;

    // 3. Filtro Mis Reservas / Otras (Solo admin)
    const isOwner = attr.documento === userData?.cedula;
    let matchesOwnership = true;
    if (userData?.isAdmin) {
      if (filterOwnership === 'mis_reservas') matchesOwnership = isOwner;
      if (filterOwnership === 'otras') matchesOwnership = !isOwner;
    }

    return matchesSearch && matchesStatus && matchesOwnership;
  });

  return (
    <div className="container flex-1 py-8" style={{paddingTop: '2rem'}}>
      <div className="reservations-layout">
        <div className="res-sidebar">
          <div className="res-user-card">
            <img src={userData?.photo} alt={userData?.name} />
            <h3>{userData?.name}</h3>
            <span className={`role-badge ${userData?.isAdmin ? 'role-admin' : 'role-user'}`}>
              {userData?.isAdmin ? 'Admin' : 'User'}
            </span>
          </div>
          
          {!userData?.isAdmin && (
            <div className="location-card">
              <h3 className="location-header"><MapPin color="var(--primary)" size={20} /> Ubicación</h3>
              <div className="location-status">
                <MapPinOff color="var(--danger)" size={28} style={{margin: '0 auto'}} />
                <p>Permiso denegado</p>
                <span>Para confirmar, debes estar a menos de 1000m.</span>
              </div>
              <Button className="btn-w-full" variant="secondary"><RefreshCw size={16} /> Actualizar</Button>
            </div>
          )}
        </div>
        
        <div className="table-container">
           <div className="table-header">
              <h3>{userData?.isAdmin ? 'Gestión de reservas' : 'Detalles de reserva'}</h3>
           </div>

           {/* --- NUEVA BARRA DE FILTROS --- */}
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
                 {filteredReservas.map((reserva) => {
                   const attr = reserva.attributes;
                   
                   // --- CAMBIOS EN ESCRITORIO Y HORARIO ---
                   const escritorioNombre = attr.working_puestos?.data?.[0]?.attributes?.nombre || '';
                   const escritorio = escritorioNombre.replace(/\D/g, '') || '-'; // Extrae solo el número

                   const horarioAttr = attr.working_horarios?.data?.[0]?.attributes;
                   // Formatea para mostrar hora de inicio - fin
                   const turno = horarioAttr ? `${horarioAttr.inicio?.slice(0,5) || ''} - ${horarioAttr.fin?.slice(0,5) || ''}` : 'Sin turno';
                   
                   const nombreColaborador = attr.Nombre || attr.nombre || attr.documento || 'Desconocido';
                   
                   let estadoTexto = attr.estado ? 'Confirmada' : 'Pendiente';
                   if (attr.motivo_cancelacion) estadoTexto = 'Cancelada';
                   
                   const stateStr = estadoTexto.toLowerCase();
                   const isOwner = attr.documento === userData?.cedula;
                   
                   let sClass = '';
                   if(stateStr.includes('confirm')) sClass = 'confirmada';
                   else if(stateStr.includes('pend')) sClass = 'pendiente';
                   else if(stateStr.includes('cancel')) sClass = 'cancelada';

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
                         {stateStr.includes('pendiente') && isOwner && <button className="action-btn">Confirmar</button>}
                         {stateStr.includes('confirmada') && isOwner && <span style={{color:'var(--success)', display:'flex', alignItems:'center', gap:'0.25rem', fontSize:'0.85rem'}}><CheckCircle size={14}/> Lista</span>}
                         {userData?.isAdmin && !isOwner && <span style={{fontSize: '0.8rem', color: '#999'}}>-</span>}
                       </td>
                     </tr>
                   );
                 })}
                 {!loading && filteredReservas.length === 0 && <tr><td colSpan={userData?.isAdmin ? "8" : "7"} style={{textAlign: 'center', padding: '3rem'}}>No hay reservas.</td></tr>}
               </tbody>
             </table>
           </div>
        </div>
      </div>
    </div>
  );
};

export default MyReservations;