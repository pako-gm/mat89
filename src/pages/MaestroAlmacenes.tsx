import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/useUserProfile';
import {
  Search, Edit2, Trash2, Plus, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, X, Warehouse, User, ArrowLeft,
  ArrowUpDown, ArrowUp, ArrowDown, Ban, CheckCircle
} from 'lucide-react';

// Constantes de colores
const COLOR_PRIMARIO = '#91268F';

// Tipos
interface Almacen {
  id: string;
  codigo_alm: string;
  nombre_alm: string;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

export default function MaestroAlmacenes() {
  const { toast } = useToast();
  const { isAdmin } = useUserProfile();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Parámetros de URL para gestión de ámbitos de usuario
  const userIdFromUrl = searchParams.get('userId');
  const userNameFromUrl = searchParams.get('userName');

  // Estados principales
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAlmacenes, setSelectedAlmacenes] = useState<string[]>([]);

  // Estados de ordenamiento
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>('asc');
  const [sortColumn, setSortColumn] = useState<'codigo' | 'nombre'>('codigo');

  // Estados de paginación
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Estados de modales
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAmbitoModal, setShowAmbitoModal] = useState(false);

  const [editingAlmacen, setEditingAlmacen] = useState<Almacen | null>(null);

  // Estados para gestión de ámbitos de usuario
  const [userAmbitosSeleccionados, setUserAmbitosSeleccionados] = useState<string[]>([]);
  const [loadingUserAmbitos, setLoadingUserAmbitos] = useState(false);

  // Estados de formularios
  const [newAlmacenData, setNewAlmacenData] = useState({
    codigo_alm: '',
    nombre_alm: ''
  });

  // ============ FUNCIONES DE CARGA DE DATOS ============

  const fetchAlmacenes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tbl_almacenes')
        .select('*')
        .order('codigo_alm', { ascending: true });

      if (error) throw error;

      setAlmacenes(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los almacenes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlmacenes();
  }, []);

  // Cargar ámbitos del usuario cuando viene desde Panel de Control
  useEffect(() => {
    const loadUserAmbitos = async () => {
      if (userIdFromUrl) {
        setLoadingUserAmbitos(true);
        try {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('ambito_almacenes')
            .eq('user_id', userIdFromUrl)
            .maybeSingle();

          if (error) throw error;

          const ambitos = Array.isArray(data?.ambito_almacenes)
            ? data.ambito_almacenes
            : [];
          setUserAmbitosSeleccionados(ambitos);
          setShowAmbitoModal(true);
        } catch (error: any) {
          console.error('Error cargando ámbitos del usuario:', error);
          toast({
            title: "Error",
            description: "No se pudieron cargar los almacenes del usuario",
            variant: "destructive",
          });
        } finally {
          setLoadingUserAmbitos(false);
        }
      }
    };

    loadUserAmbitos();
  }, [userIdFromUrl]);

  // ============ FUNCIONES DE GESTIÓN DE ÁMBITOS DE USUARIO ============

  const handleSaveUserAmbitos = async () => {
    if (!userIdFromUrl) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ ambito_almacenes: userAmbitosSeleccionados })
        .eq('user_id', userIdFromUrl);

      if (error) throw error;

      toast({
        title: "Ámbitos actualizados",
        description: `${userAmbitosSeleccionados.length} almacenes asignados a ${userNameFromUrl}`,
      });

      // Cerrar modal y volver al panel de control
      setShowAmbitoModal(false);
      navigate('/panel-control');
    } catch (error: any) {
      console.error('Error guardando ámbitos:', error);
      toast({
        title: "Error al guardar",
        description: error.message || "No se pudieron guardar los almacenes asignados",
        variant: "destructive",
      });
    }
  };

  const handleCancelUserAmbitos = () => {
    setShowAmbitoModal(false);
    setUserAmbitosSeleccionados([]);
    navigate('/panel-control');
  };

  const toggleUserAmbitoSelection = (almacenId: string) => {
    setUserAmbitosSeleccionados(prev =>
      prev.includes(almacenId)
        ? prev.filter(id => id !== almacenId)
        : [...prev, almacenId]
    );
  };

  const selectAllAmbitos = () => {
    // Solo seleccionar almacenes activos
    const activeAlmacenIds = almacenes.filter(a => a.activo).map(a => a.id);
    setUserAmbitosSeleccionados(activeAlmacenIds);
  };

  const clearAllAmbitos = () => {
    setUserAmbitosSeleccionados([]);
  };

  // ============ FUNCIONES DE SELECCIÓN ============

  const toggleAlmacenSelection = (id: string) => {
    setSelectedAlmacenes(prev =>
      prev.includes(id)
        ? prev.filter(almId => almId !== id)
        : [...prev, id]
    );
  };

  const toggleAllAlmacenes = () => {
    if (selectedAlmacenes.length === filteredAlmacenes.length) {
      setSelectedAlmacenes([]);
    } else {
      setSelectedAlmacenes(filteredAlmacenes.map(a => a.id));
    }
  };

  // ============ FUNCIONES DE FILTRADO ============

  const filteredAlmacenes = almacenes.filter(almacen => {
    const matchSearch =
      almacen.codigo_alm?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      almacen.nombre_alm?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchSearch;
  });

  // ============ FUNCIONES DE ORDENAMIENTO ============

  const toggleSortOrder = (column: 'codigo' | 'nombre') => {
    if (sortColumn !== column) {
      setSortColumn(column);
      setSortOrder('asc');
    } else {
      if (sortOrder === null) {
        setSortOrder('asc');
      } else if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else {
        setSortOrder(null);
      }
    }
  };

  const sortedAlmacenes = [...filteredAlmacenes].sort((a, b) => {
    if (sortOrder === null) return 0;

    let valueA = '';
    let valueB = '';

    if (sortColumn === 'codigo') {
      valueA = (a.codigo_alm || '').toLowerCase();
      valueB = (b.codigo_alm || '').toLowerCase();
    } else if (sortColumn === 'nombre') {
      valueA = (a.nombre_alm || '').toLowerCase();
      valueB = (b.nombre_alm || '').toLowerCase();
    }

    if (sortOrder === 'asc') {
      return valueA.localeCompare(valueB);
    } else {
      return valueB.localeCompare(valueA);
    }
  });

  const clearFilters = () => {
    setSearchTerm('');
    setSortOrder('asc');
    setSortColumn('codigo');
  };

  // ============ FUNCIONES DE PAGINACIÓN ============

  const totalAlmacenes = sortedAlmacenes.length;
  const totalPages = Math.ceil(totalAlmacenes / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalAlmacenes);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToFirstPage = () => goToPage(1);
  const goToLastPage = () => goToPage(totalPages);
  const goToPrevPage = () => goToPage(currentPage - 1);
  const goToNextPage = () => goToPage(currentPage + 1);

  // ============ FUNCIONES CRUD ============

  const handleAddAlmacen = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newAlmacenData.codigo_alm || !newAlmacenData.nombre_alm) {
      toast({
        title: "Error",
        description: "Código y nombre son obligatorios",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('tbl_almacenes')
        .insert([{
          codigo_alm: newAlmacenData.codigo_alm.toUpperCase(),
          nombre_alm: newAlmacenData.nombre_alm,
          activo: true
        }]);

      if (error) throw error;

      await fetchAlmacenes();

      toast({
        title: "Almacén creado",
        description: `${newAlmacenData.codigo_alm} ha sido agregado correctamente`,
      });

      setNewAlmacenData({
        codigo_alm: '',
        nombre_alm: ''
      });
      setShowAddModal(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el almacén",
        variant: "destructive",
      });
    }
  };

  const handleUpdateAlmacen = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingAlmacen) return;

    if (!editingAlmacen.codigo_alm || !editingAlmacen.nombre_alm) {
      toast({
        title: "Error",
        description: "Código y nombre son obligatorios",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('tbl_almacenes')
        .update({
          codigo_alm: editingAlmacen.codigo_alm.toUpperCase(),
          nombre_alm: editingAlmacen.nombre_alm
        })
        .eq('id', editingAlmacen.id);

      if (error) throw error;

      await fetchAlmacenes();

      toast({
        title: "Almacén actualizado",
        description: "Los cambios se guardaron correctamente",
      });

      setShowEditModal(false);
      setEditingAlmacen(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el almacén",
        variant: "destructive",
      });
    }
  };

  const toggleActivoAlmacen = async (almacen: Almacen) => {
    if (!isAdmin) {
      toast({
        title: "Sin permisos",
        description: "Solo los administradores pueden habilitar/deshabilitar almacenes",
        variant: "destructive",
      });
      return;
    }

    try {
      const nuevoEstado = !almacen.activo;
      const { error } = await supabase
        .from('tbl_almacenes')
        .update({ activo: nuevoEstado })
        .eq('id', almacen.id);

      if (error) throw error;

      await fetchAlmacenes();

      toast({
        title: nuevoEstado ? "Almacén habilitado" : "Almacén deshabilitado",
        description: nuevoEstado
          ? `${almacen.codigo_alm} ahora aparecerá en el selector de pedidos`
          : `${almacen.codigo_alm} ya no aparecerá en el selector de nuevos pedidos`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo cambiar el estado del almacén",
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
            Maestro de Almacenes
          </h1>
          <p className="text-gray-600 text-lg mt-2">
            Gestión del catálogo de almacenes del sistema
          </p>
        </div>
      </div>

      {/* Barra de filtros y búsqueda */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <div className="flex items-center gap-4 w-full">
          {/* Botón Add Almacén */}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-6 py-3 text-white rounded-full hover:opacity-90 transition-colors shadow-md"
            style={{ backgroundColor: COLOR_PRIMARIO }}
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">Agregar Almacén</span>
          </button>

          {/* Búsqueda */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar almacenes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-200"
              style={{ borderWidth: '1px', borderColor: COLOR_PRIMARIO }}
            />
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
                      checked={selectedAlmacenes.length === sortedAlmacenes.length && sortedAlmacenes.length > 0}
                      onChange={toggleAllAlmacenes}
                      className="w-4 h-4 rounded cursor-pointer"
                    />
                  </th>
                  <th className="py-4 px-6 text-left font-medium">
                    <button
                      onClick={() => toggleSortOrder('codigo')}
                      className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                      title="Ordenar por código"
                    >
                      <span>Código</span>
                      {sortColumn === 'codigo' && sortOrder === null && <ArrowUpDown className="w-4 h-4" />}
                      {sortColumn === 'codigo' && sortOrder === 'asc' && <ArrowUp className="w-4 h-4" />}
                      {sortColumn === 'codigo' && sortOrder === 'desc' && <ArrowDown className="w-4 h-4" />}
                      {sortColumn !== 'codigo' && <ArrowUpDown className="w-4 h-4 opacity-30" />}
                    </button>
                  </th>
                  <th className="py-4 px-6 text-left font-medium">
                    <button
                      onClick={() => toggleSortOrder('nombre')}
                      className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                      title="Ordenar por nombre"
                    >
                      <span>Nombre</span>
                      {sortColumn === 'nombre' && sortOrder === null && <ArrowUpDown className="w-4 h-4" />}
                      {sortColumn === 'nombre' && sortOrder === 'asc' && <ArrowUp className="w-4 h-4" />}
                      {sortColumn === 'nombre' && sortOrder === 'desc' && <ArrowDown className="w-4 h-4" />}
                      {sortColumn !== 'nombre' && <ArrowUpDown className="w-4 h-4 opacity-30" />}
                    </button>
                  </th>
                  <th className="py-4 px-6 text-left font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sortedAlmacenes
                  .slice(startIndex, endIndex)
                  .map((almacen) => (
                    <tr
                      key={almacen.id}
                      className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${!almacen.activo ? 'bg-gray-100 opacity-60' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="py-4 px-6">
                        <input
                          type="checkbox"
                          checked={selectedAlmacenes.includes(almacen.id)}
                          onChange={() => toggleAlmacenSelection(almacen.id)}
                          className="w-4 h-4 rounded cursor-pointer"
                        />
                      </td>

                      {/* Código con icono */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold ${almacen.activo ? 'bg-slate-700' : 'bg-gray-400'}`}>
                            <Warehouse className="w-5 h-5" />
                          </div>
                          <div className="flex flex-col">
                            <span className={`font-medium ${almacen.activo ? 'text-gray-800' : 'text-gray-500'}`}>
                              {almacen.codigo_alm}
                            </span>
                            {!almacen.activo && (
                              <span className="text-xs text-red-500 font-medium">
                                (Deshabilitado)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Nombre */}
                      <td className={`py-4 px-6 ${almacen.activo ? 'text-gray-600' : 'text-gray-400'}`}>
                        {almacen.nombre_alm}
                      </td>

                      {/* Acciones */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingAlmacen(almacen);
                              setShowEditModal(true);
                            }}
                            className="p-2 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Editar almacén"
                          >
                            <Edit2 className="w-4 h-4 text-gray-600" />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => toggleActivoAlmacen(almacen)}
                              className={`p-2 rounded-lg transition-colors ${almacen.activo ? 'hover:bg-orange-50' : 'hover:bg-green-50'}`}
                              title={almacen.activo ? 'Deshabilitar almacén' : 'Habilitar almacén'}
                            >
                              {almacen.activo ? (
                                <Ban className="w-4 h-4 text-orange-500" />
                              ) : (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              )}
                            </button>
                          )}
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
                  {startIndex + 1}-{endIndex} de {totalAlmacenes}
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

      {/* MODAL: Agregar Almacén */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Agregar Nuevo Almacén
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleAddAlmacen} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={3}
                  pattern="[0-9]{1,3}"
                  inputMode="numeric"
                  value={newAlmacenData.codigo_alm}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 3);
                    setNewAlmacenData({ ...newAlmacenData, codigo_alm: value });
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
                  placeholder="Ej: 141"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newAlmacenData.nombre_alm}
                  onChange={(e) => setNewAlmacenData({ ...newAlmacenData, nombre_alm: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
                  placeholder="Nombre del almacén"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors"
                  style={{ backgroundColor: COLOR_PRIMARIO }}
                >
                  Crear Almacén
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Editar Almacén */}
      {showEditModal && editingAlmacen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Editar Almacén
              </h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingAlmacen(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleUpdateAlmacen} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingAlmacen.codigo_alm || ''}
                  onChange={(e) => setEditingAlmacen({ ...editingAlmacen, codigo_alm: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingAlmacen.nombre_alm || ''}
                  onChange={(e) => setEditingAlmacen({ ...editingAlmacen, nombre_alm: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingAlmacen(null);
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

      {/* MODAL: Gestionar Ámbitos de Usuario */}
      {showAmbitoModal && userIdFromUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full mx-4 shadow-2xl max-h-[85vh] flex flex-col">
            {/* Header fijo */}
            <div className="p-6 pb-4 border-b border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                    style={{ backgroundColor: COLOR_PRIMARIO }}
                  >
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">
                      Gestionar Almacenes
                    </h2>
                    <p className="text-sm text-gray-600">
                      {userNameFromUrl}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCancelUserAmbitos}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Opciones de selección rápida */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer hover:text-purple-700 transition-colors">
                  <input
                    type="radio"
                    name="ambitos-selection"
                    checked={userAmbitosSeleccionados.length === almacenes.filter(a => a.activo).length && almacenes.filter(a => a.activo).length > 0}
                    onChange={selectAllAmbitos}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <span className="text-sm font-medium text-gray-700">Seleccionar Todos (activos)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:text-purple-700 transition-colors">
                  <input
                    type="radio"
                    name="ambitos-selection"
                    checked={userAmbitosSeleccionados.length === 0}
                    onChange={clearAllAmbitos}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <span className="text-sm font-medium text-gray-700">Borrar Todos</span>
                </label>
              </div>
            </div>

            {/* Body scrolleable */}
            <div className="px-6 py-4 overflow-y-auto flex-1">
              {loadingUserAmbitos ? (
                <div className="flex justify-center items-center py-8">
                  <div
                    className="animate-spin rounded-full h-8 w-8 border-b-2"
                    style={{ borderColor: COLOR_PRIMARIO }}
                  ></div>
                </div>
              ) : (
                <div className="space-y-2">
                  {almacenes.map(almacen => (
                    <label
                      key={almacen.id}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                        !almacen.activo
                          ? 'bg-gray-50 border-gray-200 opacity-60'
                          : userAmbitosSeleccionados.includes(almacen.id)
                            ? 'border-purple-400 bg-purple-50'
                            : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={userAmbitosSeleccionados.includes(almacen.id)}
                        onChange={() => toggleUserAmbitoSelection(almacen.id)}
                        disabled={!almacen.activo}
                        className="w-4 h-4 rounded cursor-pointer disabled:cursor-not-allowed"
                      />
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold ${almacen.activo ? 'bg-slate-700' : 'bg-gray-400'}`}>
                        <Warehouse className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${almacen.activo ? 'text-gray-800' : 'text-gray-500'}`}>
                            {almacen.nombre_alm}
                          </span>
                          <span className={`text-sm ${almacen.activo ? 'text-gray-500' : 'text-gray-400'}`}>
                            - Alm. {almacen.codigo_alm}
                          </span>
                        </div>
                        {!almacen.activo && (
                          <span className="text-xs text-red-500 font-medium flex items-center gap-1 mt-0.5">
                            <Ban className="w-3 h-3" />
                            Deshabilitado - No disponible para nuevos pedidos
                          </span>
                        )}
                      </div>
                    </label>
                  ))}

                  {almacenes.length === 0 && (
                    <p className="text-gray-500 text-center py-4">
                      No hay almacenes disponibles
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Footer fijo con información y botones */}
            <div className="p-6 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-600">
                  {userAmbitosSeleccionados.length} de {almacenes.filter(a => a.activo).length} almacenes activos seleccionados
                </span>
                <button
                  onClick={() => navigate('/panel-control')}
                  className="text-sm text-purple-600 hover:text-purple-800 flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Volver sin guardar
                </button>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCancelUserAmbitos}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveUserAmbitos}
                  className="flex-1 px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors"
                  style={{ backgroundColor: COLOR_PRIMARIO }}
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
