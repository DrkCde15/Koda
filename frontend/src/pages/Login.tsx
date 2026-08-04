import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";

import { AuthLayout } from "@/layouts/AuthLayout";
import { PasswordInput } from "@/components/PasswordInput";
import { authService } from "@/services/auth";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/contexts/ToastContext";
import { getErrorMessage } from "@/utils/error";
import { Icon } from "@/components/ui/icons";

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
      <h1 className="text-3xl font-bold tracking-tightest text-[var(--koda-text)]">
        Bem-vindo de&nbsp;volta
      </h1>
      <p className="mt-2 mb-8 text-sm text-[var(--koda-text-muted)]">
        Entre no seu espaço e continue de onde parou.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label htmlFor="email" className="field-muted mb-2 block">Email</label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-[var(--koda-text-faint)]">
              <Icon name="users" className="h-4 w-4" />
            </span>
            <input
              id="email"
              className="input pl-10"
              type="email"
              placeholder="voce@empresa.com"
              autoComplete="email"
              autoFocus
              {...register("email", { required: true })}
            />
          </div>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="password" className="field-muted">Senha</label>
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-300"
            >
              Esqueceu a senha?
            </Link>
          </div>
          <PasswordInput id="password" {...register("password", { required: true })} />
        </div>

        <button className="btn-primary h-12 w-full text-[15px]" type="submit">
          Entrar
          <Icon name="arrowRight" className="h-4 w-4" />
        </button>
      </form>

      <div className="relative mt-8 flex items-center gap-4">
        <span className="h-px flex-1 bg-[var(--koda-border)]" />
        <span className="text-xs text-[var(--koda-text-faint)]">novo por aqui?</span>
        <span className="h-px flex-1 bg-[var(--koda-border)]" />
      </div>

      <Link
        to="/register"
        className="group mt-6 flex items-center justify-center gap-2 rounded-xl border border-[var(--koda-border)] bg-[var(--koda-surface)] py-2.5 text-sm font-medium text-[var(--koda-text)] transition-all duration-200 hover:border-[var(--koda-border-strong)] hover:bg-[var(--koda-surface-2)]"
      >
        Criar conta gratuita
        <Icon name="arrowRight" className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
      </Link>
    </AuthLayout>
  );
}