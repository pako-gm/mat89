import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import {
  Search, Edit2, Trash2, Plus, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, LogOut, Settings, X
} from 'lucide-react';

// Constantes de colores
const COLOR_PRIMARIO = '#91268F';

// Tipos
interface UserProfile {
  id: string;
  user_id: string;
  name: string | null;
  email: string;
  user_role: string;
  status: string;
  created_at: string;
  ambito_almacenes?: string[];
}

interface Almacen {
  id: string;
  nombre: string;
  codigo: string;
}

export default function PanelDeControl() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Estados principales
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);

  // Estados de filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  // Estados de paginación
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Estados de modales
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAmbitoModal, setShowAmbitoModal] = useState(false);

  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [selectedUserAmbito, setSelectedUserAmbito] = useState<UserProfile | null>(null);

  // Estados de formularios
  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    user_role: 'CONSULTAS',
    status: 'PENDIENTE',
    password: ''
  });

  const [almacenesDisponibles, setAlmacenesDisponibles] = useState<Almacen[]>([]);
  const [almacenesSeleccionados, setAlmacenesSeleccionados] = useState<string[]>([]);

  // ============ FUNCIONES DE CARGA DE DATOS ============

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
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
    setCurrentUser(user);

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
    if (selectedUserAmbito) {
      setAlmacenesSeleccionados(selectedUserAmbito.ambito_almacenes || []);
    }
  }, [selectedUserAmbito]);

  // ============ FUNCIONES DE AUTENTICACIÓN ============

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión correctamente",
      });
      navigate('/login');
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cerrar la sesión",
        variant: "destructive",
      });
    }
  };

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

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVO':
      case 'ACTIVE':
        return 'bg-green-500';
      case 'INACTIVO':
      case 'INACTIVE':
        return 'bg-red-500';
      case 'PENDIENTE':
      case 'PENDING':
        return 'bg-gray-400';
      default:
        return 'bg-gray-500';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
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
      setSelectedUsers(filteredUsers.map(u => u.id));
    }
  };

  // ============ FUNCIONES DE FILTRADO ============

  const filteredUsers = users.filter(user => {
    const matchSearch =
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch;
  });

  // ============ FUNCIONES DE PAGINACIÓN ============

  const totalUsers = filteredUsers.length;
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

    if (!newUserData.email || !newUserData.password) {
      toast({
        title: "Error",
        description: "Email y contraseña son obligatorios",
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
          name: newUserData.name || null,
          email: newUserData.email,
          user_role: newUserData.user_role,
          status: newUserData.status
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
        status: 'PENDIENTE',
        password: ''
      });
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
          name: editingUser.name,
        })
        .eq('id', editingUser.id);

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

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (userId === currentUserProfile?.id) {
      toast({
        title: "Acción no permitida",
        description: "No puedes eliminarte a ti mismo",
        variant: "destructive",
      });
      return;
    }

    const confirmDelete = window.confirm(
      `¿Estás seguro de que deseas eliminar a ${userName}? Esta acción no se puede deshacer.`
    );

    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      await fetchUsers();

      toast({
        title: "Usuario eliminado",
        description: `${userName} ha sido eliminado correctamente`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el usuario",
        variant: "destructive",
      });
    }
  };

  const handleChangeStatus = async (userId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ status: newStatus })
        .eq('id', userId);

      if (error) throw error;

      await fetchUsers();

      toast({
        title: "Estado actualizado",
        description: `El estado se cambió a ${newStatus}`,
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
    if (userId === currentUserProfile?.id && newRole !== 'ADMINISTRADOR') {
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
        .eq('id', userId);

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
      const { error } = await supabase
        .from('user_profiles')
        .update({ ambito_almacenes: almacenesSeleccionados })
        .eq('id', selectedUserAmbito.id);

      if (error) throw error;

      await fetchUsers();

      toast({
        title: "Ámbitos actualizados",
        description: "Los almacenes visibles se guardaron correctamente",
      });

      setShowAmbitoModal(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron guardar los ámbitos",
        variant: "destructive",
      });
    }
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
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Izquierda - Botón Add User */}
          <button
            onClick={() => setShowAddUserModal(true)}
            className="flex items-center gap-2 px-6 py-3 text-white rounded-full hover:opacity-90 transition-colors shadow-md"
            style={{ backgroundColor: COLOR_PRIMARIO }}
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">Agregar Usuario</span>
          </button>

          {/* Centro - Búsqueda */}
          <div className="flex items-center gap-4 flex-1 justify-center">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar usuarios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-72 pl-12 pr-4 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-200"
                style={{ borderWidth: '1px', borderColor: COLOR_PRIMARIO }}
              />
            </div>
          </div>

          {/* Derecha - Info sesión */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-gray-600">Sesión iniciada como:</p>
              <p className="font-semibold text-gray-900">
                {currentUser?.email || 'Cargando...'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors shadow-md"
            >
              <LogOut className="w-4 h-4" />
              <span className="font-medium">Cerrar Sesión</span>
            </button>
          </div>
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
                      checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                      onChange={toggleAllUsers}
                      className="w-4 h-4 rounded cursor-pointer"
                    />
                  </th>
                  <th className="py-4 px-6 text-left font-medium">Nombre Completo</th>
                  <th className="py-4 px-6 text-left font-medium">Email</th>
                  <th className="py-4 px-6 text-left font-medium">Estado</th>
                  <th className="py-4 px-6 text-left font-medium">Rol</th>
                  <th className="py-4 px-6 text-left font-medium">Fecha Alta</th>
                  <th className="py-4 px-6 text-left font-medium">Ámbito</th>
                  <th className="py-4 px-6 text-left font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers
                  .slice(startIndex, endIndex)
                  .map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      {/* Checkbox */}
                      <td className="py-4 px-6">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => toggleUserSelection(user.id)}
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
                          value={user.status || 'PENDIENTE'}
                          onChange={(e) => handleChangeStatus(user.id, e.target.value)}
                          className={`${getStatusColor(user.status)} text-white px-4 py-1.5 rounded-full text-sm font-medium cursor-pointer border-none outline-none`}
                        >
                          <option value="ACTIVO" className="bg-white text-gray-800">Activo</option>
                          <option value="INACTIVO" className="bg-white text-gray-800">Inactivo</option>
                          <option value="PENDIENTE" className="bg-white text-gray-800">Pendiente</option>
                        </select>
                      </td>

                      {/* Rol */}
                      <td className="py-4 px-6">
                        <select
                          value={user.user_role || 'CONSULTAS'}
                          onChange={(e) => handleChangeRole(user.id, e.target.value)}
                          className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200 text-gray-700 cursor-pointer"
                        >
                          <option value="ADMINISTRADOR">Administrador</option>
                          <option value="EDICION">Edición</option>
                          <option value="CONSULTAS">Consultas</option>
                        </select>
                      </td>

                      {/* Fecha Alta */}
                      <td className="py-4 px-6 text-gray-600">
                        {formatDate(user.created_at)}
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
                            onClick={() => handleDeleteUser(user.id, user.name || user.email)}
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
                  Nombre completo
                </label>
                <input
                  type="text"
                  value={newUserData.name}
                  onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
                  placeholder="Juan Pérez"
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
                  placeholder="usuario@ejemplo.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={newUserData.password}
                  onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rol
                </label>
                <select
                  value={newUserData.user_role}
                  onChange={(e) => setNewUserData({ ...newUserData, user_role: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
                >
                  <option value="ADMINISTRADOR">Administrador</option>
                  <option value="EDICION">Edición</option>
                  <option value="CONSULTAS">Consultas</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado inicial
                </label>
                <select
                  value={newUserData.status}
                  onChange={(e) => setNewUserData({ ...newUserData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
                >
                  <option value="ACTIVO">Activo</option>
                  <option value="INACTIVO">Inactivo</option>
                  <option value="PENDIENTE">Pendiente</option>
                </select>
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
      {showAmbitoModal && selectedUserAmbito && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-2xl font-bold text-gray-800">
                Gestionar Ámbitos
              </h2>
              <button
                onClick={() => {
                  setShowAmbitoModal(false);
                  setSelectedUserAmbito(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <p className="text-gray-600 mb-6">
              Usuario: <span className="font-semibold">{selectedUserAmbito.name || selectedUserAmbito.email}</span>
            </p>

            <div className="space-y-3 mb-6">
              <p className="text-sm font-medium text-gray-700 mb-3">
                Selecciona los almacenes visibles para este usuario:
              </p>

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
                    <p className="font-medium text-gray-800">{almacen.nombre}</p>
                    <p className="text-sm text-gray-500">Código: {almacen.codigo}</p>
                  </div>
                </label>
              ))}

              {almacenesDisponibles.length === 0 && (
                <p className="text-gray-500 text-center py-4">
                  No hay almacenes disponibles
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowAmbitoModal(false);
                  setSelectedUserAmbito(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveAmbitos}
                className="flex-1 px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors"
                style={{ backgroundColor: COLOR_PRIMARIO }}
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
