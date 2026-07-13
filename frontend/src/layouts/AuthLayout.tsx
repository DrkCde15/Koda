import { ReactNode } from "react";
import { Link } from "react-router-dom";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex justify-center">
          <img src="/logo.png" alt="Koda" className="h-12 w-auto" />
        </Link>
        <div className="card">{children}</div>
      </div>
    </div>
  );
}
