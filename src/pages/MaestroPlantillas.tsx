import { useState, useEffect, useMemo } from 'react';
import { Plus, Pencil, Trash2, Copy, Settings, Search, X, Calendar, User, Package, ArrowUpDown } from 'lucide-react';
import { MaterialCombobox } from '../components/ui/material-combobox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useToast } from '../hooks/use-toast';
import { useUserProfile } from '../hooks/useUserProfile';
import {
  getTiposRevision,
  createTipoRevision,
  updateTipoRevision,
  deleteTipoRevision,
  getAllPlantillas,
  getPlantillaHistorial,
  createPlantilla,
  updatePlantillaNombre,
  updatePlantillaMateriales,
  updateMaterialTipoRevision,
  deletePlantillaMaterial,
  deletePlantilla,
  duplicarPlantilla,
  getAllMaterials,
  getVehiculos,
  saveMaterial,
} from '../lib/data';
import type {
  PlantillaWithMaterials,
  PlantillaMaterial,
  PlantillaHistorial,
  TipoRevision,
  Material,
  Vehiculo,
} from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function MaestroPlantillas() {
  const { toast } = useToast();
  const { userProfile } = useUserProfile();

  // ============================================================
  // STATE: Datos principales
  // ============================================================
  const [plantillas, setPlantillas] = useState<PlantillaWithMaterials[]>([]);
  const [tiposRevision, setTiposRevision] = useState<TipoRevision[]>([]);
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState<PlantillaWithMaterials | null>(null);
  const [historial, setHistorial] = useState<PlantillaHistorial[]>([]);

  // ============================================================
  // STATE: Filtros y búsqueda
  // ============================================================
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroSerie, setFiltroSerie] = useState<string>('TODAS');
  const [filtroCreador, setFiltroCreador] = useState<string>('TODOS');

  // ============================================================
  // STATE: Modales
  // ============================================================
  const [modalNuevaPlantilla, setModalNuevaPlantilla] = useState(false);
  const [modalModificarNombre, setModalModificarNombre] = useState(false);
  const [modalGestionarTipos, setModalGestionarTipos] = useState(false);
  const [modalAñadirTipo, setModalAñadirTipo] = useState(false);
  const [modalEditarTipo, setModalEditarTipo] = useState(false);
  const [modalDuplicar, setModalDuplicar] = useState(false);
  const [alertEliminarPlantilla, setAlertEliminarPlantilla] = useState(false);
  const [alertEliminarMaterial, setAlertEliminarMaterial] = useState(false);
  const [alertEliminarTipo, setAlertEliminarTipo] = useState(false);

  // ============================================================
  // STATE: Formularios
  // ============================================================
  const [formNuevaPlantilla, setFormNuevaPlantilla] = useState({
    tipoIntervencion: '',
    serieVehiculo: '',
    materialesSeleccionados: [] as Array<{ materialId: string; cantidad: number; tipoRevisionId: string }>,
  });
  const [formModificarNombre, setFormModificarNombre] = useState('');
  const [formDuplicar, setFormDuplicar] = useState('');
  const [formNuevoTipo, setFormNuevoTipo] = useState({ codigo: '', descripcion: '' });
  const [formEditarTipo, setFormEditarTipo] = useState({ id: '', codigo: '', descripcion: '' });

  // ============================================================
  // STATE: Añadir material a plantilla existente
  // ============================================================
  const [modalAñadirMaterial, setModalAñadirMaterial] = useState(false);
  const [formAñadirMaterial, setFormAñadirMaterial] = useState({
    materialId: '',
    cantidad: 1,
    tipoRevisionId: '',
  });

  // ============================================================
  // STATE: Crear nuevo material desde plantilla
  // ============================================================
  const [modalNuevoMaterial, setModalNuevoMaterial] = useState(false);
  const [formNuevoMaterial, setFormNuevoMaterial] = useState({
    matricula: '',
    descripcion: '',
    serieVehiculo: '',
    infoAdicional: '',
  });

  // ============================================================
  // STATE: Auxiliares
  // ============================================================
  const [materialAEliminar, setMaterialAEliminar] = useState<PlantillaMaterial | null>(null);
  const [tipoAEliminar, setTipoAEliminar] = useState<TipoRevision | null>(null);
  const [loading, setLoading] = useState(false);

  // ============================================================
  // STATE: Ordenación de materiales
  // ============================================================
  const [sortColumn, setSortColumn] = useState<'matricula' | 'descripcion' | null>('descripcion');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // ============================================================
  // EFFECTS: Carga inicial de datos
  // ============================================================
  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    if (plantillaSeleccionada) {
      cargarHistorial(plantillaSeleccionada.id);
    }
  }, [plantillaSeleccionada]);

  // ============================================================
  // FUNCIÓN: Cargar datos principales
  // ============================================================
  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [plantillasData, tiposData, materialesData, vehiculosData] = await Promise.all([
        getAllPlantillas(),
        getTiposRevision(),
        getAllMaterials(),
        getVehiculos(),
      ]);
      setPlantillas(plantillasData);
      setTiposRevision(tiposData.filter((t: TipoRevision) => t.activo));
      setMateriales(materialesData);
      setVehiculos(vehiculosData);
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos del maestro de plantillas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const cargarHistorial = async (plantillaId: string) => {
    try {
      const historialData = await getPlantillaHistorial(plantillaId);
      setHistorial(historialData);
    } catch (error) {
      console.error('Error cargando historial:', error);
    }
  };

  // ============================================================
  // HANDLERS: Nueva Plantilla
  // ============================================================
  const abrirModalNuevaPlantilla = () => {
    setFormNuevaPlantilla({
      tipoIntervencion: '',
      serieVehiculo: '',
      materialesSeleccionados: [],
    });
    setModalNuevaPlantilla(true);
  };

  const handleCrearPlantilla = async () => {
    if (!formNuevaPlantilla.tipoIntervencion) {
      toast({
        title: 'Error',
        description: 'Debe seleccionar un tipo de intervención',
        variant: 'destructive',
      });
      return;
    }

    if (!formNuevaPlantilla.serieVehiculo) {
      toast({
        title: 'Error',
        description: 'Debe seleccionar una serie de vehículo',
        variant: 'destructive',
      });
      return;
    }

    if (formNuevaPlantilla.materialesSeleccionados.length === 0) {
      toast({
        title: 'Error',
        description: 'Debe añadir al menos un material a la plantilla',
        variant: 'destructive',
      });
      return;
    }

    // Validar que todos los materiales sean de la misma serie
    const serieSeleccionada = formNuevaPlantilla.serieVehiculo;
    const materialesInvalidos = formNuevaPlantilla.materialesSeleccionados.filter((ms) => {
      const material = materiales.find((m) => m.id === ms.materialId);
      return material?.vehicleSeries !== serieSeleccionada;
    });

    if (materialesInvalidos.length > 0) {
      toast({
        title: 'Error de validación',
        description: 'Todos los materiales deben ser de la serie de vehículo seleccionada',
        variant: 'destructive',
      });
      return;
    }

    // Generar el nombre automáticamente
    const tipoSeleccionado = tiposRevision.find((t) => t.id === formNuevaPlantilla.tipoIntervencion);
    const nombreGenerado = `Intervencion ${tipoSeleccionado?.codigo || 'Sin tipo'} - Serie ${formNuevaPlantilla.serieVehiculo}`;

    setLoading(true);
    try {
      await createPlantilla(
        nombreGenerado,
        formNuevaPlantilla.serieVehiculo,
        formNuevaPlantilla.materialesSeleccionados
      );
      toast({
        title: 'Plantilla creada',
        description: 'La plantilla se ha creado exitosamente',
      });
      setModalNuevaPlantilla(false);
      await cargarDatos();
    } catch (error: any) {
      console.error('Error creando plantilla:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear la plantilla',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const añadirMaterialAFormulario = () => {
    if (!formAñadirMaterial.materialId || !formAñadirMaterial.tipoRevisionId) {
      toast({
        title: 'Error',
        description: 'Debe seleccionar un material y un tipo de revisión',
        variant: 'destructive',
      });
      return;
    }

    // Validar serie si ya hay materiales seleccionados
    if (formNuevaPlantilla.materialesSeleccionados.length > 0 && formNuevaPlantilla.serieVehiculo) {
      const material = materiales.find((m) => m.id === formAñadirMaterial.materialId);
      if (material?.vehicleSeries !== formNuevaPlantilla.serieVehiculo) {
        toast({
          title: 'Error de serie',
          description: `El material debe ser de la serie ${formNuevaPlantilla.serieVehiculo}`,
          variant: 'destructive',
        });
        return;
      }
    }

    // Verificar que el material no esté ya añadido
    const yaExiste = formNuevaPlantilla.materialesSeleccionados.some(
      (ms) => ms.materialId === formAñadirMaterial.materialId
    );
    if (yaExiste) {
      toast({
        title: 'Material duplicado',
        description: 'Este material ya está en la plantilla',
        variant: 'destructive',
      });
      return;
    }

    setFormNuevaPlantilla({
      ...formNuevaPlantilla,
      materialesSeleccionados: [
        ...formNuevaPlantilla.materialesSeleccionados,
        {
          materialId: formAñadirMaterial.materialId,
          cantidad: formAñadirMaterial.cantidad,
          tipoRevisionId: formAñadirMaterial.tipoRevisionId,
        },
      ],
    });

    // Resetear formulario de añadir material (mantener tipoRevisionId heredado)
    setFormAñadirMaterial({
      materialId: '',
      cantidad: 1,
      tipoRevisionId: formNuevaPlantilla.tipoIntervencion,
    });

    toast({
      title: 'Material añadido',
      description: 'Material añadido al formulario de nueva plantilla',
    });
  };

  const quitarMaterialDeFormulario = (materialId: string) => {
    setFormNuevaPlantilla({
      ...formNuevaPlantilla,
      materialesSeleccionados: formNuevaPlantilla.materialesSeleccionados.filter(
        (ms) => ms.materialId !== materialId
      ),
    });
  };

  // ============================================================
  // HANDLERS: Modificar Nombre
  // ============================================================
  const abrirModalModificarNombre = () => {
    if (!plantillaSeleccionada) return;
    setFormModificarNombre(plantillaSeleccionada.nombre);
    setModalModificarNombre(true);
  };

  const handleModificarNombre = async () => {
    if (!plantillaSeleccionada) return;

    if (!formModificarNombre.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre no puede estar vacío',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      await updatePlantillaNombre(plantillaSeleccionada.id, formModificarNombre);
      toast({
        title: 'Nombre actualizado',
        description: 'El nombre de la plantilla se ha actualizado correctamente',
      });
      setModalModificarNombre(false);
      await cargarDatos();
      // Actualizar plantilla seleccionada
      const plantillaActualizada = plantillas.find((p) => p.id === plantillaSeleccionada.id);
      if (plantillaActualizada) {
        setPlantillaSeleccionada({ ...plantillaActualizada, nombre: formModificarNombre });
      }
    } catch (error: any) {
      console.error('Error modificando nombre:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo modificar el nombre',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // HANDLERS: Añadir Material a Plantilla Existente
  // ============================================================
  const abrirModalAñadirMaterial = () => {
    // Detectar el tipo de revisión más común en la plantilla
    let tipoRevisionPredeterminado = '';
    if (plantillaSeleccionada && plantillaSeleccionada.materiales.length > 0) {
      // Obtener el tipo de revisión del primer material (o el más común)
      const tiposEnPlantilla = plantillaSeleccionada.materiales.map((m) => m.tipoRevisionId);
      const tipoMasComun = tiposEnPlantilla[0]; // Usar el primer tipo por defecto
      tipoRevisionPredeterminado = tipoMasComun;
    }

    setFormAñadirMaterial({
      materialId: '',
      cantidad: 1,
      tipoRevisionId: tipoRevisionPredeterminado,
    });
    setModalAñadirMaterial(true);
  };

  const handleAñadirMaterialAPlantilla = async () => {
    if (!plantillaSeleccionada) return;

    if (!formAñadirMaterial.materialId || !formAñadirMaterial.tipoRevisionId) {
      toast({
        title: 'Error',
        description: 'Debe seleccionar un material y un tipo de revisión',
        variant: 'destructive',
      });
      return;
    }

    // Verificar que no esté ya en la plantilla
    const yaExiste = plantillaSeleccionada.materiales.some(
      (m) => m.materialId === formAñadirMaterial.materialId
    );
    if (yaExiste) {
      toast({
        title: 'Material duplicado',
        description: 'Este material ya está en la plantilla',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const nuevosMateriales = [
        ...plantillaSeleccionada.materiales.map((m) => ({
          materialId: m.materialId,
          cantidad: m.cantidad,
          tipoRevisionId: m.tipoRevisionId,
        })),
        {
          materialId: formAñadirMaterial.materialId,
          cantidad: formAñadirMaterial.cantidad,
          tipoRevisionId: formAñadirMaterial.tipoRevisionId,
        },
      ];

      await updatePlantillaMateriales(plantillaSeleccionada.id, nuevosMateriales);
      toast({
        title: 'Material añadido',
        description: 'El material se ha añadido a la plantilla correctamente',
      });
      setModalAñadirMaterial(false);
      await cargarDatos();
      // Recargar plantilla seleccionada
      const plantillaActualizada = await getAllPlantillas();
      const nuevaSeleccion = plantillaActualizada.find((p) => p.id === plantillaSeleccionada.id);
      if (nuevaSeleccion) {
        setPlantillaSeleccionada(nuevaSeleccion);
      }
    } catch (error: any) {
      console.error('Error añadiendo material:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo añadir el material',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // HANDLERS: Crear Nuevo Material desde Plantilla
  // ============================================================
  const abrirModalNuevoMaterial = (matriculaInicial: string) => {
    if (!plantillaSeleccionada) return;

    setFormNuevoMaterial({
      matricula: matriculaInicial,
      descripcion: '',
      serieVehiculo: plantillaSeleccionada.serieVehiculo,
      infoAdicional: '',
    });
    setModalNuevoMaterial(true);
  };

  const handleCrearNuevoMaterial = async () => {
    if (!formNuevoMaterial.matricula || !formNuevoMaterial.descripcion || !formNuevoMaterial.serieVehiculo) {
      toast({
        title: 'Error',
        description: 'Debe completar matrícula, descripción y serie de vehículo',
        variant: 'destructive',
      });
      return;
    }

    // Validar formato de matrícula (debe ser 89XXXXXX - 8 dígitos)
    const matricula = parseInt(formNuevoMaterial.matricula);
    if (isNaN(matricula) || formNuevoMaterial.matricula.length !== 8 || !formNuevoMaterial.matricula.startsWith('89')) {
      toast({
        title: 'Error',
        description: 'La matrícula debe tener 8 dígitos y comenzar con 89',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Crear el nuevo material usando saveMaterial de data.ts
      await saveMaterial({
        registration: matricula,
        description: formNuevoMaterial.descripcion,
        vehicleSeries: formNuevoMaterial.serieVehiculo,
        infoAdicional: formNuevoMaterial.infoAdicional,
        supplierId: '',
      } as any);

      toast({
        title: 'Material creado',
        description: 'El material se ha creado correctamente',
      });

      // Recargar materiales
      const materialesActualizados = await getAllMaterials();
      setMateriales(materialesActualizados);

      // Buscar el material recién creado
      const materialCreado = materialesActualizados.find(
        (m) => m.registration === matricula
      );

      if (materialCreado && plantillaSeleccionada) {
        // Añadirlo automáticamente a la plantilla con cantidad 1
        const nuevosMateriales = [
          ...plantillaSeleccionada.materiales.map((m) => ({
            materialId: m.materialId,
            cantidad: m.cantidad,
            tipoRevisionId: m.tipoRevisionId,
          })),
          {
            materialId: materialCreado.id,
            cantidad: 1,
            tipoRevisionId: tiposRevision[0]?.id || '', // Usar el primer tipo de revisión disponible
          },
        ];

        await updatePlantillaMateriales(plantillaSeleccionada.id, nuevosMateriales);

        toast({
          title: 'Material añadido a plantilla',
          description: 'El material se ha añadido automáticamente a la plantilla',
        });

        // Recargar datos
        await cargarDatos();
        const plantillaActualizada = await getAllPlantillas();
        const nuevaSeleccion = plantillaActualizada.find((p) => p.id === plantillaSeleccionada.id);
        if (nuevaSeleccion) {
          setPlantillaSeleccionada(nuevaSeleccion);
        }
      }

      setModalNuevoMaterial(false);
    } catch (error: any) {
      console.error('Error creando material:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear el material',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // HANDLERS: Modificar Cantidad
  // ============================================================
  const handleModificarCantidad = async (materialPlantilla: PlantillaMaterial, nuevaCantidad: number) => {
    if (!plantillaSeleccionada) return;

    if (nuevaCantidad < 1) {
      toast({
        title: 'Error',
        description: 'La cantidad debe ser mayor a 0',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const nuevosMateriales = plantillaSeleccionada.materiales.map((m) =>
        m.id === materialPlantilla.id
          ? { materialId: m.materialId, cantidad: nuevaCantidad, tipoRevisionId: m.tipoRevisionId }
          : { materialId: m.materialId, cantidad: m.cantidad, tipoRevisionId: m.tipoRevisionId }
      );

      await updatePlantillaMateriales(plantillaSeleccionada.id, nuevosMateriales);
      toast({
        title: 'Cantidad actualizada',
        description: 'La cantidad del material se ha actualizado correctamente',
      });
      await cargarDatos();
      const plantillaActualizada = await getAllPlantillas();
      const nuevaSeleccion = plantillaActualizada.find((p) => p.id === plantillaSeleccionada.id);
      if (nuevaSeleccion) {
        setPlantillaSeleccionada(nuevaSeleccion);
      }
    } catch (error: any) {
      console.error('Error modificando cantidad:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo modificar la cantidad',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // HANDLERS: Modificar Tipo de Revisión
  // ============================================================
  const handleModificarTipoRevision = async (
    materialPlantilla: PlantillaMaterial,
    nuevoTipoRevisionId: string
  ) => {
    setLoading(true);
    try {
      await updateMaterialTipoRevision(materialPlantilla.id, nuevoTipoRevisionId);
      toast({
        title: 'Tipo actualizado',
        description: 'El tipo de revisión se ha actualizado correctamente',
      });
      await cargarDatos();
      if (plantillaSeleccionada) {
        const plantillaActualizada = await getAllPlantillas();
        const nuevaSeleccion = plantillaActualizada.find((p) => p.id === plantillaSeleccionada.id);
        if (nuevaSeleccion) {
          setPlantillaSeleccionada(nuevaSeleccion);
        }
      }
    } catch (error: any) {
      console.error('Error modificando tipo de revisión:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo modificar el tipo de revisión',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // HANDLERS: Eliminar Material
  // ============================================================
  const abrirAlertEliminarMaterial = (material: PlantillaMaterial) => {
    setMaterialAEliminar(material);
    setAlertEliminarMaterial(true);
  };

  const handleEliminarMaterial = async () => {
    if (!materialAEliminar || !plantillaSeleccionada) return;

    // Validar que quede al menos un material
    if (plantillaSeleccionada.materiales.length <= 1) {
      toast({
        title: 'Error',
        description: 'La plantilla debe tener al menos un material',
        variant: 'destructive',
      });
      setAlertEliminarMaterial(false);
      setMaterialAEliminar(null);
      return;
    }

    setLoading(true);
    try {
      await deletePlantillaMaterial(materialAEliminar.id);
      toast({
        title: 'Material eliminado',
        description: 'El material se ha eliminado de la plantilla correctamente',
      });
      setAlertEliminarMaterial(false);
      setMaterialAEliminar(null);
      await cargarDatos();
      const plantillaActualizada = await getAllPlantillas();
      const nuevaSeleccion = plantillaActualizada.find((p) => p.id === plantillaSeleccionada.id);
      if (nuevaSeleccion) {
        setPlantillaSeleccionada(nuevaSeleccion);
      }
    } catch (error: any) {
      console.error('Error eliminando material:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo eliminar el material',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // HANDLERS: Eliminar Plantilla
  // ============================================================
  const abrirAlertEliminarPlantilla = () => {
    setAlertEliminarPlantilla(true);
  };

  const handleEliminarPlantilla = async () => {
    if (!plantillaSeleccionada) return;

    setLoading(true);
    try {
      await deletePlantilla(plantillaSeleccionada.id);
      toast({
        title: 'Plantilla eliminada',
        description: 'La plantilla se ha eliminado correctamente',
      });
      setAlertEliminarPlantilla(false);
      setPlantillaSeleccionada(null);
      await cargarDatos();
    } catch (error: any) {
      console.error('Error eliminando plantilla:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo eliminar la plantilla',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // HANDLERS: Duplicar Plantilla
  // ============================================================
  const abrirModalDuplicar = () => {
    if (!plantillaSeleccionada) return;
    setFormDuplicar(`Copia de ${plantillaSeleccionada.nombre}`);
    setModalDuplicar(true);
  };

  const handleDuplicarPlantilla = async () => {
    if (!plantillaSeleccionada) return;

    if (!formDuplicar.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre de la plantilla duplicada es obligatorio',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      await duplicarPlantilla(plantillaSeleccionada.id, formDuplicar);
      toast({
        title: 'Plantilla duplicada',
        description: 'La plantilla se ha duplicado correctamente',
      });
      setModalDuplicar(false);
      await cargarDatos();
    } catch (error: any) {
      console.error('Error duplicando plantilla:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo duplicar la plantilla',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // HANDLERS: Gestionar Tipos de Revisión
  // ============================================================
  const abrirModalGestionarTipos = () => {
    setModalGestionarTipos(true);
  };

  const abrirModalAñadirTipo = () => {
    setFormNuevoTipo({ codigo: '', descripcion: '' });
    setModalAñadirTipo(true);
  };

  const handleCrearTipoRevision = async () => {
    if (!formNuevoTipo.codigo.trim() || !formNuevoTipo.descripcion.trim()) {
      toast({
        title: 'Error',
        description: 'El código y la descripción son obligatorios',
        variant: 'destructive',
      });
      return;
    }

    // Validar formato del código (solo mayúsculas y números)
    if (!/^[A-Z0-9]+$/.test(formNuevoTipo.codigo)) {
      toast({
        title: 'Error de formato',
        description: 'El código solo puede contener letras mayúsculas y números',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      await createTipoRevision(formNuevoTipo.codigo, formNuevoTipo.descripcion);
      toast({
        title: 'Tipo creado',
        description: 'El tipo de revisión se ha creado correctamente',
      });
      setModalAñadirTipo(false);
      const tiposActualizados = await getTiposRevision();
      setTiposRevision(tiposActualizados.filter((t) => t.activo));
    } catch (error: any) {
      console.error('Error creando tipo:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear el tipo de revisión',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const abrirModalEditarTipo = (tipo: TipoRevision) => {
    setFormEditarTipo({ id: tipo.id, codigo: tipo.codigo, descripcion: tipo.descripcion });
    setModalEditarTipo(true);
  };

  const handleEditarTipoRevision = async () => {
    if (!formEditarTipo.codigo.trim() || !formEditarTipo.descripcion.trim()) {
      toast({
        title: 'Error',
        description: 'El código y la descripción son obligatorios',
        variant: 'destructive',
      });
      return;
    }

    // Validar formato del código
    if (!/^[A-Z0-9]+$/.test(formEditarTipo.codigo)) {
      toast({
        title: 'Error de formato',
        description: 'El código solo puede contener letras mayúsculas y números',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      await updateTipoRevision(formEditarTipo.id, formEditarTipo.codigo, formEditarTipo.descripcion);
      toast({
        title: 'Tipo actualizado',
        description: 'El tipo de revisión se ha actualizado correctamente',
      });
      setModalEditarTipo(false);
      const tiposActualizados = await getTiposRevision();
      setTiposRevision(tiposActualizados.filter((t) => t.activo));
    } catch (error: any) {
      console.error('Error editando tipo:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo editar el tipo de revisión',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const abrirAlertEliminarTipo = (tipo: TipoRevision) => {
    setTipoAEliminar(tipo);
    setAlertEliminarTipo(true);
  };

  const handleEliminarTipoRevision = async () => {
    if (!tipoAEliminar) return;

    setLoading(true);
    try {
      await deleteTipoRevision(tipoAEliminar.id);
      toast({
        title: 'Tipo eliminado',
        description: 'El tipo de revisión se ha eliminado correctamente',
      });
      setAlertEliminarTipo(false);
      setTipoAEliminar(null);
      const tiposActualizados = await getTiposRevision();
      setTiposRevision(tiposActualizados.filter((t) => t.activo));
    } catch (error: any) {
      console.error('Error eliminando tipo:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo eliminar el tipo de revisión',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // HANDLERS: Ordenación de materiales
  // ============================================================
  const handleSort = (column: 'matricula' | 'descripcion') => {
    if (sortColumn === column) {
      // Si ya está ordenando por esta columna, cambiar dirección
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Si es una columna nueva, establecer ascendente por defecto
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // ============================================================
  // COMPUTED: Filtrado y búsqueda
  // ============================================================
  const plantillasFiltradas = plantillas.filter((plantilla) => {
    // Filtro por búsqueda
    const matchesSearch =
      searchTerm === '' ||
      plantilla.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plantilla.serieVehiculo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (plantilla.usuarioCreadorNombre &&
        plantilla.usuarioCreadorNombre.toLowerCase().includes(searchTerm.toLowerCase()));

    // Filtro por serie
    const matchesSerie = filtroSerie === 'TODAS' || plantilla.serieVehiculo === filtroSerie;

    // Filtro por creador
    const matchesCreador =
      filtroCreador === 'TODOS' || plantilla.usuarioCreadorId === filtroCreador;

    return matchesSearch && matchesSerie && matchesCreador;
  });

  // Opciones para filtros
  const seriesUnicas = Array.from(new Set(plantillas.map((p) => p.serieVehiculo))).sort();
  const creadoresUnicos = Array.from(
    new Set(
      plantillas.map((p) => ({
        id: p.usuarioCreadorId,
        nombre: p.usuarioCreadorNombre || 'Usuario desconocido',
      }))
    )
  );

  // ============================================================
  // RENDER: Material disponible para añadir
  // ============================================================
  const materialesDisponiblesParaNueva = formNuevaPlantilla.serieVehiculo
    ? materiales.filter((m) => m.vehicleSeries === formNuevaPlantilla.serieVehiculo)
    : [];

  // Mostrar TODOS los materiales sin filtrar por serie
  const materialesDisponiblesParaExistente = plantillaSeleccionada
    ? materiales
    : [];

  // ============================================================
  // COMPUTED: Ordenación de materiales de la plantilla
  // ============================================================
  const materialesOrdenados = plantillaSeleccionada
    ? [...plantillaSeleccionada.materiales].sort((a, b) => {
        if (!sortColumn) return 0; // Sin ordenación

        let compareValue = 0;
        if (sortColumn === 'matricula') {
          const matriculaA = String(a.matricula ?? '');
          const matriculaB = String(b.matricula ?? '');
          compareValue = matriculaA.localeCompare(matriculaB);
        } else if (sortColumn === 'descripcion') {
          const descripcionA = a.descripcion ?? '';
          const descripcionB = b.descripcion ?? '';
          compareValue = descripcionA.localeCompare(descripcionB);
        }

        return sortDirection === 'asc' ? compareValue : -compareValue;
      })
    : [];

  // ============================================================
  // COMPUTED: Verificar si todos los materiales tienen el mismo tipo
  // ============================================================
  const todosLosMaterialesMismoTipo = useMemo(() => {
    if (!plantillaSeleccionada || plantillaSeleccionada.materiales.length === 0) {
      return false;
    }
    const primerTipo = plantillaSeleccionada.materiales[0].tipoRevisionId;
    return plantillaSeleccionada.materiales.every((m) => m.tipoRevisionId === primerTipo);
  }, [plantillaSeleccionada]);

  // ============================================================
  // RENDER
  // ============================================================
  if (loading && plantillas.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-muted-foreground">Cargando maestro de plantillas...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-gray-50 to-white min-h-screen">
      {/* ============================================================ */}
      {/* HEADER */}
      {/* ============================================================ */}
      <div className="flex items-center justify-between bg-white rounded-lg shadow-sm border p-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Maestro de Plantillas</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Package className="h-4 w-4" />
            Página para gestionar las plantillas de materiales de reparaciones
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={abrirModalGestionarTipos} variant="outline" className="gap-2 shadow-sm">
            <Settings className="h-4 w-4" />
            Tipos de Revisiones
          </Button>
          <Button onClick={abrirModalNuevaPlantilla} className="gap-2 bg-[#91268F] hover:bg-[#7a1f7a] shadow-sm">
            <Plus className="h-4 w-4" />
            Nueva Plantilla
          </Button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* LAYOUT: 2 COLUMNAS */}
      {/* ============================================================ */}
      <div className="grid grid-cols-12 gap-6 min-h-[calc(100vh-200px)]">
        {/* ============================================================ */}
        {/* COLUMNA IZQUIERDA: Lista de Plantillas */}
        {/* ============================================================ */}
        <div className="col-span-4 space-y-4 border-r pr-4">
          {/* Barra de búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar plantillas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-white shadow-sm border-gray-300 focus:border-[#91268F] focus:ring-[#91268F]"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filtros */}
          <div className="space-y-3 bg-white p-4 rounded-lg border shadow-sm">
            <div className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-2">Filtros</div>
            <div>
              <Label className="text-xs text-muted-foreground font-medium">Serie de Vehículo</Label>
              <Select value={filtroSerie} onValueChange={setFiltroSerie}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODAS">Todas las series</SelectItem>
                  {seriesUnicas.map((serie) => (
                    <SelectItem key={serie} value={serie}>
                      {serie}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground font-medium">Creador</Label>
              <Select value={filtroCreador} onValueChange={setFiltroCreador}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos los usuarios</SelectItem>
                  {creadoresUnicos.map((creador) => (
                    <SelectItem key={creador.id} value={creador.id}>
                      {creador.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Contador de resultados */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-muted-foreground font-medium">
              {plantillasFiltradas.length} plantilla{plantillasFiltradas.length !== 1 ? 's' : ''} encontrada{plantillasFiltradas.length !== 1 ? 's' : ''}
            </span>
            {(searchTerm || filtroSerie !== 'TODAS' || filtroCreador !== 'TODOS') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFiltroSerie('TODAS');
                  setFiltroCreador('TODOS');
                }}
                className="text-xs text-[#91268F] hover:underline font-medium"
              >
                Limpiar filtros
              </button>
            )}
          </div>

          {/* Lista de plantillas */}
          <div className="border rounded-lg divide-y max-h-[calc(100vh-450px)] overflow-y-auto bg-white shadow-sm">
            {plantillasFiltradas.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No se encontraron plantillas</p>
                <p className="text-xs mt-1">Ajuste los filtros o cree una nueva plantilla</p>
              </div>
            ) : (
              plantillasFiltradas.map((plantilla) => {
                const isSelected = plantillaSeleccionada?.id === plantilla.id;
                const canModify = isSelected && plantilla.usuarioCreadorId === userProfile?.user_id;
                const canDelete = isSelected && plantilla.usuarioCreadorId === userProfile?.user_id;

                return (
                  <div
                    key={plantilla.id}
                    className={`border-l-4 transition-all duration-200 ${
                      isSelected
                        ? 'bg-muted border-l-[#91268F] shadow-sm'
                        : 'border-l-transparent'
                    }`}
                  >
                    <div className="flex items-start gap-2 p-4">
                      {/* Contenido principal - clickeable */}
                      <button
                        onClick={() => setPlantillaSeleccionada(plantilla)}
                        className="flex-1 text-left hover:opacity-80 transition-opacity"
                      >
                        <div className="font-semibold text-sm mb-2 text-gray-900">{plantilla.nombre}</div>
                        <div className="text-xs text-muted-foreground space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <Package className="h-3 w-3" />
                            <span>Serie: {plantilla.serieVehiculo}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium">{plantilla.totalMateriales || plantilla.materiales.length}</span>
                            <span>material(es)</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <User className="h-3 w-3" />
                            {plantilla.usuarioCreadorNombre || 'Usuario desconocido'}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(plantilla.fechaCreacion), 'dd/MM/yyyy', { locale: es })}
                          </div>
                        </div>
                      </button>

                      {/* Botones de acción a la derecha cuando está seleccionada */}
                      {isSelected && (
                        <div className="flex flex-col gap-1 flex-shrink-0">
                          {canModify && (
                            <button
                              onClick={abrirModalModificarNombre}
                              className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200/60 rounded transition-colors whitespace-nowrap"
                            >
                              <Pencil className="h-3 w-3" />
                              <span>Modificar Nombre</span>
                            </button>
                          )}
                          <button
                            onClick={abrirModalDuplicar}
                            className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200/60 rounded transition-colors whitespace-nowrap"
                          >
                            <Copy className="h-3 w-3" />
                            <span>Duplicar</span>
                          </button>
                          {canDelete && (
                            <button
                              onClick={abrirAlertEliminarPlantilla}
                              className="flex items-center gap-1.5 px-2 py-1 text-xs text-red-600 hover:bg-red-100/70 rounded transition-colors whitespace-nowrap"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span>Eliminar</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* COLUMNA DERECHA: Detalle de Plantilla */}
        {/* ============================================================ */}
        <div className="col-span-8">
          {!plantillaSeleccionada ? (
            <div className="flex items-center justify-center h-full border rounded-lg bg-gradient-to-br from-muted/30 to-muted/10">
              <div className="text-center text-muted-foreground p-8">
                <Package className="h-20 w-20 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">Seleccione una plantilla para ver los detalles</p>
                <p className="text-sm mt-2">Use la lista de la izquierda para elegir una plantilla</p>
              </div>
            </div>
          ) : (
            <div className="border rounded-lg p-6 space-y-6 bg-white shadow-sm">
              {/* Header de detalle */}
              <div className="border-b pb-4">
                <h2 className="text-2xl font-bold text-gray-900">{plantillaSeleccionada.nombre}</h2>
              </div>

              {/* Sección de materiales */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Materiales ({plantillaSeleccionada.materiales.length})
                  </h3>
                  <Button
                    onClick={abrirModalAñadirMaterial}
                    variant="outline"
                    className="gap-2 border-[#91268F] text-[#91268F] hover:bg-[#91268F]/10 hover:text-[#91268F] hover:border-[#91268F]"
                  >
                    <Plus className="h-4 w-4" />
                    Añadir Material
                  </Button>
                </div>

                {/* Tabla de materiales */}
                <div className="border rounded-lg overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-muted to-muted/50">
                        <tr>
                          <th className="text-left p-3 font-semibold text-sm text-gray-900">
                            <button
                              onClick={() => handleSort('matricula')}
                              className="flex items-center gap-1.5 hover:text-[#91268F] transition-colors"
                            >
                              Matrícula
                              <ArrowUpDown className={`h-4 w-4 ${sortColumn === 'matricula' ? 'text-[#91268F]' : 'text-gray-400'}`} />
                            </button>
                          </th>
                          <th className="text-left p-3 font-semibold text-sm text-gray-900">
                            <button
                              onClick={() => handleSort('descripcion')}
                              className="flex items-center gap-1.5 hover:text-[#91268F] transition-colors"
                            >
                              Descripción
                              <ArrowUpDown className={`h-4 w-4 ${sortColumn === 'descripcion' ? 'text-[#91268F]' : 'text-gray-400'}`} />
                            </button>
                          </th>
                          <th className="text-left p-3 font-semibold text-sm text-gray-900">Cantidad</th>
                          <th className="text-left p-3 font-semibold text-sm text-gray-900">Tipo Revisión</th>
                          <th className="text-center p-3 font-semibold text-sm text-gray-900">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y bg-white">
                        {materialesOrdenados.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-10 text-center">
                              <Package className="h-10 w-10 mx-auto mb-2 opacity-30 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground font-medium">No hay materiales en esta plantilla</p>
                              <p className="text-xs text-muted-foreground mt-1">Haga clic en "Añadir Material" para comenzar</p>
                            </td>
                          </tr>
                        ) : (
                          materialesOrdenados.map((material) => (
                            <tr key={material.id} className="hover:bg-muted/30 transition-colors">
                              <td className="p-3 text-sm font-mono font-medium text-gray-700">{material.matricula}</td>
                              <td className="p-3 text-sm text-gray-900">{material.descripcion}</td>
                              <td className="p-3">
                                <Input
                                  type="number"
                                  min="1"
                                  value={material.cantidad}
                                  onChange={(e) =>
                                    handleModificarCantidad(material, parseInt(e.target.value) || 1)
                                  }
                                  className="w-20 h-8 text-center"
                                />
                              </td>
                              <td className="p-3">
                                <Select
                                  value={material.tipoRevisionId}
                                  onValueChange={(value) => handleModificarTipoRevision(material, value)}
                                >
                                  <SelectTrigger className="w-[140px] h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {tiposRevision.map((tipo) => (
                                      <SelectItem key={tipo.id} value={tipo.id}>
                                        {tipo.codigo}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="p-3 text-center">
                                <Button
                                  onClick={() => abrirAlertEliminarMaterial(material)}
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Historial */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900">Historial de Cambios</h3>
                <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto bg-white shadow-sm">
                  {historial.length === 0 ? (
                    <div className="p-8 text-center">
                      <Calendar className="h-10 w-10 mx-auto mb-2 opacity-30 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground font-medium">No hay historial de cambios</p>
                      <p className="text-xs text-muted-foreground mt-1">Las modificaciones aparecerán aquí</p>
                    </div>
                  ) : (
                    historial.map((entry) => (
                      <div key={entry.id} className="p-3.5 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="font-medium text-sm text-gray-900">{entry.accion}</div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(entry.fecha), 'dd/MM/yyyy HH:mm', { locale: es })}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>{entry.usuarioNombre || 'Usuario desconocido'}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL: Nueva Plantilla */}
      {/* ============================================================ */}
      <Dialog open={modalNuevaPlantilla} onOpenChange={setModalNuevaPlantilla}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Plantilla</DialogTitle>
            <DialogDescription>
              Crear una nueva plantilla de materiales. Todos los materiales deben ser de la misma
              serie del vehículo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="tipo-intervencion">
                Tipo de Intervención <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formNuevaPlantilla.tipoIntervencion}
                onValueChange={(value) => {
                  setFormNuevaPlantilla({ ...formNuevaPlantilla, tipoIntervencion: value });
                  // Auto-poblar el tipo de revisión en el formulario de añadir material
                  setFormAñadirMaterial({ ...formAñadirMaterial, tipoRevisionId: value });
                }}
              >
                <SelectTrigger id="tipo-intervencion">
                  <SelectValue placeholder="Seleccione un tipo" />
                </SelectTrigger>
                <SelectContent>
                  {tiposRevision.map((tipo) => (
                    <SelectItem key={tipo.id} value={tipo.id}>
                      {tipo.codigo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="serie-vehiculo">
                Serie de Vehículo <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formNuevaPlantilla.serieVehiculo}
                onValueChange={(value) =>
                  setFormNuevaPlantilla({ ...formNuevaPlantilla, serieVehiculo: value })
                }
              >
                <SelectTrigger id="serie-vehiculo">
                  <SelectValue placeholder="Seleccione una serie" />
                </SelectTrigger>
                <SelectContent>
                  {vehiculos.map((vehiculo) => (
                    <SelectItem key={vehiculo.id} value={vehiculo.codigo_vehiculo}>
                      {vehiculo.nombre_vehiculo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preview del nombre generado */}
            {formNuevaPlantilla.tipoIntervencion && formNuevaPlantilla.serieVehiculo && (
              <div className="rounded-lg bg-muted/50 p-3 border">
                <Label className="text-xs text-muted-foreground">Nombre de la plantilla</Label>
                <p className="text-sm font-medium mt-1">
                  Intervencion {tiposRevision.find((t) => t.id === formNuevaPlantilla.tipoIntervencion)?.codigo} - Serie {formNuevaPlantilla.serieVehiculo}
                </p>
              </div>
            )}

            {/* Sección añadir material */}
            {formNuevaPlantilla.serieVehiculo && (
              <div className="border rounded-lg p-4 bg-muted/30">
                <h4 className="font-semibold mb-3">Añadir Material</h4>
                <div className="grid grid-cols-4 gap-3">
                  <div className="col-span-2">
                    <Label htmlFor="material-select">Material</Label>
                    <MaterialCombobox
                      materials={materialesDisponiblesParaNueva}
                      value={formAñadirMaterial.materialId}
                      onValueChange={(value) =>
                        setFormAñadirMaterial({ ...formAñadirMaterial, materialId: value })
                      }
                      placeholder="Seleccione un material"
                      emptyMessage="No se encontraron materiales para esta serie"
                      onCreateNew={abrirModalNuevoMaterial}
                    />
                  </div>

                  <div>
                    <Label htmlFor="cantidad">Cantidad</Label>
                    <Input
                      id="cantidad"
                      type="number"
                      min="1"
                      value={formAñadirMaterial.cantidad}
                      onChange={(e) =>
                        setFormAñadirMaterial({
                          ...formAñadirMaterial,
                          cantidad: parseInt(e.target.value) || 1,
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="tipo-revision" className="text-xs text-muted-foreground">
                      Tipo (heredado)
                    </Label>
                    <Select
                      value={formAñadirMaterial.tipoRevisionId}
                      onValueChange={(value) =>
                        setFormAñadirMaterial({ ...formAñadirMaterial, tipoRevisionId: value })
                      }
                      disabled={true}
                    >
                      <SelectTrigger id="tipo-revision" className="bg-muted">
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {tiposRevision.map((tipo) => (
                          <SelectItem key={tipo.id} value={tipo.id}>
                            {tipo.codigo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={añadirMaterialAFormulario}
                  size="sm"
                  className="mt-3 gap-2"
                  variant="outline"
                >
                  <Plus className="h-4 w-4" />
                  Añadir a la lista
                </Button>
              </div>
            )}

            {/* Lista de materiales seleccionados */}
            {formNuevaPlantilla.materialesSeleccionados.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">
                  Materiales Seleccionados ({formNuevaPlantilla.materialesSeleccionados.length})
                </h4>
                <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
                  {formNuevaPlantilla.materialesSeleccionados.map((ms) => {
                    const material = materiales.find((m) => m.id === ms.materialId);
                    const tipo = tiposRevision.find((t) => t.id === ms.tipoRevisionId);
                    return (
                      <div
                        key={ms.materialId}
                        className="p-3 flex items-center justify-between hover:bg-muted/50"
                      >
                        <div className="text-sm">
                          <div className="font-medium">
                            {material?.registration} - {material?.description}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            Cantidad: {ms.cantidad} | Tipo: {tipo?.codigo}
                          </div>
                        </div>
                        <Button
                          onClick={() => quitarMaterialDeFormulario(ms.materialId)}
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalNuevaPlantilla(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCrearPlantilla} disabled={loading} className="bg-[#107C41] hover:bg-[#0d6635]">
              {loading ? 'Creando...' : 'Crear Plantilla'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* MODAL: Modificar Nombre */}
      {/* ============================================================ */}
      <Dialog open={modalModificarNombre} onOpenChange={setModalModificarNombre}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modificar Nombre de Plantilla</DialogTitle>
            <DialogDescription>
              Solo el creador de la plantilla puede modificar su nombre.
            </DialogDescription>
          </DialogHeader>

          <div>
            <Label htmlFor="nuevo-nombre">Nuevo Nombre</Label>
            <Input
              id="nuevo-nombre"
              value={formModificarNombre}
              onChange={(e) => setFormModificarNombre(e.target.value)}
              placeholder="Nombre de la plantilla"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalModificarNombre(false)}>
              Cancelar
            </Button>
            <Button onClick={handleModificarNombre} disabled={loading} className="bg-[#107C41] hover:bg-[#0d6635]">
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* MODAL: Añadir Material a Plantilla Existente */}
      {/* ============================================================ */}
      <Dialog open={modalAñadirMaterial} onOpenChange={setModalAñadirMaterial}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Añadir Material a Plantilla</DialogTitle>
            <DialogDescription>
              Añadir un material a la plantilla {plantillaSeleccionada?.nombre}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="material-añadir">Material</Label>
              <MaterialCombobox
                materials={materialesDisponiblesParaExistente}
                value={formAñadirMaterial.materialId}
                onValueChange={(value) =>
                  setFormAñadirMaterial({ ...formAñadirMaterial, materialId: value })
                }
                placeholder="Seleccione un material"
                emptyMessage="No se encontraron materiales"
                onCreateNew={abrirModalNuevoMaterial}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {materialesDisponiblesParaExistente.length} material(es) disponible(s)
              </p>
            </div>

            <div>
              <Label htmlFor="cantidad-añadir">Cantidad</Label>
              <Input
                id="cantidad-añadir"
                type="number"
                min="1"
                value={formAñadirMaterial.cantidad}
                onChange={(e) =>
                  setFormAñadirMaterial({
                    ...formAñadirMaterial,
                    cantidad: parseInt(e.target.value) || 1,
                  })
                }
              />
            </div>

            <div>
              <Label htmlFor="tipo-añadir">
                Tipo de Revisión
                {todosLosMaterialesMismoTipo && (
                  <span className="text-xs text-muted-foreground ml-2">(Predeterminado de la plantilla)</span>
                )}
              </Label>
              <Select
                value={formAñadirMaterial.tipoRevisionId}
                onValueChange={(value) =>
                  setFormAñadirMaterial({ ...formAñadirMaterial, tipoRevisionId: value })
                }
                disabled={todosLosMaterialesMismoTipo}
              >
                <SelectTrigger id="tipo-añadir" className={todosLosMaterialesMismoTipo ? 'bg-muted cursor-not-allowed' : ''}>
                  <SelectValue placeholder="Seleccione tipo" />
                </SelectTrigger>
                <SelectContent>
                  {tiposRevision.map((tipo) => (
                    <SelectItem key={tipo.id} value={tipo.id}>
                      {tipo.codigo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAñadirMaterial(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAñadirMaterialAPlantilla}
              disabled={loading}
              className="bg-[#107C41] hover:bg-[#0d6635]"
            >
              {loading ? 'Añadiendo...' : 'Añadir Material'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* MODAL: Duplicar Plantilla */}
      {/* ============================================================ */}
      <Dialog open={modalDuplicar} onOpenChange={setModalDuplicar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicar Plantilla</DialogTitle>
            <DialogDescription>
              Se creará una copia exacta de la plantilla con un nuevo nombre. Usted será el creador
              de la nueva plantilla.
            </DialogDescription>
          </DialogHeader>

          <div>
            <Label htmlFor="nombre-duplicada">Nombre de la Nueva Plantilla</Label>
            <Input
              id="nombre-duplicada"
              value={formDuplicar}
              onChange={(e) => setFormDuplicar(e.target.value)}
              placeholder="Nombre de la plantilla duplicada"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalDuplicar(false)}>
              Cancelar
            </Button>
            <Button onClick={handleDuplicarPlantilla} disabled={loading} className="bg-[#107C41] hover:bg-[#0d6635]">
              {loading ? 'Duplicando...' : 'Duplicar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* MODAL: Gestionar Tipos de Revisión */}
      {/* ============================================================ */}
      <Dialog open={modalGestionarTipos} onOpenChange={setModalGestionarTipos}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Tipos de Revisiones</DialogTitle>
            <DialogDescription>
              Las Revisiones predeterminadas (IM1-IM6, R1-R4) no se pueden editar ni eliminar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Button onClick={abrirModalAñadirTipo} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Añadir Nuevo Tipo de Revisión
            </Button>

            <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
              {tiposRevision.map((tipo) => (
                <div
                  key={tipo.id}
                  className="p-3 flex items-center justify-between hover:bg-muted/50"
                >
                  <div>
                    <div className="font-medium text-sm">{tipo.codigo}</div>
                    <div className="text-xs text-muted-foreground">{tipo.descripcion}</div>
                    {tipo.esPredeterminado && (
                      <div className="text-xs text-muted-foreground mt-1">(Predeterminado)</div>
                    )}
                  </div>
                  {!tipo.esPredeterminado && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => abrirModalEditarTipo(tipo)}
                        variant="ghost"
                        size="sm"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => abrirAlertEliminarTipo(tipo)}
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setModalGestionarTipos(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* MODAL: Añadir Tipo de Revisión */}
      {/* ============================================================ */}
      <Dialog open={modalAñadirTipo} onOpenChange={setModalAñadirTipo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir Tipo de Revisión Personalizado</DialogTitle>
            <DialogDescription>
              El código solo puede contener letras mayúsculas y números.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="codigo-tipo">Código</Label>
              <Input
                id="codigo-tipo"
                placeholder="Ej: R5, IM7, CUSTOM1"
                value={formNuevoTipo.codigo}
                onChange={(e) =>
                  setFormNuevoTipo({ ...formNuevoTipo, codigo: e.target.value.toUpperCase() })
                }
                maxLength={10}
              />
            </div>

            <div>
              <Label htmlFor="descripcion-tipo">Descripción</Label>
              <Input
                id="descripcion-tipo"
                placeholder="Descripción del tipo"
                value={formNuevoTipo.descripcion}
                onChange={(e) =>
                  setFormNuevoTipo({ ...formNuevoTipo, descripcion: e.target.value })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAñadirTipo(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCrearTipoRevision} disabled={loading} className="bg-[#107C41] hover:bg-[#0d6635]">
              {loading ? 'Creando...' : 'Crear Tipo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* MODAL: Editar Tipo de Revisión */}
      {/* ============================================================ */}
      <Dialog open={modalEditarTipo} onOpenChange={setModalEditarTipo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Tipo de Revisión</DialogTitle>
            <DialogDescription>
              Modifique el código y la descripción del tipo personalizado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="codigo-tipo-edit">Código</Label>
              <Input
                id="codigo-tipo-edit"
                value={formEditarTipo.codigo}
                onChange={(e) =>
                  setFormEditarTipo({ ...formEditarTipo, codigo: e.target.value.toUpperCase() })
                }
                maxLength={10}
              />
            </div>

            <div>
              <Label htmlFor="descripcion-tipo-edit">Descripción</Label>
              <Input
                id="descripcion-tipo-edit"
                value={formEditarTipo.descripcion}
                onChange={(e) =>
                  setFormEditarTipo({ ...formEditarTipo, descripcion: e.target.value })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalEditarTipo(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditarTipoRevision} disabled={loading} className="bg-[#107C41] hover:bg-[#0d6635]">
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* ALERT: Eliminar Plantilla */}
      {/* ============================================================ */}
      <AlertDialog open={alertEliminarPlantilla} onOpenChange={setAlertEliminarPlantilla}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar plantilla?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará la plantilla "
              {plantillaSeleccionada?.nombre}" y todos sus materiales asociados permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEliminarPlantilla}
              className="bg-destructive hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ============================================================ */}
      {/* ALERT: Eliminar Material */}
      {/* ============================================================ */}
      <AlertDialog open={alertEliminarMaterial} onOpenChange={setAlertEliminarMaterial}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar material de la plantilla?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el material "{materialAEliminar?.descripcion}" (matrícula{' '}
              {materialAEliminar?.matricula}) de esta plantilla. El material seguirá existiendo en
              el maestro de materiales.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEliminarMaterial}
              className="bg-destructive hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ============================================================ */}
      {/* ALERT: Eliminar Tipo de Revisión */}
      {/* ============================================================ */}
      <AlertDialog open={alertEliminarTipo} onOpenChange={setAlertEliminarTipo}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tipo de revisión?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el tipo "{tipoAEliminar?.codigo} - {tipoAEliminar?.descripcion}". Si hay
              materiales usando este tipo, la operación fallará.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEliminarTipoRevision}
              className="bg-destructive hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ============================================================ */}
      {/* MODAL: Crear Nuevo Material */}
      {/* ============================================================ */}
      <Dialog open={modalNuevoMaterial} onOpenChange={setModalNuevoMaterial}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nuevo Material</DialogTitle>
            <DialogDescription>
              Crear un nuevo material para la serie {plantillaSeleccionada?.serieVehiculo}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nueva-matricula">
                  Matrícula 89 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nueva-matricula"
                  type="text"
                  placeholder="89xxxxxx"
                  value={formNuevoMaterial.matricula}
                  onChange={(e) => {
                    let inputValue = e.target.value.replace(/[^\d]/g, '');
                    if (inputValue.length > 8) inputValue = inputValue.slice(0, 8);
                    if (inputValue.length > 2 && !inputValue.startsWith('89')) {
                      inputValue = inputValue.slice(0, 2);
                    }
                    setFormNuevoMaterial({ ...formNuevoMaterial, matricula: inputValue });
                  }}
                  maxLength={8}
                />
              </div>

              <div>
                <Label htmlFor="nueva-serie">Serie Vehículo</Label>
                <Select
                  value={formNuevoMaterial.serieVehiculo}
                  onValueChange={(value) =>
                    setFormNuevoMaterial({ ...formNuevoMaterial, serieVehiculo: value })
                  }
                >
                  <SelectTrigger id="nueva-serie">
                    <SelectValue placeholder="-- Elige serie vehiculo --" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehiculos.map((vehiculo) => (
                      <SelectItem key={vehiculo.id} value={vehiculo.codigo_vehiculo}>
                        {vehiculo.nombre_vehiculo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="nueva-descripcion">
                Descripción <span className="text-red-500">*</span>
              </Label>
              <Input
                id="nueva-descripcion"
                type="text"
                placeholder="Descripción de la Pieza copiada de Maximo."
                value={formNuevoMaterial.descripcion}
                onChange={(e) =>
                  setFormNuevoMaterial({ ...formNuevoMaterial, descripcion: e.target.value })
                }
              />
            </div>

            <div>
              <Label htmlFor="nueva-info">Información Adicional</Label>
              <textarea
                id="nueva-info"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Información adicional sobre el material..."
                value={formNuevoMaterial.infoAdicional}
                onChange={(e) =>
                  setFormNuevoMaterial({ ...formNuevoMaterial, infoAdicional: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Puede agregar aquí cualquier información relevante sobre el material.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalNuevoMaterial(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCrearNuevoMaterial}
              disabled={loading}
              className="bg-[#91268F] hover:bg-[#7a1f78]"
            >
              {loading ? 'Guardando...' : 'Guardar Material'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
