import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import {
  Search, Edit2, Trash2, Plus, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, X, AlertTriangle, Warehouse,
  ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';

// Constantes de colores
const COLOR_PRIMARIO = '#91268F';

// Tipos
interface Almacen {
  id: string;
  codigo_alm: string;
  nombre_alm: string;
  created_at?: string;
  updated_at?: string;
}

export default function MaestroAlmacenes() {
  const { toast } = useToast();

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
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [editingAlmacen, setEditingAlmacen] = useState<Almacen | null>(null);
  const [almacenToDelete, setAlmacenToDelete] = useState<{ id: string; nombre: string } | null>(null);

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
          nombre_alm: newAlmacenData.nombre_alm
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

  const handleDeleteAlmacen = (id: string, nombre: string) => {
    setAlmacenToDelete({ id, nombre });
    setShowDeleteModal(true);
  };

  const confirmDeleteAlmacen = async () => {
    if (!almacenToDelete) return;

    try {
      const { error } = await supabase
        .from('tbl_almacenes')
        .delete()
        .eq('id', almacenToDelete.id);

      if (error) throw error;

      await fetchAlmacenes();

      toast({
        title: "Almacén eliminado",
        description: `${almacenToDelete.nombre} ha sido eliminado correctamente`,
      });

      setShowDeleteModal(false);
      setAlmacenToDelete(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el almacén",
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
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
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
                          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white text-sm font-semibold">
                            <Warehouse className="w-5 h-5" />
                          </div>
                          <span className="font-medium text-gray-800">
                            {almacen.codigo_alm}
                          </span>
                        </div>
                      </td>

                      {/* Nombre */}
                      <td className="py-4 px-6 text-gray-600">
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
                          <button
                            onClick={() => handleDeleteAlmacen(almacen.id, almacen.nombre_alm)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar almacén"
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
                  value={newAlmacenData.codigo_alm}
                  onChange={(e) => setNewAlmacenData({ ...newAlmacenData, codigo_alm: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
                  placeholder="Ej: ALM001"
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

      {/* MODAL: Confirmación de Eliminación */}
      {showDeleteModal && almacenToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex flex-col items-center text-center">
              {/* Icono de advertencia */}
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>

              {/* Título */}
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                ¿Eliminar Almacén?
              </h2>

              {/* Mensaje */}
              <p className="text-gray-600 mb-2">
                ¿Estás seguro de que deseas eliminar el almacén
              </p>
              <p className="font-semibold text-gray-800 mb-4">
                {almacenToDelete.nombre}?
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Esta acción no se puede deshacer. El almacén será eliminado permanentemente del sistema.
              </p>

              {/* Botones */}
              <div className="flex gap-3 w-full">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setAlmacenToDelete(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDeleteAlmacen}
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
