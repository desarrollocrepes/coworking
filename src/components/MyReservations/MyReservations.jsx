import React, { useState, useEffect } from 'react';
import { MapPin, MapPinOff, RefreshCw, CheckCircle, Loader2 } from 'lucide-react';
import Button from '../Shared/Button';
import './MyReservations.css';

const MyReservations = ({ userData }) => {
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchReservas = async () => {
      setLoading(true); 
      setErrorMsg('');
      try {
        // Se actualizan las URLs para incluir populate=* y el filtro adecuado para Strapi
        const baseUrl = 'https://macfer.crepesywaffles.com/api/working-reservas';
        const url = userData.isAdmin 
          ? `${baseUrl}?populate=*` 
          : `${baseUrl}?filters[documento][$eq]=${userData.cedula}&populate=*`;
          
        const res = await fetch(url);
        if(!res.ok) throw new Error('Error al cargar reservas');
        
        const json = await res.json();
        // La data de Strapi viene dentro de la propiedad "data"
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

  return (
    <div className="container flex-1 py-8" style={{paddingTop: '2rem'}}>
      <div className="reservations-layout">
        <div className="res-sidebar">
          <div className="res-user-card">
            <img src={userData?.photo} alt={userData?.name} />
            <h3>{userData?.name}</h3>
            <span className={`role-badge ${userData?.isAdmin ? 'role-admin' : 'role-user'}`}>{userData?.isAdmin ? 'Admin' : 'User'}</span>
          </div>
          <div className="location-card">
            <h3 className="location-header"><MapPin color="var(--primary)" size={20} /> Ubicación</h3>
            <div className="location-status">
              <MapPinOff color="var(--danger)" size={28} style={{margin: '0 auto'}} />
              <p>Permiso denegado</p>
              <span>Para confirmar, debes estar a menos de 1000m.</span>
            </div>
            <Button className="btn-w-full" variant="secondary"><RefreshCw size={16} /> Actualizar</Button>
          </div>
        </div>
        <div className="table-container">
           <div className="table-header">
              <h3>Detalles de reserva</h3>
              {userData?.isAdmin && <span style={{fontSize: '0.85rem', color: 'var(--text-muted)', background: '#f1f5f9', padding: '0.25rem 0.75rem', borderRadius: '1rem'}}>Vista Admin</span>}
           </div>
           {errorMsg && <div className="alert alert-danger" style={{margin: '1rem', marginBottom: 0}}>{errorMsg}</div>}
           <div className="table-wrapper">
             {loading && <div className="overlay-loader"><Loader2 className="spin" size={32} color="var(--primary)" /></div>}
             <table className="data-table">
               <thead><tr><th>ID</th><th>Fecha</th><th>Escritorio</th><th>Horario</th><th>Estado</th><th>Motivo</th><th>Acciones</th></tr></thead>
               <tbody>
                 {reservas.map((reserva) => {
                   const attr = reserva.attributes;
                   
                   // Extracción segura de relaciones (puestos y horarios)
                   const escritorio = attr.working_puestos?.data?.[0]?.attributes?.nombre || 'Sin asignar';
                   const turno = attr.working_horarios?.data?.[0]?.attributes?.nombre || 'Sin turno';
                   
                   // Manejo del estado: Como en la API es un booleano, lo traducimos a texto para mantener tus clases CSS
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
                       <td>{attr.fecha_reserva}</td>
                       <td style={{textTransform: 'capitalize'}}>{escritorio}</td>
                       <td style={{textTransform: 'capitalize'}}>{turno}</td>
                       <td><span className={`status-badge ${sClass}`}>{estadoTexto}</span></td>
                       <td style={{color: 'var(--text-muted)'}}>{attr.motivo_cancelacion || 'Ninguno'}</td>
                       <td>
                         {stateStr.includes('pendiente') && isOwner && <button className="action-btn">Confirmar</button>}
                         {stateStr.includes('confirmada') && isOwner && <span style={{color:'var(--success)', display:'flex', alignItems:'center', gap:'0.25rem', fontSize:'0.85rem'}}><CheckCircle size={14}/> Lista</span>}
                       </td>
                     </tr>
                   );
                 })}
                 {!loading && reservas.length === 0 && <tr><td colSpan="7" style={{textAlign: 'center', padding: '3rem'}}>No hay reservas.</td></tr>}
               </tbody>
             </table>
           </div>
        </div>
      </div>
    </div>
  );
};

export default MyReservations;