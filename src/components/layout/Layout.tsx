import { Outlet, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { signOut, getUserRole } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export default function Layout() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      const role = await getUserRole();
      setUserRole(role);
    };
    
    fetchUserRole();
  }, []);

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Sesión cerrada",
      description: "Ha cerrado sesión correctamente",
    });
    navigate("/login");
  };

  return (
    <div className="flex h-screen w-full">
      <div className="w-64">
        <Sidebar />
      </div>
      <div className="flex-1 overflow-auto">
        <div className="flex justify-end items-center px-6 py-2 border-b">
          <div className="flex items-center">
            {userRole && (
              <span className="text-sm text-gray-600 mr-4">
                Rol: <span className="font-medium">{userRole}</span>
              </span>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSignOut}
              className="text-gray-700"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar sesión
            </Button>
          </div>
        </div>
        <div className="p-6 w-full">
          <Outlet />
        </div>
      </div>
    </div>
  );
}