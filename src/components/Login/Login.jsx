import React, { useState } from 'react';
import { Building, AlertTriangle, User, Loader2 } from 'lucide-react';
import Button from '../Shared/Button';
import './Login.css';

const Login = ({ onLoginSuccess }) => {
  const [cedula, setCedula] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (cedula.length < 5) return;
    setLoading(true); setErrorMsg('');
    try {
      const res = await fetch(`https://apialohav2.crepesywaffles.com/buk/empleados3?documento=${cedula}`);
      if (!res.ok) throw new Error('Error de conexión');
      const data = await res.json();
      let empleado = Array.isArray(data) ? data[0] : (data.data ? (Array.isArray(data.data) ? data.data[0] : data.data) : data);
      
      if (!empleado) throw new Error('Empleado no encontrado.');
      if (empleado.status && empleado.status.toLowerCase() === 'inactivo') {
        throw new Error('Usuario inactivo');
      }

      const userData = {
        name: empleado.nombre ? `${empleado.nombre} ${empleado.apellidos || ''}` : empleado.nombre || 'Colaborador',
        role: empleado.cargo || 'Staff',
        department: empleado.area || empleado.departamento || 'General',
        photo: empleado.foto || empleado.url_foto || `https://ui-avatars.com/api/?name=${empleado.nombres || 'U'}&background=2563eb&color=fff`,
        isAdmin: empleado.is_admin || false,
        cedula: cedula
      };

      let accepted = false;
      try {
         const polRes = await fetch(`https://macfer.crepesywaffles.com/api/working-politicas?documento=${cedula}`);
         if(polRes.ok) {
            const polData = await polRes.json();
            if(polData.aceptadas || (Array.isArray(polData) && polData.length > 0)) { accepted = true; }
         }
      } catch (e) { console.warn('Políticas no verificables'); }

      onLoginSuccess(userData, accepted);
    } catch (err) {
      setErrorMsg(err.message || 'Error al iniciar sesión');
    } finally { setLoading(false); }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-header">
          <Building size={48} style={{margin: '0 auto', opacity: 0.9}} />
          <h2>¡Bienvenido al Co-Working!</h2>
          <p>Gestiona tus reservas de manera rápida</p>
        </div>
        <form onSubmit={handleLogin} className="login-body">
          {errorMsg && <div className="alert alert-danger"><AlertTriangle size={18}/> <span>{errorMsg}</span></div>}
          <div className="form-group">
            <label htmlFor="cedula" className="form-label">Ingresa tu cédula para continuar</label>
            <div className="input-wrapper">
              <User className="input-icon" size={20} />
              <input id="cedula" type="text" value={cedula} onChange={(e) => setCedula(e.target.value.replace(/\D/g, ''))} className="form-input" placeholder="No. de cédula" required />
            </div>
          </div>
          <Button type="submit" className="btn-w-full" disabled={loading} style={{padding: '0.8rem', fontSize:'1.1rem'}}>
            {loading ? <Loader2 className="spin" size={24} /> : 'Ingresar'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Login;