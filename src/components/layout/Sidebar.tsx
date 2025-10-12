import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ClipboardList, PackageCheck, Factory, Package, FileSearch, Database, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { getUserRole } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SidebarItemProps {
  icon?: React.ReactNode;
  label: string;
  path: string;
  active?: boolean;
  disabled?: boolean;
}

const SidebarItem = ({ icon, label, path, active, disabled }: SidebarItemProps) => {
  if (disabled) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 cursor-not-allowed",
          "text-gray-400 opacity-50"
        )}
      >
        {icon && (
          <span className="flex h-5 w-5 items-center">
            {icon}
          </span>
        )}
        <span className="text-sm">{label}</span>
      </div>
    );
  }

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
  const currentPath = window.location.pathname;
  const [userEmail, setUserEmail] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [userRole, setUserRole] = useState<string | null>(null);
  
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserEmail(user.email ?? "");

          // Fetch user name from user_profiles table
          const { data: profile, error: profileError } = await supabase
            .from("user_profiles")
            .select("nombre_usuario")
            .eq("id", user.id)
            .single();

          if (profileError) {
            // This can happen if no profile row exists yet for the user.
            console.log("Could not fetch user profile, using fallback:", profileError.message);
          }

          // Use name from profile, or fallback to the part of the email before '@'
          const name = profile?.nombre_usuario || user.email?.split('@')[0] || "";
          setUserName(name);
          
          // Get user role
          const role = await getUserRole();
          setUserRole(role);
        }
      } catch (error) {
        console.error("Error getting user:", error);
      }
    };
    
    getCurrentUser();

    // Generate a random avatar URL on component mount
    const randomAvatarId = Math.floor(Math.random() * 16) + 1; // Assuming avatars 1-16 exist
    const url = `https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-${randomAvatarId}.png`;
    setAvatarUrl(url);
  }, []);

  return (
    <div className="flex flex-col h-full border-r bg-white">
      <div className="p-6">
        <h2 className="text-2xl font-medium tracking-tight">
          <span className="text-[#4C4C4C]">Mat</span>
          <span className="text-[#91268F]">89</span>
        </h2>
      </div>
      
      <div className="px-3 py-2 flex-1">
        <div className="space-y-1">
          {(userRole === "ADMINISTRADOR" || userRole === "EDICION") && (
            <>
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
              {/* <SidebarItem 
                icon={<Database className="h-4 w-4" />}
                label="Ver Datos Capturados" 
                path="/datos-capturados" 
                active={currentPath === "/datos-capturados"}
                disabled={true}
              /> */}
            </>
          )}
          <SidebarItem
            icon={<FileSearch className="h-4 w-4" />}
            label="Consultar"
            path="/consultar"
            active={currentPath === "/consultar"}
          />
          {userRole === "ADMINISTRADOR" && (
            <SidebarItem
              icon={<Settings className="h-4 w-4" />}
              label="Panel de Control"
              path="/panel-control"
              active={currentPath === "/panel-control"}
            />
          )}
        </div>
      </div>

      {/* User section at bottom */}
      <div className="flex flex-col items-center p-4 border-t border-gray-200 mt-auto">
        <Avatar className="h-16 w-16 mb-2">
          <AvatarImage src={avatarUrl} alt={userName || "User Avatar"} />
          <AvatarFallback>{userName ? userName.charAt(0).toUpperCase() : "U"}</AvatarFallback>
        </Avatar>
        {userEmail ? (
          <div className="text-center w-full px-2 mb-4">
            <p className="text-sm font-semibold text-gray-800 capitalize break-words">
              {userName}
            </p>
            <p className="text-xs text-gray-500 break-all">{userEmail}</p>
          </div>
        ) : (
          <p className="text-sm font-medium text-gray-700 mb-4">Cargando...</p>
        )}
      </div>

      {/* Footer with dynamic copyright */}
      <div className="p-3 border-t border-gray-200 text-center">
        <p className="text-xs text-gray-500">
          <span className="font-bold" style={{ color: '#91268F' }}>{'{'}</span>© fgm-dev<span className="font-bold" style={{ color: '#91268F' }}>{'}'}</span> {new Date().getFullYear() === 2024 ? '2024' : `2024-${new Date().getFullYear()}`}
        </p>
      </div>
    </div>
  );
}