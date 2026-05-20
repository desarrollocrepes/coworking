import React, { useState } from 'react';
import { Loader2, IdCard, Briefcase } from 'lucide-react';
import Button from '../Shared/Button';
import './Login.css';

const ADMIN_CEDULAS = import.meta.env.VITE_ADMIN_CEDULAS ? import.meta.env.VITE_ADMIN_CEDULAS.split(',') : [];

const Login = ({ onLoginSuccess }) => {
  const [cedula, setCedula] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    const cleanCedula = cedula.trim();
    if (cleanCedula.length < 5) return setErrorMsg('Ingresa una cédula válida');

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch(`${import.meta.env.VITE_API_ALOHA_URL}/buk/empleados3?documento=${cleanCedula}`);
      const data = await res.json();
      const emp = Array.isArray(data) ? data[0] : (data?.data?.[0] || data?.data || data);

      if (!emp) throw new Error('Empleado no encontrado');
      if (emp.status?.trim().toLowerCase() !== 'activo') throw new Error('Empleado no encontrado o inactivo');

      const userData = {
        name: emp.nombre ? `${emp.nombre} ${emp.apellidos || ''}`.trim() : (emp.nombres || ''),
        role: emp.cargo || '',
        department: emp.area || emp.departamento || '',
        photo: emp.foto || emp.url_foto || `https://ui-avatars.com/api/?name=${emp.nombre || ''}&background=2563eb&color=fff`,
        isAdmin: ADMIN_CEDULAS.includes(String(cleanCedula)),
        cedula: cleanCedula
      };

      let accepted = false;
      try {
        const polRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/working-politicas?documento=${cleanCedula}`);
        const polData = await polRes.json();
        accepted = polData?.aceptadas === true || (Array.isArray(polData) && polData.length > 0);
      } catch { /* Ignorar error de políticas */ }

      onLoginSuccess(userData, accepted);
    } catch (err) {
      setErrorMsg(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-header">
          <Briefcase size={48} />
          <h2>¡Bienvenido a nuestro espacio de Co-Working!</h2>
        </div>

        <form onSubmit={handleLogin} className="login-body">
          <div className="form-group">
            <label htmlFor="cedula" className="form-label">Ingresa tu cédula para continuar</label>
            <div className="input-wrapper">
              <IdCard className="input-icon" size={18} />
              <input
                id="cedula" type="text" value={cedula} placeholder="No. de cédula" required
                onChange={(e) => setCedula(e.target.value.replace(/\D/g, ''))}
                className="form-input"
              />
            </div>
          </div>
          {errorMsg && (
            <div className="alert alert-danger">
              <span>{errorMsg}</span>
            </div>
          )}
          <Button type="submit" className="btn-w-full" disabled={loading} style={{ padding: '0.8rem', fontSize: '1.1rem' }}>
            {loading ? <Loader2 className="spin" size={18} /> : 'Ingresar'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Login;