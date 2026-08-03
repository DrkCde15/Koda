import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";

import { authService } from "@/services/auth";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/contexts/ToastContext";
import { getErrorMessage } from "@/utils/error";

interface ProfileForm {
  full_name: string;
  avatar_url?: string;
}

interface PasswordForm {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export function ProfilePage() {
  const { setUser } = useAuth();
  const toast = useToast();
  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => authService.me(),
  });

  const {
    register: registerProfile,
    handleSubmit: handleProfile,
    reset,
    formState: { isSubmitting: isSavingProfile },
  } = useForm<ProfileForm>();

  const {
    register: registerPassword,
    handleSubmit: handlePassword,
    reset: resetPassword,
    watch,
    formState: { isSubmitting: isSavingPassword, errors },
  } = useForm<PasswordForm>();

  useEffect(() => {
    if (user) {
      reset({ full_name: user.full_name, avatar_url: user.avatar_url ?? "" });
    }
  }, [user, reset]);

  const onSaveProfile = async (values: ProfileForm) => {
    try {
      const updated = await authService.updateProfile({
        full_name: values.full_name,
        avatar_url: values.avatar_url || undefined,
      });
      setUser(updated);
      toast.push("Perfil atualizado", "success");
    } catch (err) {
      toast.push(getErrorMessage(err, "Falha ao atualizar perfil"), "error");
    }
  };

  const onSavePassword = async (values: PasswordForm) => {
    try {
      await authService.changePassword(values.current_password, values.new_password);
      resetPassword();
      toast.push("Senha alterada com sucesso", "success");
    } catch (err) {
      toast.push(getErrorMessage(err, "Falha ao alterar senha"), "error");
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Meu perfil</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Gerencie suas informações e credenciais.
        </p>
      </div>

      <div className="card">
        {isLoading || !user ? (
          <p className="text-sm text-zinc-500">Carregando…</p>
        ) : (
          <form onSubmit={handleProfile(onSaveProfile)} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-200">Email</label>
              <input className="input" value={user.email} disabled />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-200">Nome</label>
              <input
                className="input"
                {...registerProfile("full_name", { required: true })}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-200">URL do avatar</label>
              <input className="input" placeholder="https://…" {...registerProfile("avatar_url")} />
            </div>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSavingProfile}
            >
              Salvar perfil
            </button>
          </form>
        )}
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold tracking-tight">Alterar senha</h2>
        <form onSubmit={handlePassword(onSavePassword)} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-200">Senha atual</label>
            <input
              className="input"
              type="password"
              {...registerPassword("current_password", { required: true })}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-200">Nova senha</label>
            <input
              className="input"
              type="password"
              {...registerPassword("new_password", { required: true, minLength: 8 })}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-200">Confirmar nova senha</label>
            <input
              className="input"
              type="password"
              {...registerPassword("confirm_password", {
                required: true,
                validate: (value) =>
                  value === watch("new_password") || "As senhas não coincidem",
              })}
            />
            {errors.confirm_password && (
              <p className="mt-1 text-xs text-red-600">
                {errors.confirm_password.message}
              </p>
            )}
          </div>
          <button
            type="submit"
            className="btn-primary"
            disabled={isSavingPassword}
          >
            Alterar senha
          </button>
        </form>
      </div>
    </div>
  );
}
