import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { AuthLayout } from "@/layouts/AuthLayout";
import { authService } from "@/services/auth";
import { useToast } from "@/contexts/ToastContext";
import { getErrorMessage } from "@/utils/error";

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
      <h1 className="mb-4 text-lg font-semibold">Redefinir senha</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm">Nova senha</label>
          <input
            className="input"
            type="password"
            {...register("new_password", { required: true, minLength: 8 })}
          />
        </div>
        <button className="btn-primary w-full" type="submit" disabled={!token}>
          Redefinir
        </button>
      </form>
      {!token && (
        <p className="mt-2 text-xs text-red-500">Token de redefinição ausente na URL.</p>
      )}
      <div className="mt-4 text-center text-sm">
        <Link to="/login" className="text-brand-600 hover:underline">
          Voltar
        </Link>
      </div>
    </AuthLayout>
  );
}
