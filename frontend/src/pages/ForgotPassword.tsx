import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";

import { AuthLayout } from "@/layouts/AuthLayout";
import { authService } from "@/services/auth";
import { useToast } from "@/contexts/ToastContext";
import { getErrorMessage } from "@/utils/error";
import { Icon } from "@/components/ui/icons";

interface FormValues {
  email: string;
}

export function ForgotPasswordPage() {
  const { register, handleSubmit } = useForm<FormValues>();
  const toast = useToast();
  const [sent, setSent] = useState(false);

  const onSubmit = async (values: FormValues) => {
    try {
      await authService.forgotPassword(values.email);
      setSent(true);
      toast.push("Se o email existir, enviamos um link de recuperação", "success");
    } catch (err) {
      toast.push(getErrorMessage(err), "error");
    }
  };

  return (
    <AuthLayout>
      <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient shadow-glow-brand">
        <Icon name="shield" className="h-5 w-5 text-white" />
      </span>
      <h1 className="text-3xl font-bold tracking-tightest text-[var(--koda-text)]">
        {sent ? "Verifique seu email" : "Recuperar senha"}
      </h1>
      <p className="mt-2 mb-8 text-sm text-[var(--koda-text-muted)]">
        {sent
          ? "Enviamos um link para redefinir sua senha. O token também aparece no log de desenvolvimento da API."
          : "Digite seu email e enviaremos um link de recuperação."}
      </p>

      {sent ? (
        <div className="animate-pop rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300">
          <div className="flex items-center gap-3">
            <Icon name="check" className="h-4 w-4 shrink-0" />
            <span>Link de recuperação enviado.</span>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label htmlFor="email" className="field-muted mb-2 block">Email</label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-[var(--koda-text-faint)]">
                <Icon name="mail" className="h-4 w-4" />
              </span>
              <input id="email" className="input pl-10" type="email" autoFocus {...register("email", { required: true })} />
            </div>
          </div>
          <button className="btn-primary h-12 w-full text-[15px]" type="submit">
            Enviar link
          </button>
        </form>
      )}

      <Link
        to="/login"
        className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-300"
      >
        <Icon name="arrowLeft" className="h-4 w-4" />
        Voltar ao login
      </Link>
    </AuthLayout>
  );
}