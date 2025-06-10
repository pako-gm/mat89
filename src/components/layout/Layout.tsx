import { Outlet, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import { getUserRole } from "@/lib/auth";

export default function Layout() {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      const role = await getUserRole();
      setUserRole(role);
    };
    
    fetchUserRole();
  }, []);

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
          </div>
        </div>
        <div className="p-6 w-full">
          <Outlet />
        </div>
      </div>
    </div>
  );
}