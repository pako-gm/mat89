import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ClipboardList, PackageCheck, Factory, Package, FileSearch, Settings, GitBranch, History } from "lucide-react";
import { Link } from "react-router-dom";
import { getUserRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { VersionHistoryModal } from "@/components/VersionHistoryModal";

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
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  useEffect(() => {
    const fetchUserRole = async () => {
      const role = await getUserRole();
      setUserRole(role);
    };

    fetchUserRole();
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
            <>
              <SidebarItem
                icon={<Settings className="h-4 w-4" />}
                label="Panel de Control"
                path="/panel-control"
                active={currentPath === "/panel-control"}
              />
              <SidebarItem
                icon={<GitBranch className="h-4 w-4" />}
                label="Versiones APP"
                path="/versiones"
                active={currentPath === "/versiones"}
              />
            </>
          )}
        </div>
      </div>

      {/* Version History Button */}
      <div className="px-3 pb-2 flex justify-center">
        <Button
          onClick={() => setShowVersionHistory(true)}
          variant="outline"
          size="sm"
          className="border-[#91268F] text-[#91268F] hover:bg-[#91268F] hover:text-white px-2 py-0.5"
          style={{ fontSize: '9px', height: '20px', lineHeight: '1' }}
        >
          <History className="h-2 w-2 mr-0.5" />
          Versión e Historial
        </Button>
      </div>

      {/* Footer with dynamic copyright */}
      <div className="p-3 border-t border-gray-200 text-center">
        <p className="text-xs text-gray-500">
          <span className="font-bold" style={{ color: '#334155' }}>[© fgm-dev]</span> {new Date().getFullYear() === 2024 ? '2024' : `2024-${new Date().getFullYear()}`}
        </p>
      </div>

      <VersionHistoryModal
        open={showVersionHistory}
        onOpenChange={setShowVersionHistory}
      />
    </div>
  );
}