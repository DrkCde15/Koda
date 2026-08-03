import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { AuthLayout } from "@/layouts/AuthLayout";
import { PasswordInput } from "@/components/PasswordInput";
import { authService } from "@/services/auth";
import { useToast } from "@/contexts/ToastContext";
import { getErrorMessage } from "@/utils/error";
import { Icon } from "@/components/ui/icons";

interface FormValues {
  new_password: string;
}

export function ResetPasswordPage() {
  const { register, handleSubmit } = useForm<FormValues>();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";

  const onSubmit = async (values: FormValues) => {
    try {
      await authService.resetPassword(token, values.new_password);
      toast.push("Senha redefinida com sucesso", "success");
      navigate("/login", { replace: true });
    } catch (err) {
      toast.push(getErrorMessage(err, "Reset failed"), "error");
    }
  };

  return (
    <AuthLayout>
      <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient shadow-glow-brand">
        <Icon name="shield" className="h-5 w-5 text-white" />
      </span>
      <h1 className="text-3xl font-bold tracking-tightest text-[var(--koda-text)]">
        Redefinir senha
      </h1>
      <p className="mt-2 mb-8 text-sm text-[var(--koda-text-muted)]">
        Escolha uma nova senha para a sua conta.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="field-muted mb-2 block">Nova senha</label>
          <PasswordInput {...register("new_password", { required: true, minLength: 8 })} />
          <p className="mt-1.5 text-xs text-[var(--koda-text-faint)]">Mínimo de 8 caracteres.</p>
        </div>
        <button className="btn-primary h-12 w-full text-[15px]" type="submit" disabled={!token}>
          Redefinir senha
        </button>
      </form>

      {!token && (
        <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/5 p-3 text-xs text-red-600 dark:text-red-400">
          Token de redefinição ausente na URL.
        </div>
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