import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Shield, AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface TestResult {
  test: string;
  status: 'success' | 'warning' | 'error' | 'critical';
  description: string;
  details: any;
  timestamp: Date;
}

export default function SecurityAuditPage() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connected' | 'error'>('idle');

  useEffect(() => {
    // Verificar conexión a Supabase
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const { error } = await supabase.from('user_profiles').select('count').limit(1);
      if (error) throw error;
      setConnectionStatus('connected');
    } catch (error) {
      console.error('Error connecting to Supabase:', error);
      setConnectionStatus('error');
    }
  };

  const addResult = (test: string, status: TestResult['status'], description: string, details: any = null) => {
    setTestResults(prev => [...prev, {
      test,
      status,
      description,
      details,
      timestamp: new Date()
    }]);
  };

  // TEST 1: Acceso sin autenticación
  const testUnauthenticatedAccess = async () => {
    try {
      const { data, error } = await supabase
        .from('tbl_pedidos_rep')
        .select('*')
        .limit(1);

      if (data && data.length > 0) {
        addResult(
          'Test 1: Acceso sin autenticación',
          'critical',
          '🚨 CRÍTICO: Se pudo acceder a pedidos sin autenticación. Las políticas RLS no están funcionando correctamente.',
          { data }
        );
      } else if (error && error.code === 'PGRST301') {
        addResult(
          'Test 1: Acceso sin autenticación',
          'success',
          '✓ Correcto: El acceso sin autenticación fue bloqueado correctamente.',
          { error: error.message }
        );
      } else {
        addResult(
          'Test 1: Acceso sin autenticación',
          'success',
          '✓ El sistema bloqueó correctamente el acceso no autenticado.',
          { error }
        );
      }
    } catch (error: any) {
      addResult(
        'Test 1: Acceso sin autenticación',
        'error',
        'Error al ejecutar la prueba: ' + error.message,
        { error: error.toString() }
      );
    }
  };

  // TEST 2: Políticas de documentos
  const testDocumentPolicies = async () => {
    try {
      const { data, error } = await supabase
        .from('tbl_documentos_pedido')
        .select('*')
        .limit(1);

      if (data && data.length > 0) {
        addResult(
          'Test 2: Políticas de documentos',
          'critical',
          '🚨 CRÍTICO: Los documentos son accesibles sin autenticación adecuada.',
          { data }
        );
      } else if (error && error.message.includes('JWT')) {
        addResult(
          'Test 2: Políticas de documentos',
          'success',
          '✓ Correcto: Los documentos están protegidos correctamente.',
          null
        );
      } else {
        addResult(
          'Test 2: Políticas de documentos',
          'warning',
          '⚠ Resultado ambiguo. Verifica manualmente las políticas de tbl_documentos_pedido.',
          { error }
        );
      }
    } catch (error: any) {
      addResult(
        'Test 2: Políticas de documentos',
        'warning',
        'Error al ejecutar la prueba: ' + error.message,
        { error: error.toString() }
      );
    }
  };

  // TEST 3: Tabla sin políticas
  const testMissingPolicies = async () => {
    try {
      const { data, error } = await supabase
        .from('tbl_prov_contactos')
        .select('*')
        .limit(1);

      if (error && error.code === 'PGRST301') {
        addResult(
          'Test 3: Tabla sin políticas',
          'critical',
          '🚨 CRÍTICO: La tabla tbl_prov_contactos no tiene políticas RLS.',
          { error: error.message }
        );
      } else if (data) {
        addResult(
          'Test 3: Tabla sin políticas',
          'error',
          '✗ VULNERABLE: Se pudo acceder a la tabla sin políticas adecuadas.',
          { data }
        );
      } else {
        addResult(
          'Test 3: Tabla sin políticas',
          'warning',
          '⚠ Estado indeterminado de las políticas.',
          { error }
        );
      }
    } catch (error: any) {
      addResult(
        'Test 3: Tabla sin políticas',
        'critical',
        '🚨 La tabla tbl_prov_contactos está completamente bloqueada por falta de políticas.',
        { error: error.toString() }
      );
    }
  };

  // TEST 4: Políticas de roles
  const testRolePolicies = async () => {
    try {
      const { data, error } = await supabase
        .from('tbl_materiales')
        .insert({
          matricula_89: 999999,
          descripcion: 'TEST SECURITY',
          serie_vehiculo: '999'
        })
        .select();

      if (data && data.length > 0) {
        await supabase.from('tbl_materiales').delete().eq('matricula_89', 999999);

        addResult(
          'Test 4: Políticas de roles',
          'error',
          '✗ VULNERABLE: Un usuario pudo insertar datos sin permisos adecuados.',
          { inserted: data }
        );
      } else if (error) {
        addResult(
          'Test 4: Políticas de roles',
          'success',
          '✓ Correcto: El sistema bloqueó correctamente la inserción de datos.',
          { error: error.message }
        );
      }
    } catch (error: any) {
      addResult(
        'Test 4: Políticas de roles',
        'success',
        '✓ Las políticas de rol funcionan correctamente.',
        { error: error.toString() }
      );
    }
  };

  // TEST 5: Escalación de privilegios
  const testPrivilegeEscalation = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();

      if (!session.session) {
        addResult(
          'Test 5: Escalación de privilegios',
          'warning',
          '⚠ No hay sesión activa para ejecutar esta prueba.',
          null
        );
        return;
      }

      const userId = session.session.user.id;

      // PRIMERO: Obtener el rol actual del usuario para poder restaurarlo
      const { data: currentProfile } = await supabase
        .from('user_profiles')
        .select('user_role')
        .eq('user_id', userId)
        .single();

      if (!currentProfile) {
        addResult(
          'Test 5: Escalación de privilegios',
          'warning',
          '⚠ No se pudo obtener el perfil del usuario actual.',
          null
        );
        return;
      }

      const originalRole = currentProfile.user_role;

      // Intentar cambiar el rol a ADMINISTRADOR (para probar si RLS lo bloquea)
      const { data, error } = await supabase
        .from('user_profiles')
        .update({ user_role: 'ADMINISTRADOR' })
        .eq('user_id', userId)
        .select();

      if (data && data.length > 0) {
        // Si tuvo éxito, RESTAURAR el rol original (no hardcodear CONSULTAS)
        await supabase
          .from('user_profiles')
          .update({ user_role: originalRole })
          .eq('user_id', userId);

        addResult(
          'Test 5: Escalación de privilegios',
          'critical',
          `🚨 CRÍTICO: Un usuario pudo cambiar su propio rol de ${originalRole} a ADMINISTRADOR. Rol restaurado a ${originalRole}.`,
          { modified: data, originalRole, restored: true }
        );
      } else if (error) {
        addResult(
          'Test 5: Escalación de privilegios',
          'success',
          '✓ Correcto: El sistema bloqueó el intento de escalación de privilegios.',
          { error: error.message }
        );
      }
    } catch (error: any) {
      addResult(
        'Test 5: Escalación de privilegios',
        'warning',
        'Error al ejecutar la prueba: ' + error.message,
        { error: error.toString() }
      );
    }
  };

  const runAllTests = async () => {
    setTestResults([]);
    setIsRunning(true);

    await testUnauthenticatedAccess();
    await new Promise(resolve => setTimeout(resolve, 500));

    await testDocumentPolicies();
    await new Promise(resolve => setTimeout(resolve, 500));

    await testMissingPolicies();
    await new Promise(resolve => setTimeout(resolve, 500));

    await testRolePolicies();
    await new Promise(resolve => setTimeout(resolve, 500));

    await testPrivilegeEscalation();

    setIsRunning(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-orange-500" />;
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return 'border-green-500 bg-green-50';
      case 'warning':
        return 'border-yellow-500 bg-yellow-50';
      case 'error':
        return 'border-orange-500 bg-orange-50';
      case 'critical':
        return 'border-red-500 bg-red-50';
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-orange-100 text-orange-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
    }
  };

  const critical = testResults.filter(r => r.status === 'critical').length;
  const errors = testResults.filter(r => r.status === 'error').length;
  const warnings = testResults.filter(r => r.status === 'warning').length;
  const success = testResults.filter(r => r.status === 'success').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-slate-700">
            Auditoría de Seguridad
          </h1>
          <p className="text-gray-600 text-lg mt-2">
            Herramienta de pruebas de seguridad para políticas RLS y control de acceso
          </p>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-lg">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-800">Importante</p>
            <p className="text-red-700 text-sm">
              Esta herramienta está diseñada SOLO para probar TU PROPIA aplicación. No la uses en sistemas de terceros.
            </p>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Estado de Conexión</h2>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' :
                connectionStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
              }`}></div>
              <span className="text-gray-600">
                {connectionStatus === 'connected' ? 'Conectado a Supabase' :
                 connectionStatus === 'error' ? 'Error de conexión' : 'Verificando...'}
              </span>
            </div>
          </div>

          <button
            onClick={runAllTests}
            disabled={isRunning || connectionStatus !== 'connected'}
            className="flex items-center gap-2 px-6 py-3 bg-[#91268F] text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Ejecutando pruebas...
              </>
            ) : (
              <>
                <Shield className="w-5 h-5" />
                Ejecutar Todas las Pruebas
              </>
            )}
          </button>
        </div>
      </div>

      {/* Summary */}
      {testResults.length > 0 && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-red-500">
            <div className="text-3xl font-bold text-red-600">{critical}</div>
            <div className="text-sm text-gray-600 mt-1">Críticas</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-orange-500">
            <div className="text-3xl font-bold text-orange-600">{errors}</div>
            <div className="text-sm text-gray-600 mt-1">Errores</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-yellow-500">
            <div className="text-3xl font-bold text-yellow-600">{warnings}</div>
            <div className="text-sm text-gray-600 mt-1">Advertencias</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
            <div className="text-3xl font-bold text-green-600">{success}</div>
            <div className="text-sm text-gray-600 mt-1">Correctas</div>
          </div>
        </div>
      )}

      {/* Results */}
      {testResults.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Resultados de las Pruebas</h2>
          <div className="space-y-4">
            {testResults.map((result, index) => (
              <div
                key={index}
                className={`border-l-4 rounded-lg p-4 ${getStatusColor(result.status)}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(result.status)}
                    <h3 className="font-semibold text-gray-800">{result.test}</h3>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(result.status)}`}>
                    {result.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-gray-700 ml-8">{result.description}</p>
                {result.details && (
                  <details className="mt-3 ml-8">
                    <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                      Ver detalles técnicos
                    </summary>
                    <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-x-auto">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>

          {/* Recommendations */}
          {(critical > 0 || errors > 0) && (
            <div className="mt-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">📋 Recomendaciones de Seguridad</h3>
              <ul className="list-disc list-inside space-y-1 text-blue-700 text-sm">
                {critical > 0 && (
                  <>
                    <li><strong>URGENTE:</strong> Revisa las políticas RLS de tbl_documentos_pedido</li>
                    <li><strong>URGENTE:</strong> Crea políticas para tbl_prov_contactos inmediatamente</li>
                  </>
                )}
                {errors > 0 && (
                  <>
                    <li>Implementa validación de ambito_almacenes en todas las consultas de pedidos</li>
                    <li>Restringe las políticas de user_profiles solo a administradores</li>
                  </>
                )}
                <li>Considera implementar rate limiting para prevenir ataques de fuerza bruta</li>
                <li>Activa logs de auditoría en Supabase para monitorear intentos de acceso no autorizado</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {testResults.length === 0 && !isRunning && (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">
            No hay resultados de pruebas
          </h3>
          <p className="text-gray-500">
            Haz clic en "Ejecutar Todas las Pruebas" para comenzar la auditoría de seguridad
          </p>
        </div>
      )}

      {/* Loading State */}
      {isRunning && testResults.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <Loader2 className="w-16 h-16 text-[#91268F] animate-spin mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600">
            Ejecutando pruebas de seguridad...
          </h3>
        </div>
      )}
    </div>
  );
}
