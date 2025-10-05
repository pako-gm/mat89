import { Outlet, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import { getUserRole, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { LogOut } from "lucide-react";

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
      description: "Has cerrado sesión correctamente",
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
          <div className="flex items-center gap-4">
            {userRole && (
              <span className="text-[11px] text-gray-600">
                Rol: <span className="font-medium">{userRole.charAt(0) + userRole.slice(1).toLowerCase()}</span>
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-gray-700 hover:bg-gray-100 h-8 px-2"
            >
              <LogOut className="h-4 w-4 mr-1" />
              <span className="text-[11px]">Cerrar sesión</span>
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