import { ReactNode } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { workspaceService } from "@/services/auth";
import { useAuth } from "@/hooks/useAuth";

export function AppLayout({ children }: { children?: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { data: workspaces = [] } = useQuery({
    queryKey: ["workspaces"],
    queryFn: () => workspaceService.list(),
  });

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800">
      <aside className="flex w-64 flex-col border-r border-gray-200 bg-white">
        <Link to="/" className="px-4 py-4 text-xl font-bold text-brand-600">
          Koda
        </Link>
        <nav className="flex-1 overflow-y-auto px-2">
          <p className="px-2 py-2 text-xs font-semibold uppercase text-gray-400">
            Workspaces
          </p>
          {workspaces.map((ws) => (
            <NavLink
              key={ws.id}
              to={`/workspaces/${ws.id}`}
              className={({ isActive }) =>
                `block rounded-md px-2 py-2 text-sm ${
                  isActive ? "bg-brand-50 text-brand-700" : "text-gray-700 hover:bg-gray-100"
                }`
              }
            >
              <span className="mr-2">{ws.icon || "📁"}</span>
              {ws.name}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-gray-200 p-3">
          <div className="mb-2 truncate text-sm font-medium">{user?.full_name}</div>
          <button onClick={handleLogout} className="btn-ghost w-full">
            Sair
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        {children ?? <Outlet />}
      </main>
    </div>
  );
}
