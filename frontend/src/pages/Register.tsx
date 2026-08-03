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

  const steps = [
    { icon: "sparkles", label: "Crie workspaces" },
    { icon: "page", label: "Escreva páginas" },
    { icon: "database", label: "Gerencie bancos" },
  ] as const;

  return (
    <AuthLayout>
      <h1 className="text-3xl font-bold tracking-tightest text-[var(--koda-text)]">
        Comece grátis
      </h1>
      <p className="mt-2 mb-8 text-sm text-[var(--koda-text-muted)]">
        Tudo o que sua equipe precisa, em um só lugar.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="field-muted mb-2 block">Nome</label>
          <input
            className="input"
            placeholder="Seu nome"
            autoComplete="name"
            autoFocus
            {...register("full_name", { required: true })}
          />
        </div>
        <div>
          <label className="field-muted mb-2 block">Email</label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-[var(--koda-text-faint)]">
              <Icon name="users" className="h-4 w-4" />
            </span>
            <input
              className="input pl-10"
              type="email"
              placeholder="voce@empresa.com"
              autoComplete="email"
              {...register("email", { required: true })}
            />
          </div>
        </div>
        <div>
          <label className="field-muted mb-2 block">Senha</label>
          <PasswordInput {...register("password", { required: true, minLength: 8 })} />
          <p className="mt-1.5 text-xs text-[var(--koda-text-faint)]">Mínimo de 8 caracteres.</p>
        </div>

        <button className="btn-primary h-12 w-full text-[15px]" type="submit">
          Criar conta
          <Icon name="arrowRight" className="h-4 w-4" />
        </button>
      </form>

      <div className="mt-8 flex items-center justify-between gap-2 rounded-2xl border border-[var(--koda-border)] bg-[var(--koda-bg-soft)] px-4 py-3">
        {steps.map((s, i) => (
          <div key={s.icon} className="flex flex-1 flex-col items-center gap-1.5 text-center">
            <span className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--koda-surface)] text-[var(--koda-text-muted)] shadow-soft-sm">
              {i === 1 ? (
                <Icon name="file" className="h-3.5 w-3.5" />
              ) : (
                <Icon name={s.icon} className="h-3.5 w-3.5" />
              )}
            </span>
            <span className="text-[10px] font-medium leading-tight text-[var(--koda-text-faint)]">
              {s.label}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-6 text-center text-sm text-[var(--koda-text-muted)]">
        Já tem uma conta?{" "}
        <Link
          to="/login"
          className="font-semibold text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-300"
        >
          Entrar
        </Link>
      </p>
    </AuthLayout>
  );
}