import { Outlet, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import { signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function Layout() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userEmail, setUserEmail] = useState<string>("");

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
      <div className="flex-1 flex flex-col">
        <div className="flex justify-end items-center px-6 py-3 border-b bg-white shrink-0">
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
        <div className="flex-1 w-full overflow-auto">
          <div className="py-6 pl-6 pr-0">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}