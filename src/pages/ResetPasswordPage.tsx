import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, AlertTriangle, CheckCircle2, Lock } from "lucide-react";

export default function ResetPasswordPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [tokenError, setTokenError] = useState(false);
  
  // Requisitos de contraseña
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecial: false
  });

  // Verificar el token al cargar
  useEffect(() => {
    const validateToken = async () => {
      try {
        // Obtener el hash del token de la URL (Supabase lo maneja)
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        // Si no hay usuario o hay un error, el token no es válido
        if (error || !user) {
          console.error("Token no válido:", error);
          setTokenError(true);
        }
      } catch (err) {
        console.error("Error al validar token:", err);
        setTokenError(true);
      }
    };

    validateToken();
  }, []);

  // Evaluar la fortaleza de la contraseña
  useEffect(() => {
    setPasswordStrength({
      length: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    });
  }, [password]);

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const isPasswordValid = () => {
    return (
      passwordStrength.length &&
      passwordStrength.hasUppercase &&
      passwordStrength.hasLowercase &&
      passwordStrength.hasNumber
    );
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validar contraseñas
    if (!isPasswordValid()) {
      setError("La contraseña no cumple con los requisitos mínimos de seguridad.");
      return;
    }
    
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    
    setLoading(true);
    
    try {
      // Actualizar contraseña con Supabase
      const { error } = await supabase.auth.updateUser({
        password: password
      });
      
      if (error) {
        throw error;
      }
      
      // Éxito
      setSuccess(true);
      
      toast({
        title: "Contraseña actualizada",
        description: "Tu contraseña ha sido actualizada correctamente.",
      });
      
      // Después de 3 segundos, redirigir al login
      setTimeout(() => {
        navigate("/login");
      }, 3000);
      
    } catch (err) {
      console.error("Error al restablecer la contraseña:", err);
      
      let errorMessage = "No se pudo restablecer la contraseña.";
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  // Si el token es inválido, mostrar mensaje de error
  if (tokenError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">
              <span className="text-[#4C4C4C]">Mat</span>
              <span className="text-[#91268F]">89</span>
            </CardTitle>
            <CardDescription>
              Recuperación de contraseña
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center text-center p-6">
              <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
              <h2 className="text-xl font-medium text-gray-900">Enlace no válido</h2>
              <p className="text-gray-600 mt-2">
                Este enlace de recuperación no es válido o ha expirado.
              </p>
              <p className="text-gray-600 mt-1">
                Por favor, solicita al Administrador un nuevo enlace de recuperación.
              </p>
              <Button
                className="mt-6 w-full bg-[#91268F] hover:bg-[#7A1F79]"
                onClick={() => navigate("/login")}
              >
                Volver al inicio de sesión
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Si se completó con éxito
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">
              <span className="text-[#4C4C4C]">Mat</span>
              <span className="text-[#91268F]">89</span>
            </CardTitle>
            <CardDescription>
              Recuperación de contraseña
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center text-center p-6">
              <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
              <h2 className="text-xl font-medium text-gray-900">¡Contraseña actualizada!</h2>
              <p className="text-gray-600 mt-2">
                Tu contraseña ha sido actualizada correctamente.
              </p>
              <p className="text-gray-600 mt-1">
                Serás redirigido a la página de inicio de sesión en unos segundos...
              </p>
              <Button
                className="mt-6 w-full bg-[#91268F] hover:bg-[#7A1F79]"
                onClick={() => navigate("/login")}
              >
                Ir al inicio de sesión
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            <span className="text-[#4C4C4C]">Mat</span>
            <span className="text-[#91268F]">89</span>
          </CardTitle>
          <CardDescription>
            Establece tu nueva contraseña
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">
              {error}
            </div>
          )}
          
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nueva contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={toggleShowPassword}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
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
                    ✓ Recomendado: Al menos un carácter especial (!@#$%^&*)
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className={password && confirmPassword && password !== confirmPassword ? "border-red-500" : ""}
              />
              {password && confirmPassword && password !== confirmPassword && (
                <p className="text-red-500 text-xs mt-1">
                  Las contraseñas no coinciden.
                </p>
              )}
            </div>
            
            <Button
              type="submit"
              className="w-full bg-[#91268F] hover:bg-[#7A1F79]"
              disabled={loading || !isPasswordValid() || password !== confirmPassword}
            >
              {loading ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                  Actualizando...
                </>
              ) : (
                "Establecer nueva contraseña"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center text-xs text-gray-500">
          <p>
            <span className="font-bold" style={{ color: '#91268F' }}>{'{'}</span>© fgm-dev<span className="font-bold" style={{ color: '#91268F' }}>{'}'}</span> {new Date().getFullYear() === 2024 ? '2024' : `2024-${new Date().getFullYear()}`}
          </p>
          <p>Sistema de Gestión de Reparación de Componentes</p>
        </CardFooter>
      </Card>
    </div>
  );
}