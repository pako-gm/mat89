import { useState } from "react";
import { cn } from "@/lib/utils";
import { Search, ClipboardList, PackageCheck, Users, Factory, Package, FileSearch, Database } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";

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
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const currentPath = window.location.pathname;
  
  const handleBlur = () => {
    setSearchQuery("");
    navigate('/pedidos');
  };
  
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    if (value) {
      navigate(`/pedidos?search=${encodeURIComponent(value)}`);
    } else {
      navigate('/pedidos');
    }
  };
  
  return (
    <div className="flex flex-col h-full border-r bg-white">
      <div className="p-6">
        <h2 className="text-2xl font-medium tracking-tight">
          <span className="text-[#4C4C4C]">Mat</span>
          <span className="text-[#91268F]">89</span>
        </h2>
        <p className="text-xs text-[#787878]">© F.G.M. 2025</p>
      </div>
      
      <div className="px-3 py-2">
        <h3 className="mb-2 px-4 text-sm font-medium text-[#4C4C4C]">
          Menu
        </h3>
        <div className="space-y-1">
          <div className="px-3 py-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-[#787878]" />
              <Input
                type="text"
                placeholder="Buscar pedido..."
                value={searchQuery}
                onChange={handleSearch}
                onBlur={handleBlur}
                className="pl-8 h-9 text-sm bg-gray-50 border-gray-200 focus:bg-white"
              />
            </div>
          </div>
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
            icon={<Users className="h-4 w-4" />}
            label="Contactos" 
            path="/contactos" 
            active={currentPath === "/contactos"}
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
    </div>
  );
}