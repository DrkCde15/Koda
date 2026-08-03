import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";

import { authService } from "@/services/auth";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/contexts/ToastContext";
import { getErrorMessage } from "@/utils/error";
import { Icon } from "@/components/ui/icons";
import { Reveal } from "@/components/ui/primitives";

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
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-8">
      <Reveal>
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-brand-gradient text-2xl font-bold text-white shadow-glow-brand">
            {user?.full_name ? user.full_name.charAt(0).toUpperCase() : "?"}
          </span>
          <div>
            <h1 className="text-3xl font-bold tracking-tightest">Meu perfil</h1>
            <p className="mt-1 text-sm text-[var(--koda-text-muted)]">{user?.email}</p>
          </div>
        </div>
      </Reveal>

      <Reveal delay={80}>
        <div className="card mt-8 p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-300">
              <Icon name="edit" className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-semibold tracking-tight">Informações</h2>
              <p className="text-xs text-[var(--koda-text-muted)]">Dados públicos da sua conta.</p>
            </div>
          </div>
          {isLoading || !user ? (
            <div className="space-y-4">
              <div className="skeleton h-11 w-full" />
              <div className="skeleton h-11 w-full" />
              <div className="skeleton h-11 w-full" />
            </div>
          ) : (
            <form onSubmit={handleProfile(onSaveProfile)} className="space-y-4">
              <div>
                <label className="field-muted mb-2 block">Email</label>
                <input className="input !bg-[var(--koda-surface-2)]" value={user.email} disabled />
              </div>
              <div>
                <label className="field-muted mb-2 block">Nome</label>
                <input className="input" {...registerProfile("full_name", { required: true })} />
              </div>
              <div>
                <label className="field-muted mb-2 block">URL do avatar</label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-[var(--koda-text-faint)]">
                    <Icon name="link" className="h-4 w-4" />
                  </span>
                  <input
                    className="input pl-10"
                    placeholder="https://…"
                    {...registerProfile("avatar_url")}
                  />
                </div>
              </div>
              <button type="submit" className="btn-primary" disabled={isSavingProfile}>
                {isSavingProfile ? "Salvando…" : "Salvar perfil"}
              </button>
            </form>
          )}
        </div>
      </Reveal>

      <Reveal delay={160}>
        <div className="card mt-6 p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--koda-surface-2)] text-[var(--koda-text-muted)]">
              <Icon name="shield" className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-semibold tracking-tight">Segurança</h2>
              <p className="text-xs text-[var(--koda-text-muted)]">Atualize sua senha com segurança.</p>
            </div>
          </div>
          <form onSubmit={handlePassword(onSavePassword)} className="space-y-4">
            <div>
              <label className="field-muted mb-2 block">Senha atual</label>
              <input
                className="input"
                type="password"
                {...registerPassword("current_password", { required: true })}
              />
            </div>
            <div>
              <label className="field-muted mb-2 block">Nova senha</label>
              <input
                className="input"
                type="password"
                placeholder="Mínimo de 8 caracteres"
                {...registerPassword("new_password", { required: true, minLength: 8 })}
              />
            </div>
            <div>
              <label className="field-muted mb-2 block">Confirmar nova senha</label>
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
                <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
                  <Icon name="x" className="h-3 w-3" />
                  {errors.confirm_password.message}
                </p>
              )}
            </div>
            <button type="submit" className="btn-secondary" disabled={isSavingPassword}>
              {isSavingPassword ? "Alterando…" : "Alterar senha"}
            </button>
          </form>
        </div>
      </Reveal>
    </div>
  );
}