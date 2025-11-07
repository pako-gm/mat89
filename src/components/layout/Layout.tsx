import { Outlet, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import { signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { LogOut, History } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { VersionHistoryModal } from "@/components/VersionHistoryModal";

export default function Layout() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userEmail, setUserEmail] = useState<string>("");
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email ?? "");
      }
    };

    fetchUserData();
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
        <div className="flex justify-between items-center px-6 py-3 border-b bg-white">
          <Button
            onClick={() => setShowVersionHistory(true)}
            variant="outline"
            className="h-9 px-4 border-[#91268F] text-[#91268F] hover:bg-[#91268F] hover:text-white"
          >
            <History className="h-4 w-4 mr-2" />
            Versión e Historial
          </Button>

          <div className="flex items-center gap-3 px-4 py-2">
            <div className="flex flex-col items-start">
              <span className="text-xs text-gray-600">Sesión iniciada como:</span>
              <span className="text-sm font-medium text-gray-800">{userEmail}</span>
            </div>
            <Button
              onClick={handleSignOut}
              className="bg-red-500 hover:bg-red-600 text-white h-9 px-4"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
        <div className="p-6 w-full">
          <Outlet />
        </div>
      </div>

      <VersionHistoryModal
        open={showVersionHistory}
        onOpenChange={setShowVersionHistory}
      />
    </div>
  );
}