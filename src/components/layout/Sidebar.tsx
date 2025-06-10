import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ClipboardList, PackageCheck, Factory, Package, FileSearch, Database, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface SidebarItemProps {
  icon?: React.ReactNode;
  label: string;
  path: string;
  active?: boolean;
}

const SidebarItem = ({ icon, label, path, active }: SidebarItemProps) => {
  return (
    <Link
      to={path}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-gray-100",
        active ? "bg-gray-100" : "text-gray-600"
      )}
    >
      {icon && (
        <span className="flex h-5 w-5 items-center">
          {icon}
        </span>
      )}
      <span className="text-sm">{label}</span>
    </Link>
  );
};

export default function Sidebar() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const currentPath = window.location.pathname;
  const [userEmail, setUserEmail] = useState<string>("");
  
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          setUserEmail(user.email);
        }
      } catch (error) {
        console.error("Error getting user:", error);
      }
    };
    
    getCurrentUser();
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
    <div className="flex flex-col h-full border-r bg-white">
      <div className="p-6">
        <div className="flex items-center justify-between w-full">
          <h2 className="text-2xl font-medium tracking-tight">
            <span className="text-[#4C4C4C]">Mat</span>
            <span className="text-[#91268F]">89</span>
          </h2>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleSignOut}
            className="text-gray-700 hover:bg-gray-100 h-8 px-2"
          >
            <LogOut className="h-4 w-4 mr-1" />
            <span className="text-xs">Cerrar sesión</span>
          </Button>
        </div>
      </div>
      
      <div className="px-3 py-2 flex-1">
        <div className="space-y-1">
          <SidebarItem 
            icon={<ClipboardList className="h-4 w-4" />}
            label="Pedidos" 
            path="/pedidos"
            active={currentPath === "/pedidos"} 
          />
          <SidebarItem 
            icon={<PackageCheck className="h-4 w-4" />}
            label="Recepciones" 
            path="/recepciones" 
            active={currentPath === "/recepciones"}
          />
          <SidebarItem 
            icon={<Factory className="h-4 w-4" />}
            label="Proveedores" 
            path="/proveedores" 
            active={currentPath === "/proveedores"}
          />
          <SidebarItem 
            icon={<Package className="h-4 w-4" />}
            label="Materiales" 
            path="/materiales" 
            active={currentPath === "/materiales"}
          />
          <SidebarItem 
            icon={<FileSearch className="h-4 w-4" />}
            label="Consultar" 
            path="/consultar" 
            active={currentPath === "/consultar"}
          />
          <SidebarItem 
            icon={<Database className="h-4 w-4" />}
            label="Ver Datos Capturados" 
            path="/datos-capturados" 
            active={currentPath === "/datos-capturados"}
          />
        </div>
      </div>

      {/* User section at bottom */}
      <div className="flex flex-col items-center p-4 border-t border-gray-200 mt-auto">
        <img 
          src="https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=400"
          alt="Usuario"
          className="w-16 h-16 rounded-full object-cover mb-2"
        />
        <p className="text-sm font-medium text-gray-700 text-center break-all">
          {userEmail || "usuario@mat89.com"}
        </p>
      </div>
    </div>
  );
}