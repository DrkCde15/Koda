import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";

import { AuthLayout } from "@/layouts/AuthLayout";
import { PasswordInput } from "@/components/PasswordInput";
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
      <h1 className="mb-1 text-xl font-bold tracking-tight text-zinc-900 dark:text-white">Entrar</h1>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">Bem-vindo de volta ao Koda.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-200">Email</label>
          <input className="input" type="email" placeholder="voce@empresa.com" {...register("email", { required: true })} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-200">Senha</label>
          <PasswordInput {...register("password", { required: true })} />
        </div>
        <button className="btn-primary w-full" type="submit">
          Entrar
        </button>
      </form>
      <div className="mt-5 flex justify-between text-sm">
        <Link to="/forgot-password" className="font-medium text-brand-600 hover:text-brand-700">
          Esqueceu a senha?
        </Link>
        <Link to="/register" className="font-medium text-brand-600 hover:text-brand-700">
          Criar conta
        </Link>
      </div>
    </AuthLayout>
  );
}
