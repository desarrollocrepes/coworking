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
      setLoading(true); setErrorMsg('');
      try {
        const url = userData.isAdmin ? 'https://macfer.crepesywaffles.com/api/working-reservas' : `https://macfer.crepesywaffles.com/api/working-reservas?documento=${userData.cedula}`;
        const res = await fetch(url);
        if(!res.ok) throw new Error('Error al cargar reservas');
        const data = await res.json();
        setReservas(Array.isArray(data) ? data : []);
      } catch (err) { setErrorMsg('No se pudieron cargar las reservas.'); } 
      finally { setLoading(false); }
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
            <span className={`role-badge ${userData?.isAdmin ? 'role-admin' : 'role-user'}`}>{userData?.isAdmin ? 'Administrador' : 'Usuario'}</span>
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
                   const stateStr = (reserva.estado || '').toLowerCase();
                   const isOwner = reserva.documento === userData?.cedula;
                   let sClass = '';
                   if(stateStr.includes('confirm')) sClass = 'confirmada';
                   else if(stateStr.includes('pend')) sClass = 'pendiente';
                   else if(stateStr.includes('cancel')) sClass = 'cancelada';

                   return (
                     <tr key={reserva.id}>
                       <td style={{fontWeight: 600}}>#{reserva.id}</td><td>{reserva.fecha}</td><td>Esc. {reserva.escritorio}</td><td>{reserva.turno}</td>
                       <td><span className={`status-badge ${sClass}`}>{reserva.estado}</span></td>
                       <td style={{color: 'var(--text-muted)'}}>{reserva.motivo || 'Ninguno'}</td>
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