import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";

import { AuthLayout } from "@/layouts/AuthLayout";
import { authService } from "@/services/auth";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/contexts/ToastContext";
import { getErrorMessage } from "@/utils/error";

interface FormValues {
  full_name: string;
  email: string;
  password: string;
}

export function RegisterPage() {
  const { register, handleSubmit } = useForm<FormValues>();
  const { setAuth } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const onSubmit = async (values: FormValues) => {
    try {
      const auth = await authService.register(values);
      setAuth(auth);
      navigate("/", { replace: true });
    } catch (err) {
      toast.push(getErrorMessage(err, "Registration failed"), "error");
    }
  };

  return (
    <AuthLayout>
      <h1 className="mb-4 text-lg font-semibold">Criar conta</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm">Nome</label>
          <input className="input" {...register("full_name", { required: true })} />
        </div>
        <div>
          <label className="mb-1 block text-sm">Email</label>
          <input className="input" type="email" {...register("email", { required: true })} />
        </div>
        <div>
          <label className="mb-1 block text-sm">Senha</label>
          <input
            className="input"
            type="password"
            {...register("password", { required: true, minLength: 8 })}
          />
        </div>
        <button className="btn-primary w-full" type="submit">
          Cadastrar
        </button>
      </form>
      <div className="mt-4 text-center text-sm">
        <Link to="/login" className="text-brand-600 hover:underline">
          Já tenho conta
        </Link>
      </div>
    </AuthLayout>
  );
}
