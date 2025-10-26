import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { getUserRole } from "@/lib/auth";

export default function LoginPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Realizar login con Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (!data || !data.user) {
        throw new Error("No se pudo iniciar sesión. Por favor, inténtalo de nuevo.");
      }

      // Obtener el rol del usuario
      const userRole = await getUserRole();

      toast({
        title: "Inicio de sesión con éxito",
        description: `Bienvenido${userRole ? ` (${userRole})` : ''}`,
      });

      // Redireccionar según el rol del usuario
      if (userRole === 'CONSULTAS') {
        navigate("/consultar");
      } else {
        navigate("/pedidos");
      }

    } catch (err) {
      console.error("Error de inicio de sesión:", err);

      // Extraer mensaje de error más amigable
      let errorMessage = "No se pudo iniciar sesión. Por favor, verifica tus credenciales.";
      if (err instanceof Error) {
        if (err.message.includes("Invalid login credentials")) {
          errorMessage = "Credenciales inválidas. Por favor, verifica tu email y/o contraseña.";
        } else if (err.message.includes("Email not confirmed")) {
          errorMessage = "Debes confirmar tu correo electrónico antes de iniciar sesión.";
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);

      toast({
        variant: "destructive",
        title: "Error de inicio de sesión",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetLoading(true);

    try {
      // Validar que el correo no está vacío
      if (!resetEmail.trim()) {
        throw new Error("Por favor, introduce tu dirección de correo electrónico.");
      }

      // Verificar si el correo existe en la base de datos (opcional, Supabase lo hace por nosotros)
      // Pero podríamos agregar una verificación adicional aquí si es necesario

      //Enviar correo de recuperación con Supabase (Supabase v2 syntax)
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`, // Redirige a la página de restablecimiento
      });

      if (error) {
        throw error;
      }

      // Mostrar mensaje de éxito
      setResetEmailSent(true);

      toast({
        title: "Correo enviado",
        description: "Se ha enviado un enlace de recuperación a tu correo electrónico.",
      });

    } catch (err) {
      console.error("Error al solicitar la recuperación:", err);

      let errorMessage = "No se pudo enviar el correo de recuperación.";
      if (err instanceof Error) {
        errorMessage = err.message;
      }

      setError(errorMessage);

      toast({
        variant: "destructive",
        title: "Error de recuperación",
        description: errorMessage,
      });
    } finally {
      setResetLoading(false);
    }
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const toggleResetMode = () => {
    setIsResetMode(!isResetMode);
    setError(null);
    setResetEmailSent(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      {/* New container for both image and form with rounded border */}
      <div className="flex flex-col md:flex-row items-center justify-center p-4 rounded-xl border-2 border-[#8B8B8B] shadow-lg bg-white">
        {/* Image Section */}
        {/* Make sure the image is in your public folder */}
        <div className="mb-8 md:mb-0 md:mr-8 flex-shrink-0">
          <img
            src="/images/login_mat89.png"
            alt="Mat89 login image"
            className="max-w-xs h-auto rounded-lg"
            style={{ maxHeight: '400px' }} // Adjust size as needed
          />
        </div>

        {/* Form Section */}
        {/* Removed default card border and shadow as the outer div provides it */}
        <Card className="w-full max-w-md border-none shadow-none">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">
              <span className="text-[#4C4C4C]">Mat</span>
              <span className="text-[#91268F]">89</span>
            </CardTitle>
            <CardDescription>
              {isResetMode
                ? "Recuperación de contraseña"
                : "Inicia sesión con tus credenciales"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">
                {error}
              </div>
            )}

            {isResetMode ? (
              resetEmailSent ? (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
                  <h3 className="font-medium">Correo enviado</h3>
                  <p className="text-sm mt-1">
                    Si la direccion de correo-e existe en nuestra base de datos, recibirás un enlace para restablecer tu contraseña.
                    Por favor, revisa tu bandeja de entrada, incluida la bandeja de spam y sigue las instrucciones.
                  </p>
                  <p className="text-sm mt-2">
                    El enlace caducará en 24 horas por seguridad.
                  </p>
                  <div className="mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={toggleResetMode}
                    >
                      Volver al inicio de sesión
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="resetEmail">Correo electrónico</Label>
                    <Input
                      id="resetEmail"
                      type="email"
                      placeholder="introduce tu correo-e de empresa"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Introduce la dirección de correo electrónico asociada a tu cuenta.
                      Te enviaremos un enlace para restablecer tu contraseña.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-[#91268F] hover:bg-[#7A1F79]"
                    disabled={resetLoading}
                  >
                    {resetLoading ? (
                      <>
                        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                        Enviando mensaje...
                      </>
                    ) : (
                      "Enviar correo de recuperación"
                    )}
                  </Button>

                  <div className="text-center mt-4">
                    <button
                      type="button"
                      onClick={toggleResetMode}
                      className="text-sm text-[#91268F] hover:underline"
                    >
                      Volver al inicio de sesión
                    </button>
                  </div>
                </form>
              )
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="introduce tu correo-e de empresa"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
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
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[#91268F] hover:bg-[#7A1F79]"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                      Iniciando sesión...
                    </>
                  ) : (
                    "Iniciar sesión"
                  )}
                </Button>

                <div className="text-center mt-2">
                  <button
                    type="button"
                    onClick={toggleResetMode}
                    className="text-sm text-gray-400 cursor-not-allowed"
                    disabled
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              </form>
            )}
          </CardContent>
          <CardFooter className="flex flex-col items-center text-xs text-gray-500">
            <p>
              <span className="font-bold" style={{ color: '#334155' }}>[© fgm-dev]</span> {new Date().getFullYear() === 2024 ? '2024' : `2024-${new Date().getFullYear()}`}
            </p>
            <p>Sistema de Gestión de Reparación de Componentes</p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}