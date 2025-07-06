// 📁 src/pages/RegistroUsuario.tsx
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';

export default function RegistroUsuario() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const [perfil, setPerfil] = useState(null);
  const [password, setPassword] = useState('');
  const [estado, setEstado] = useState('');

  useEffect(() => {
    const cargar = async () => {
      const res = await axios.get(`/api/get-profile?id=${id}`);
      setPerfil(res.data.perfil);
    };
    cargar();
  }, [id]);

  const registrar = async () => {
    const res = await axios.post(`/api/createUserFromProfile`, {
      id,
      password,
    });
    if (res.data.success) {
      setEstado('Usuario creado correctamente');
    } else {
      setEstado('Error al crear usuario');
    }
  };

  if (!perfil) return <p>Cargando…</p>;

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-xl mb-4">Completa tu registro</h1>
      <p>Email: <strong>{perfil.email}</strong></p>
      <input
        type="password"
        placeholder="Elige una contraseña"
        className="border p-2 w-full my-2"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={registrar} className="bg-blue-500 text-white px-4 py-2 rounded">
        Registrar
      </button>
      <p className="mt-4">{estado}</p>
    </div>
  );
}

// 📁 src/pages/GestionarUsuarios.tsx
import { useEffect, useState } from 'react';
import axios from 'axios';

export default function GestionarUsuarios() {
  const [pendientes, setPendientes] = useState([]);
  const [activos, setActivos] = useState([]);

  const cargarUsuarios = async () => {
    const res = await axios.get('/api/listar-user-profiles');
    setPendientes(res.data.pendientes);
    setActivos(res.data.activos);
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const deshabilitarUsuario = async (id) => {
    await axios.post('/api/deshabilitar-user', { id });
    cargarUsuarios();
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Gestión de Usuarios</h1>

      <h2 className="text-xl font-semibold mt-4">Solicitudes pendientes</h2>
      {pendientes.length === 0 ? <p>No hay solicitudes pendientes</p> : (
        <ul className="mt-2">
          {pendientes.map((u) => (
            <li key={u.id} className="border-b py-2">
              {u.email} ({u.rol})
              <a
                href={`/registro?id=${u.id}`}
                className="ml-4 text-blue-600 underline"
              >
                Enviar enlace de registro
              </a>
            </li>
          ))}
        </ul>
      )}

      <h2 className="text-xl font-semibold mt-6">Usuarios activos</h2>
      {activos.length === 0 ? <p>No hay usuarios activos</p> : (
        <ul className="mt-2">
          {activos.map((u) => (
            <li key={u.id} className="border-b py-2 flex justify-between">
              <span>{u.email} - <em>{u.rol}</em></span>
              <button
                className="text-red-600 underline"
                onClick={() => deshabilitarUsuario(u.id)}
              >
                Deshabilitar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// 📁 supabase/functions/createUserFromProfile/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

serve(async (req) => {
  const body = await req.json();
  const profileId = body.id;
  const password = body.password;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: profile, error: errorProfile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', profileId)
    .eq('status', 'pending')
    .single();

  if (errorProfile || !profile) {
    return new Response(JSON.stringify({ error: 'Perfil no encontrado o ya activo' }), { status: 400 });
  }

  const { data: authUser, error: errorUser } = await supabase.auth.admin.createUser({
    email: profile.email,
    password,
    email_confirm: true,
  });

  if (errorUser) {
    return new Response(JSON.stringify({ error: errorUser.message }), { status: 400 });
  }

  await supabase
    .from('user_profiles')
    .update({ user_id: authUser.user.id, status: 'active' })
    .eq('id', profileId);

  return new Response(JSON.stringify({ success: true }), { status: 200 });
});
