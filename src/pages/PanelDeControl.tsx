import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import {
  Search, Edit2, Trash2, Plus, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Settings, X, AlertTriangle, User, AlertCircle, ChevronDown,
  ArrowUpDown, ArrowUp, ArrowDown, Lock, Eye, EyeOff, CheckCircle2
} from 'lucide-react';

// Constantes de colores
const COLOR_PRIMARIO = '#91268F';

// Tipos
interface UserProfile {
  user_id: string; // PRIMARY KEY - usado como identificador principal
  name: string | null;
  email: string;
  user_role: string;
  status: boolean; // true = ACTIVO, false = INACTIVO
  created_at: string;
  last_sign_in_at: string | null;
  ambito_almacenes?: string[];
}

interface Almacen {
  id: string;
  nombre: string;
  codigo: string;
}

export default function PanelDeControl() {
  const { toast } = useToast();

  // Estados principales
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);

  // Estados de filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [filterRole, setFilterRole] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>(''); // '' = todos, 'true' = ACTIVO, 'false' = INACTIVO

  // Estados de ordenamiento
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>('asc');
  const [sortColumn, setSortColumn] = useState<'name' | 'email'>('name');

  // Estados de paginación
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Estados de modales
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAmbitoModal, setShowAmbitoModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [selectedUserAmbito, setSelectedUserAmbito] = useState<UserProfile | null>(null);
  const [userToDelete, setUserToDelete] = useState<{ userId: string; userName: string } | null>(null);

  // Estados de formularios
  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    user_role: 'CONSULTAS',
    status: false, // false = INACTIVO por defecto
    password: ''
  });

  // Estados de validación de contraseña
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecial: false
  });

  const [showPassword, setShowPassword] = useState(false);

  const [almacenesDisponibles, setAlmacenesDisponibles] = useState<Almacen[]>([]);
  const [almacenesSeleccionados, setAlmacenesSeleccionados] = useState<string[]>([]);
  const [newUserAmbitos, setNewUserAmbitos] = useState<string[]>([]);
  const [ambitoModalMode, setAmbitoModalMode] = useState<'new-user' | 'edit-user'>('edit-user');
  const [tempUserName, setTempUserName] = useState<string>(''); // Para mostrar nombre en modal de nuevo usuario

  // ============ FUNCIONES DE CARGA DE DATOS ============

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, user_id, nombre_usuario, email, user_role, status, created_at, last_sign_in_at, updated_at, ambito_almacenes, is_active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Procesar los datos para asegurar que ambito_almacenes sea un array
      const processedData = (data || []).map(user => ({
        ...user,
        name: user.nombre_usuario, // Mapear nombre_usuario a name
        ambito_almacenes: Array.isArray(user.ambito_almacenes)
          ? user.ambito_almacenes
          : (user.ambito_almacenes ? [] : [])
      }));

      setUsers(processedData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setCurrentUserProfile(data);
    }
  };

  const fetchAlmacenes = async () => {
    try {
      const { data, error } = await supabase
        .from('tbl_almacenes')
        .select('id, codigo_alm, nombre_alm')
        .order('codigo_alm');

      if (error) throw error;

      // Mapear los datos al formato esperado
      const mappedData = (data || []).map(item => ({
        id: item.id,
        nombre: item.nombre_alm,
        codigo: item.codigo_alm
      }));

      setAlmacenesDisponibles(mappedData);

      console.log('Almacenes cargados correctamente:', mappedData.length);
    } catch (error: any) {
      console.error('Error cargando almacenes:', error);
      toast({
        title: "Error al cargar almacenes",
        description: error.message || "No se pudieron cargar los almacenes disponibles. Verifica los permisos de la tabla.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchCurrentUser();
    fetchAlmacenes();
  }, []);

  useEffect(() => {
    if (showAmbitoModal) {
      if (ambitoModalMode === 'edit-user' && selectedUserAmbito) {
        setAlmacenesSeleccionados(selectedUserAmbito.ambito_almacenes || []);
      } else if (ambitoModalMode === 'new-user') {
        setAlmacenesSeleccionados(newUserAmbitos);
      }
    }
  }, [showAmbitoModal, ambitoModalMode, selectedUserAmbito, newUserAmbitos]);

  // Evaluar la fortaleza de la contraseña
  useEffect(() => {
    setPasswordStrength({
      length: newUserData.password.length >= 8,
      hasUppercase: /[A-Z]/.test(newUserData.password),
      hasLowercase: /[a-z]/.test(newUserData.password),
      hasNumber: /[0-9]/.test(newUserData.password),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(newUserData.password)
    });
  }, [newUserData.password]);

  // ============ FUNCIONES AUXILIARES ============

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getStatusColor = (status: boolean) => {
    return status ? 'bg-green-500' : 'bg-red-500';
  };

  // ============ FUNCIONES DE SELECCIÓN ============

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleAllUsers = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(u => u.user_id));
    }
  };

  // ============ FUNCIONES DE FILTRADO ============

  const filteredUsers = users.filter(user => {
    const matchSearch =
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchRole = filterRole === '' || user.user_role === filterRole;
    const matchStatus = filterStatus === '' || user.status === (filterStatus === 'true');

    return matchSearch && matchRole && matchStatus;
  });

  // ============ FUNCIONES DE ORDENAMIENTO ============

  const toggleSortOrder = (column: 'name' | 'email') => {
    // Si se hace clic en una columna diferente, ordenar ascendente
    if (sortColumn !== column) {
      setSortColumn(column);
      setSortOrder('asc');
    } else {
      // Si es la misma columna, alternar el orden
      if (sortOrder === null) {
        setSortOrder('asc');
      } else if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else {
        setSortOrder(null);
      }
    }
  };

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (sortOrder === null) return 0;

    let valueA = '';
    let valueB = '';

    if (sortColumn === 'name') {
      valueA = (a.name || a.email || '').toLowerCase();
      valueB = (b.name || b.email || '').toLowerCase();
    } else if (sortColumn === 'email') {
      valueA = (a.email || '').toLowerCase();
      valueB = (b.email || '').toLowerCase();
    }

    if (sortOrder === 'asc') {
      return valueA.localeCompare(valueB);
    } else {
      return valueB.localeCompare(valueA);
    }
  });

  const clearFilters = () => {
    setSearchTerm('');
    setFilterRole('');
    setFilterStatus('');
    setSortOrder('asc');
    setSortColumn('name');
  };

  // ============ FUNCIONES DE PAGINACIÓN ============

  const totalUsers = sortedUsers.length;
  const totalPages = Math.ceil(totalUsers / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalUsers);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToFirstPage = () => goToPage(1);
  const goToLastPage = () => goToPage(totalPages);
  const goToPrevPage = () => goToPage(currentPage - 1);
  const goToNextPage = () => goToPage(currentPage + 1);

  // ============ FUNCIONES CRUD ============

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newUserData.name || !newUserData.email || !newUserData.password) {
      toast({
        title: "Error",
        description: "Nombre completo, email y contraseña son obligatorios",
        variant: "destructive",
      });
      return;
    }

    // Validar requisitos de contraseña
    if (!passwordStrength.length || !passwordStrength.hasUppercase ||
        !passwordStrength.hasLowercase || !passwordStrength.hasNumber ||
        !passwordStrength.hasSpecial) {
      toast({
        title: "Contraseña no válida",
        description: "La contraseña no cumple con los requisitos mínimos de seguridad.",
        variant: "destructive",
      });
      return;
    }

    // Validar que el email sea del dominio permitido
    const allowedDomain = import.meta.env.VITE_ALLOWED_EMAIL_DOMAIN;
    if (!allowedDomain || !newUserData.email.toLowerCase().endsWith('')) {
    //if (!allowedDomain || !newUserData.email.toLowerCase().endsWith(allowedDomain)) {
      toast({
        title: "Direccion de correo-e no permitida",
        description: "Solo se permiten altas de nuevos usuarios con el correo-e empresarial",
        variant: "destructive",
      });
      return;
    }

    // FASE 3: Validar que se haya seleccionado al menos 1 almacén
    if (newUserAmbitos.length === 0) {
      toast({
        title: "Error",
        description: "Debes asignar al menos un almacén al usuario",
        variant: "destructive",
      });
      return;
    }

    try {
      // Crear usuario en Auth (requiere permisos de admin)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUserData.email,
        password: newUserData.password,
        options: {
          emailRedirectTo: window.location.origin,
        }
      });

      if (authError) throw authError;

      // Crear perfil de usuario
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert([{
          user_id: authData.user!.id,
          nombre_usuario: newUserData.name || null,
          email: newUserData.email,
          user_role: newUserData.user_role,
          status: newUserData.status,
          ambito_almacenes: newUserAmbitos
        }]);

      if (profileError) throw profileError;

      await fetchUsers();

      toast({
        title: "Usuario creado",
        description: `${newUserData.email} ha sido agregado correctamente`,
      });

      // Limpiar y cerrar
      setNewUserData({
        name: '',
        email: '',
        user_role: 'CONSULTAS',
        status: false,
        password: ''
      });
      setNewUserAmbitos([]);
      setShowAddUserModal(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el usuario",
        variant: "destructive",
      });
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingUser) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          nombre_usuario: editingUser.name,
        })
        .eq('user_id', editingUser.user_id);

      if (error) throw error;

      await fetchUsers();

      toast({
        title: "Usuario actualizado",
        description: "Los cambios se guardaron correctamente",
      });

      setShowEditModal(false);
      setEditingUser(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el usuario",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    if (userId === currentUserProfile?.user_id) {
      toast({
        title: "Acción no permitida",
        description: "No puedes eliminarte a ti mismo",
        variant: "destructive",
      });
      return;
    }

    // Mostrar modal de confirmación
    setUserToDelete({ userId, userName });
    setShowDeleteModal(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      // 1. Eliminar del sistema de autenticación (auth.users)
      // Nota: Esta operación requiere privilegios de admin
      const { error: authError } = await supabase.auth.admin.deleteUser(
        userToDelete.userId
      );

      if (authError) {
        console.warn('No se pudo eliminar de auth.users (puede requerir función Edge):', authError);
      }

      // 2. Eliminar perfil de usuario
      const { error: profileError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('user_id', userToDelete.userId);

      if (profileError) throw profileError;

      await fetchUsers();

      toast({
        title: "Usuario eliminado",
        description: `${userToDelete.userName} ha sido eliminado correctamente`,
      });

      setShowDeleteModal(false);
      setUserToDelete(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el usuario",
        variant: "destructive",
      });
    }
  };

  const handleChangeStatus = async (userId: string, newStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ status: newStatus })
        .eq('user_id', userId);

      if (error) throw error;

      await fetchUsers();

      toast({
        title: "Estado actualizado",
        description: `El estado se cambió a ${newStatus ? 'ACTIVO' : 'INACTIVO'}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado",
        variant: "destructive",
      });
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    if (userId === currentUserProfile?.user_id && newRole !== 'ADMINISTRADOR') {
      toast({
        title: "Acción no permitida",
        description: "No puedes quitarte el rol de administrador a ti mismo",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ user_role: newRole })
        .eq('user_id', userId);

      if (error) throw error;

      await fetchUsers();

      toast({
        title: "Rol actualizado",
        description: `El rol se cambió a ${newRole}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el rol",
        variant: "destructive",
      });
    }
  };

  const handleSaveAmbitos = async () => {
    if (!selectedUserAmbito) return;

    try {
      console.log('🔵 Guardando:', {
        user_id: selectedUserAmbito.user_id,
        almacenes_a_guardar: almacenesSeleccionados,
        cantidad: almacenesSeleccionados.length
      });

      const { data, error } = await supabase
        .from('user_profiles')
        .update({ ambito_almacenes: almacenesSeleccionados })
        .eq('user_id', selectedUserAmbito.user_id)
        .select('user_id, ambito_almacenes');

      console.log('🟢 Respuesta UPDATE:', { data, error });
      console.log('🟢 ambito_almacenes guardado:', data?.[0]?.ambito_almacenes);
      console.log('🟢 Tipo:', typeof data?.[0]?.ambito_almacenes, 'Array?', Array.isArray(data?.[0]?.ambito_almacenes));

      if (error) throw error;

      await fetchUsers();

      toast({
        title: "Ámbitos actualizados",
        description: `${almacenesSeleccionados.length} almacenes guardados correctamente`,
      });

      setShowAmbitoModal(false);
    } catch (error: any) {
      console.error('🔴 Error guardando ámbitos:', error);
      toast({
        title: "Error al guardar ámbitos",
        description: error.message || "No se pudieron guardar los ámbitos",
        variant: "destructive",
      });
    }
  };

  const handleSaveAmbitosForNewUser = () => {
    // Validar que se haya seleccionado al menos 1 almacén
    if (almacenesSeleccionados.length === 0) {
      toast({
        title: "Error",
        description: "Debes seleccionar al menos un almacén",
        variant: "destructive",
      });
      return;
    }

    // Guardar en estado temporal para el formulario de nuevo usuario
    setNewUserAmbitos(almacenesSeleccionados);

    // Cerrar modal
    setShowAmbitoModal(false);
    setAlmacenesSeleccionados([]);

    toast({
      title: "Almacenes seleccionados",
      description: `${almacenesSeleccionados.length} almacén(es) confirmado(s)`,
    });
  };

  // ============ RENDER ============

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-slate-700">
            Panel de Control de Usuarios
          </h1>
          <p className="text-gray-600 text-lg mt-2">
            Gestión de los usuarios de la aplicación, control de acceso,
            asignación de roles y monitorización de actividades
          </p>
        </div>
      </div>

      {/* Barra de filtros y búsqueda */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <div className="flex items-center gap-4 w-full">
          {/* Botón Add User */}
          <button
            onClick={() => setShowAddUserModal(true)}
            className="flex items-center gap-2 px-6 py-3 text-white rounded-full hover:opacity-90 transition-colors shadow-md"
            style={{ backgroundColor: COLOR_PRIMARIO }}
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">Agregar Usuario</span>
          </button>

          {/* Búsqueda - Ocupa todo el espacio disponible */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar usuarios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-200"
              style={{ borderWidth: '1px', borderColor: COLOR_PRIMARIO }}
            />
          </div>

          {/* Filtro Rol */}
          <div className="relative w-48">
            <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full pl-12 pr-10 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-200 appearance-none cursor-pointer text-gray-600"
              style={{ borderWidth: '1px', borderColor: COLOR_PRIMARIO }}
            >
              <option value="">Roles</option>
              <option value="ADMINISTRADOR">Administrador</option>
              <option value="EDICION">Edición</option>
              <option value="CONSULTAS">Consultas</option>
            </select>
            <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>

          {/* Filtro Status */}
          <div className="relative w-48">
            <AlertCircle className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full pl-12 pr-10 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-200 appearance-none cursor-pointer text-gray-600"
              style={{ borderWidth: '1px', borderColor: COLOR_PRIMARIO }}
            >
              <option value="">Estados</option>
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </select>
            <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>

          {/* Botón Borrar Filtros */}
          <button
            onClick={clearFilters}
            className="p-3 hover:bg-gray-100 rounded-full transition-colors"
            title="Borrar filtros"
          >
            <Trash2 className="w-5 h-5 text-gray-400 hover:text-gray-600" />
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center p-12">
            <div
              className="animate-spin rounded-full h-12 w-12 border-b-2"
              style={{ borderColor: COLOR_PRIMARIO }}
            ></div>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="text-white" style={{ backgroundColor: COLOR_PRIMARIO }}>
                  <th className="py-4 px-6 text-left">
                    <input
                      type="checkbox"
                      checked={selectedUsers.length === sortedUsers.length && sortedUsers.length > 0}
                      onChange={toggleAllUsers}
                      className="w-4 h-4 rounded cursor-pointer"
                    />
                  </th>
                  <th className="py-4 px-6 text-left font-medium">
                    <button
                      onClick={() => toggleSortOrder('name')}
                      className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                      title="Ordenar por nombre"
                    >
                      <span>Nombre Completo</span>
                      {sortColumn === 'name' && sortOrder === null && <ArrowUpDown className="w-4 h-4" />}
                      {sortColumn === 'name' && sortOrder === 'asc' && <ArrowUp className="w-4 h-4" />}
                      {sortColumn === 'name' && sortOrder === 'desc' && <ArrowDown className="w-4 h-4" />}
                      {sortColumn !== 'name' && <ArrowUpDown className="w-4 h-4 opacity-30" />}
                    </button>
                  </th>
                  <th className="py-4 px-6 text-left font-medium">
                    <button
                      onClick={() => toggleSortOrder('email')}
                      className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                      title="Ordenar por email"
                    >
                      <span>Email</span>
                      {sortColumn === 'email' && sortOrder === null && <ArrowUpDown className="w-4 h-4" />}
                      {sortColumn === 'email' && sortOrder === 'asc' && <ArrowUp className="w-4 h-4" />}
                      {sortColumn === 'email' && sortOrder === 'desc' && <ArrowDown className="w-4 h-4" />}
                      {sortColumn !== 'email' && <ArrowUpDown className="w-4 h-4 opacity-30" />}
                    </button>
                  </th>
                  <th className="py-4 px-6 text-left font-medium">Estado</th>
                  <th className="py-4 px-6 text-left font-medium">Rol</th>
                  <th className="py-4 px-6 text-left font-medium">Último Acceso</th>
                  <th className="py-4 px-6 text-left font-medium">Ámbito</th>
                  <th className="py-4 px-6 text-left font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers
                  .slice(startIndex, endIndex)
                  .map((user) => (
                    <tr
                      key={user.user_id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      {/* Checkbox */}
                      <td className="py-4 px-6">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.user_id)}
                          onChange={() => toggleUserSelection(user.user_id)}
                          className="w-4 h-4 rounded cursor-pointer"
                        />
                      </td>

                      {/* Nombre con avatar */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white text-sm font-semibold">
                            {getInitials(user.name || user.email)}
                          </div>
                          <span className="font-medium text-gray-800">
                            {user.name || 'Sin nombre'}
                          </span>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-4 px-6 text-gray-600">
                        {user.email}
                      </td>

                      {/* Estado */}
                      <td className="py-4 px-6">
                        <select
                          value={user.status ? 'true' : 'false'}
                          onChange={(e) => handleChangeStatus(user.user_id, e.target.value === 'true')}
                          className={`${getStatusColor(user.status)} text-white px-4 py-1.5 rounded-full text-sm font-medium cursor-pointer border-none outline-none`}
                        >
                          <option value="true" className="bg-white text-gray-800">Activo</option>
                          <option value="false" className="bg-white text-gray-800">Inactivo</option>
                        </select>
                      </td>

                      {/* Rol */}
                      <td className="py-4 px-6">
                        <select
                          value={user.user_role || 'CONSULTAS'}
                          onChange={(e) => handleChangeRole(user.user_id, e.target.value)}
                          className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200 text-gray-700 cursor-pointer"
                        >
                          <option value="ADMINISTRADOR">Administrador</option>
                          <option value="EDICION">Edición</option>
                          <option value="CONSULTAS">Consultas</option>
                        </select>
                      </td>

                      {/* Último Acceso */}
                      <td className="py-4 px-6 text-gray-600">
                        {user.last_sign_in_at
                          ? new Date(user.last_sign_in_at).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'Nunca'
                        }
                      </td>

                      {/* Ámbito */}
                      <td className="py-4 px-6">
                        <button
                          onClick={() => {
                            setSelectedUserAmbito(user);
                            setShowAmbitoModal(true);
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-purple-50 transition-colors text-sm"
                          style={{ borderWidth: '1px', borderColor: COLOR_PRIMARIO }}
                        >
                          <Settings className="w-4 h-4" />
                          <span>
                            {user.ambito_almacenes?.length || 0} almacenes
                          </span>
                        </button>
                      </td>

                      {/* Acciones */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingUser(user);
                              setShowEditModal(true);
                            }}
                            className="p-2 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Editar usuario"
                          >
                            <Edit2 className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.user_id, user.name || user.email)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar usuario"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>

            {/* Paginación */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
              {/* Izquierda: Selector de filas */}
              <div className="flex items-center gap-4">
                <span className="text-gray-600">Filas por página</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-gray-600">
                  {startIndex + 1}-{endIndex} de {totalUsers}
                </span>
              </div>

              {/* Derecha: Controles de página */}
              <div className="flex items-center gap-2">
                <button
                  onClick={goToFirstPage}
                  disabled={currentPage === 1}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronsLeft className="w-5 h-5 text-gray-600" />
                </button>

                <button
                  onClick={goToPrevPage}
                  disabled={currentPage === 1}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>

                {/* Números de página */}
                {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => goToPage(pageNum)}
                      className={`w-9 h-9 rounded-lg font-medium transition-colors ${currentPage === pageNum
                        ? 'text-white'
                        : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      style={currentPage === pageNum ? { backgroundColor: COLOR_PRIMARIO } : {}}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                {totalPages > 5 && (
                  <>
                    <span className="text-gray-600 px-2">...</span>
                    <button
                      onClick={() => goToPage(totalPages)}
                      className="w-9 h-9 hover:bg-gray-100 rounded-lg text-gray-700 font-medium transition-colors"
                    >
                      {totalPages}
                    </button>
                  </>
                )}

                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>

                <button
                  onClick={goToLastPage}
                  disabled={currentPage === totalPages}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronsRight className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* MODAL: Agregar Usuario */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Agregar Nuevo Usuario
              </h2>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newUserData.name}
                  onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
                  placeholder="Nombre y Apellidos"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
                  placeholder="usuario@renfe.es"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={newUserData.password}
                    onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
                    placeholder="Mínimo 8 caracteres"
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Requisitos de contraseña */}
                <div className="mt-3 space-y-2 text-sm">
                  <p className="text-gray-700 font-medium flex items-center">
                    <Lock className="h-4 w-4 mr-1" />
                    Requisitos de la contraseña:
                  </p>
                  <ul className="pl-5 space-y-1 text-xs">
                    <li className={passwordStrength.length ? "text-green-600" : "text-gray-600"}>
                      ✓ Debe tener al menos 8 caracteres
                    </li>
                    <li className={passwordStrength.hasUppercase ? "text-green-600" : "text-gray-600"}>
                      ✓ Al menos una letra mayúscula (A-Z)
                    </li>
                    <li className={passwordStrength.hasLowercase ? "text-green-600" : "text-gray-600"}>
                      ✓ Al menos una letra minúscula (a-z)
                    </li>
                    <li className={passwordStrength.hasNumber ? "text-green-600" : "text-gray-600"}>
                      ✓ Al menos un número (0-9)
                    </li>
                    <li className={passwordStrength.hasSpecial ? "text-green-600" : "text-gray-600"}>
                      ✓ Al menos un carácter especial (!@#$%^&*)
                    </li>
                  </ul>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rol Asignado <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={newUserData.user_role}
                  onChange={(e) => setNewUserData({ ...newUserData, user_role: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
                >
                  <option value="CONSULTAS">Consultas</option>
                  <option value="EDICION">Edición</option>
                  <option value="ADMINISTRADOR">Administrador</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado Inicial <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={newUserData.status ? 'true' : 'false'}
                  onChange={(e) => setNewUserData({ ...newUserData, status: e.target.value === 'true' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
                >
                  <option value="false">Inactivo</option>
                  <option value="true">Activo</option>
                </select>
              </div>

              {/* Selección de Almacenes mediante Modal */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="text-red-500">*</span> Almacenes Asignados
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setAmbitoModalMode('new-user');
                    setTempUserName(newUserData.name || newUserData.email);
                    setAlmacenesSeleccionados(newUserAmbitos); // Cargar selección actual
                    setShowAmbitoModal(true);
                  }}
                  className="w-full px-4 py-3 border-2 border-dashed border-purple-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all duration-200 flex items-center justify-center gap-2"
                  style={{ borderColor: newUserAmbitos.length > 0 ? COLOR_PRIMARIO : undefined }}
                >
                  <Settings className="w-5 h-5 text-purple-600" />
                  <span className="font-medium text-purple-700">
                    {newUserAmbitos.length === 0
                      ? 'Seleccionar Almacenes para este usuario'
                      : `${newUserAmbitos.length} almacén(es) seleccionado(s) - Clic para editar`
                    }
                  </span>
                </button>
                {newUserAmbitos.length > 0 && (
                  <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Almacenes confirmados
                  </p>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors"
                  style={{ backgroundColor: COLOR_PRIMARIO }}
                >
                  Crear Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Editar Usuario */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Editar Usuario
              </h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingUser(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre completo
                </label>
                <input
                  type="text"
                  value={editingUser.name || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={editingUser.email || ''}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">
                  El email no se puede modificar
                </p>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingUser(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors"
                  style={{ backgroundColor: COLOR_PRIMARIO }}
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Gestionar Ámbitos */}
      {showAmbitoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full mx-4 shadow-2xl max-h-[80vh] flex flex-col">
            {/* Header fijo */}
            <div className="p-8 pb-4">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-2xl font-bold text-gray-800">
                  {ambitoModalMode === 'new-user' ? 'Seleccionar Almacenes para Nuevo Usuario' : 'Gestionar Ámbitos'}
                </h2>
                <button
                  onClick={() => {
                    setShowAmbitoModal(false);
                    setAlmacenesSeleccionados([]);
                    if (ambitoModalMode === 'edit-user') {
                      setSelectedUserAmbito(null);
                    }
                    setTempUserName('');
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              {ambitoModalMode === 'edit-user' && selectedUserAmbito && (
                <div className="mb-4">
                  <p className="text-gray-600 mb-2">
                    Usuario: <span className="font-semibold">{selectedUserAmbito.name || selectedUserAmbito.email}</span>
                  </p>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer hover:text-purple-700 transition-colors">
                      <input
                        type="radio"
                        name="almacenes-selection"
                        checked={almacenesSeleccionados.length === almacenesDisponibles.length && almacenesDisponibles.length > 0}
                        onChange={() => {
                          setAlmacenesSeleccionados(almacenesDisponibles.map(a => a.id));
                        }}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <span className="text-sm font-medium text-gray-700">Seleccionar Todos</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer hover:text-purple-700 transition-colors">
                      <input
                        type="radio"
                        name="almacenes-selection"
                        checked={almacenesSeleccionados.length === 0}
                        onChange={() => {
                          setAlmacenesSeleccionados([]);
                        }}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <span className="text-sm font-medium text-gray-700">Borrar Todos</span>
                    </label>
                  </div>
                </div>
              )}

              {ambitoModalMode === 'new-user' && (
                <div className="mb-4">
                  <p className="text-gray-600 mb-2">
                    Nuevo usuario: <span className="font-semibold">{tempUserName}</span>
                  </p>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer hover:text-purple-700 transition-colors">
                      <input
                        type="radio"
                        name="almacenes-selection"
                        checked={almacenesSeleccionados.length === almacenesDisponibles.length && almacenesDisponibles.length > 0}
                        onChange={() => {
                          setAlmacenesSeleccionados(almacenesDisponibles.map(a => a.id));
                        }}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <span className="text-sm font-medium text-gray-700">Seleccionar Todos</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer hover:text-purple-700 transition-colors">
                      <input
                        type="radio"
                        name="almacenes-selection"
                        checked={almacenesSeleccionados.length === 0}
                        onChange={() => {
                          setAlmacenesSeleccionados([]);
                        }}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <span className="text-sm font-medium text-gray-700">Borrar Todos</span>
                    </label>
                  </div>
                </div>
              )}

              <p className="text-sm font-medium text-gray-700">
                Selecciona los almacenes visibles para este usuario:
              </p>
            </div>

            {/* Body scrolleable */}
            <div className="px-8 overflow-y-auto flex-1">
              <div className="space-y-3">
                {almacenesDisponibles.map(almacen => (
                  <label
                    key={almacen.id}
                    className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={almacenesSeleccionados.includes(almacen.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setAlmacenesSeleccionados([...almacenesSeleccionados, almacen.id]);
                        } else {
                          setAlmacenesSeleccionados(almacenesSeleccionados.filter(id => id !== almacen.id));
                        }
                      }}
                      className="w-4 h-4 rounded"
                    />
                    <div>
                      <p className="text-gray-800">
                        <span className="font-medium">{almacen.nombre}</span>
                        <span className="font-normal"> - Alm. {almacen.codigo}</span>
                      </p>
                    </div>
                  </label>
                ))}

                {almacenesDisponibles.length === 0 && (
                  <p className="text-gray-500 text-center py-4">
                    No hay almacenes disponibles
                  </p>
                )}
              </div>
            </div>

            {/* Footer fijo */}
            <div className="p-8 pt-4 border-t border-gray-200">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAmbitoModal(false);
                    setAlmacenesSeleccionados([]);
                    if (ambitoModalMode === 'edit-user') {
                      setSelectedUserAmbito(null);
                    }
                    setTempUserName('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (ambitoModalMode === 'new-user') {
                      handleSaveAmbitosForNewUser();
                    } else {
                      handleSaveAmbitos();
                    }
                  }}
                  className="flex-1 px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors"
                  style={{ backgroundColor: COLOR_PRIMARIO }}
                >
                  {ambitoModalMode === 'new-user' ? 'Confirmar Almacenes' : 'Guardar Cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Confirmación de Eliminación */}
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex flex-col items-center text-center">
              {/* Icono de advertencia */}
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>

              {/* Título */}
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                ¿Eliminar Usuario?
              </h2>

              {/* Mensaje */}
              <p className="text-gray-600 mb-2">
                ¿Estás seguro de que deseas eliminar a
              </p>
              <p className="font-semibold text-gray-800 mb-4">
                {userToDelete.userName}?
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Esta acción no se puede deshacer. El usuario será eliminado permanentemente del sistema.
              </p>

              {/* Botones */}
              <div className="flex gap-3 w-full">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setUserToDelete(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDeleteUser}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
