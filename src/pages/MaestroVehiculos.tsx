import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import {
  Search, Edit2, Trash2, Plus, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, X, AlertTriangle, Train,
  ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';

// Constantes de colores
const COLOR_PRIMARIO = '#91268F';

// Tipos
interface Vehiculo {
  id: string;
  codigo_vehiculo: string;
  nombre_vehiculo: string;
  created_at?: string;
  updated_at?: string;
}

export default function MaestroVehiculos() {
  const { toast } = useToast();

  // Estados principales
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehiculos, setSelectedVehiculos] = useState<string[]>([]);

  // Estados de ordenamiento
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>('asc');
  const [sortColumn, setSortColumn] = useState<'codigo' | 'nombre'>('codigo');

  // Estados de paginación
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Estados de modales
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [editingVehiculo, setEditingVehiculo] = useState<Vehiculo | null>(null);
  const [vehiculoToDelete, setVehiculoToDelete] = useState<{ id: string; nombre: string } | null>(null);

  // Estados de formularios
  const [newVehiculoData, setNewVehiculoData] = useState({
    codigo_vehiculo: '',
    nombre_vehiculo: ''
  });

  // ============ FUNCIONES DE CARGA DE DATOS ============

  const fetchVehiculos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tbl_vehiculos')
        .select('*')
        .order('codigo_vehiculo', { ascending: true });

      if (error) throw error;

      setVehiculos(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los vehículos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehiculos();
  }, []);

  // ============ FUNCIONES DE SELECCIÓN ============

  const toggleVehiculoSelection = (id: string) => {
    setSelectedVehiculos(prev =>
      prev.includes(id)
        ? prev.filter(vehId => vehId !== id)
        : [...prev, id]
    );
  };

  const toggleAllVehiculos = () => {
    if (selectedVehiculos.length === filteredVehiculos.length) {
      setSelectedVehiculos([]);
    } else {
      setSelectedVehiculos(filteredVehiculos.map(v => v.id));
    }
  };

  // ============ FUNCIONES DE FILTRADO ============

  const filteredVehiculos = vehiculos.filter(vehiculo => {
    const matchSearch =
      vehiculo.codigo_vehiculo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehiculo.nombre_vehiculo?.toLowerCase().includes(searchTerm.toLowerCase());

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

  const sortedVehiculos = [...filteredVehiculos].sort((a, b) => {
    if (sortOrder === null) return 0;

    let valueA = '';
    let valueB = '';

    if (sortColumn === 'codigo') {
      valueA = (a.codigo_vehiculo || '').toLowerCase();
      valueB = (b.codigo_vehiculo || '').toLowerCase();
    } else if (sortColumn === 'nombre') {
      valueA = (a.nombre_vehiculo || '').toLowerCase();
      valueB = (b.nombre_vehiculo || '').toLowerCase();
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

  const totalVehiculos = sortedVehiculos.length;
  const totalPages = Math.ceil(totalVehiculos / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalVehiculos);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToFirstPage = () => goToPage(1);
  const goToLastPage = () => goToPage(totalPages);
  const goToPrevPage = () => goToPage(currentPage - 1);
  const goToNextPage = () => goToPage(currentPage + 1);

  // ============ FUNCIONES CRUD ============

  const handleAddVehiculo = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newVehiculoData.codigo_vehiculo) {
      toast({
        title: "Error",
        description: "El código es obligatorio",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('tbl_vehiculos')
        .insert([{
          codigo_vehiculo: newVehiculoData.codigo_vehiculo.toUpperCase(),
          nombre_vehiculo: newVehiculoData.nombre_vehiculo || null
        }]);

      if (error) throw error;

      await fetchVehiculos();

      toast({
        title: "Vehículo creado",
        description: `${newVehiculoData.codigo_vehiculo} ha sido agregado correctamente`,
      });

      setNewVehiculoData({
        codigo_vehiculo: '',
        nombre_vehiculo: ''
      });
      setShowAddModal(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el vehículo",
        variant: "destructive",
      });
    }
  };

  const handleUpdateVehiculo = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingVehiculo) return;

    if (!editingVehiculo.codigo_vehiculo) {
      toast({
        title: "Error",
        description: "El código es obligatorio",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('tbl_vehiculos')
        .update({
          codigo_vehiculo: editingVehiculo.codigo_vehiculo.toUpperCase(),
          nombre_vehiculo: editingVehiculo.nombre_vehiculo || null
        })
        .eq('id', editingVehiculo.id);

      if (error) throw error;

      await fetchVehiculos();

      toast({
        title: "Vehículo actualizado",
        description: "Los cambios se guardaron correctamente",
      });

      setShowEditModal(false);
      setEditingVehiculo(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el vehículo",
        variant: "destructive",
      });
    }
  };

  const handleDeleteVehiculo = (id: string, nombre: string) => {
    setVehiculoToDelete({ id, nombre });
    setShowDeleteModal(true);
  };

  const confirmDeleteVehiculo = async () => {
    if (!vehiculoToDelete) return;

    try {
      const { error } = await supabase
        .from('tbl_vehiculos')
        .delete()
        .eq('id', vehiculoToDelete.id);

      if (error) throw error;

      await fetchVehiculos();

      toast({
        title: "Vehículo eliminado",
        description: `${vehiculoToDelete.nombre} ha sido eliminado correctamente`,
      });

      setShowDeleteModal(false);
      setVehiculoToDelete(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el vehículo",
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
            Maestro de Vehículos
          </h1>
          <p className="text-gray-600 text-lg mt-2">
            Gestión del catálogo de series de vehículos del sistema
          </p>
        </div>
      </div>

      {/* Barra de filtros y búsqueda */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <div className="flex items-center gap-4 w-full">
          {/* Botón Add Vehículo */}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-6 py-3 text-white rounded-full hover:opacity-90 transition-colors shadow-md"
            style={{ backgroundColor: COLOR_PRIMARIO }}
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">Agregar Vehículo</span>
          </button>

          {/* Búsqueda */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar vehículos..."
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
                      checked={selectedVehiculos.length === sortedVehiculos.length && sortedVehiculos.length > 0}
                      onChange={toggleAllVehiculos}
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
                {sortedVehiculos
                  .slice(startIndex, endIndex)
                  .map((vehiculo) => (
                    <tr
                      key={vehiculo.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      {/* Checkbox */}
                      <td className="py-4 px-6">
                        <input
                          type="checkbox"
                          checked={selectedVehiculos.includes(vehiculo.id)}
                          onChange={() => toggleVehiculoSelection(vehiculo.id)}
                          className="w-4 h-4 rounded cursor-pointer"
                        />
                      </td>

                      {/* Código con icono */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white text-sm font-semibold">
                            <Train className="w-5 h-5" />
                          </div>
                          <span className="font-medium text-gray-800">
                            {vehiculo.codigo_vehiculo}
                          </span>
                        </div>
                      </td>

                      {/* Nombre */}
                      <td className="py-4 px-6 text-gray-600">
                        {vehiculo.nombre_vehiculo || <span className="text-gray-400 italic">Sin nombre</span>}
                      </td>

                      {/* Acciones */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingVehiculo(vehiculo);
                              setShowEditModal(true);
                            }}
                            className="p-2 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Editar vehículo"
                          >
                            <Edit2 className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => handleDeleteVehiculo(vehiculo.id, vehiculo.nombre_vehiculo || vehiculo.codigo_vehiculo)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar vehículo"
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
                  {startIndex + 1}-{endIndex} de {totalVehiculos}
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

      {/* MODAL: Agregar Vehículo */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Agregar Nuevo Vehículo
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleAddVehiculo} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newVehiculoData.codigo_vehiculo}
                  onChange={(e) => setNewVehiculoData({ ...newVehiculoData, codigo_vehiculo: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
                  placeholder="Ej: 252"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre
                </label>
                <input
                  type="text"
                  value={newVehiculoData.nombre_vehiculo}
                  onChange={(e) => setNewVehiculoData({ ...newVehiculoData, nombre_vehiculo: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
                  placeholder="Nombre del vehículo (opcional)"
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
                  Crear Vehículo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Editar Vehículo */}
      {showEditModal && editingVehiculo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Editar Vehículo
              </h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingVehiculo(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleUpdateVehiculo} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingVehiculo.codigo_vehiculo || ''}
                  onChange={(e) => setEditingVehiculo({ ...editingVehiculo, codigo_vehiculo: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre
                </label>
                <input
                  type="text"
                  value={editingVehiculo.nombre_vehiculo || ''}
                  onChange={(e) => setEditingVehiculo({ ...editingVehiculo, nombre_vehiculo: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingVehiculo(null);
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

      {/* MODAL: Confirmación de Eliminación */}
      {showDeleteModal && vehiculoToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex flex-col items-center text-center">
              {/* Icono de advertencia */}
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>

              {/* Título */}
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                ¿Eliminar Vehículo?
              </h2>

              {/* Mensaje */}
              <p className="text-gray-600 mb-2">
                ¿Estás seguro de que deseas eliminar el vehículo
              </p>
              <p className="font-semibold text-gray-800 mb-4">
                {vehiculoToDelete.nombre}?
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Esta acción no se puede deshacer. El vehículo será eliminado permanentemente del sistema.
              </p>

              {/* Botones */}
              <div className="flex gap-3 w-full">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setVehiculoToDelete(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDeleteVehiculo}
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
