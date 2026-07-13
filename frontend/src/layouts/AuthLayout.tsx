import { ReactNode } from "react";
import { Link } from "react-router-dom";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 block text-center text-2xl font-bold text-brand-600">
          Koda
        </Link>
        <div className="card">{children}</div>
      </div>
    </div>
  );
}
