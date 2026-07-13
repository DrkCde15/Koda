import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";

import { AuthLayout } from "@/layouts/AuthLayout";
import { authService } from "@/services/auth";
import { useToast } from "@/contexts/ToastContext";
import { getErrorMessage } from "@/utils/error";

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
      <h1 className="mb-4 text-lg font-semibold">Recuperar senha</h1>
      {sent ? (
        <p className="text-sm text-gray-600">
          Verifique seu email para continuar. (Token de desenvolvimento retornado pela API pode
          ser usado na tela de redefinição.)
        </p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm">Email</label>
            <input className="input" type="email" {...register("email", { required: true })} />
          </div>
          <button className="btn-primary w-full" type="submit">
            Enviar
          </button>
        </form>
      )}
      <div className="mt-4 text-center text-sm">
        <Link to="/login" className="text-brand-600 hover:underline">
          Voltar
        </Link>
      </div>
    </AuthLayout>
  );
}
