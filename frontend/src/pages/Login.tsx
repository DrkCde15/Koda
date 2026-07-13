import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";

import { AuthLayout } from "@/layouts/AuthLayout";
import { authService } from "@/services/auth";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/contexts/ToastContext";
import { getErrorMessage } from "@/utils/error";

interface FormValues {
  email: string;
  password: string;
}

export function LoginPage() {
  const { register, handleSubmit } = useForm<FormValues>();
  const { setAuth } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const onSubmit = async (values: FormValues) => {
    try {
      const auth = await authService.login(values);
      setAuth(auth);
      navigate("/", { replace: true });
    } catch (err) {
      toast.push(getErrorMessage(err, "Login failed"), "error");
    }
  };

  return (
    <AuthLayout>
      <h1 className="mb-4 text-lg font-semibold">Entrar</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm">Email</label>
          <input className="input" type="email" {...register("email", { required: true })} />
        </div>
        <div>
          <label className="mb-1 block text-sm">Senha</label>
          <input className="input" type="password" {...register("password", { required: true })} />
        </div>
        <button className="btn-primary w-full" type="submit">
          Entrar
        </button>
      </form>
      <div className="mt-4 flex justify-between text-sm">
        <Link to="/forgot-password" className="text-brand-600 hover:underline">
          Esqueceu a senha?
        </Link>
        <Link to="/register" className="text-brand-600 hover:underline">
          Criar conta
        </Link>
      </div>
    </AuthLayout>
  );
}
