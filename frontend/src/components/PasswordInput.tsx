import { forwardRef, InputHTMLAttributes, useState } from "react";
import { Icon } from "@/components/ui/icons";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ className, ...props }, ref) {
    const [visible, setVisible] = useState(false);

    return (
      <div className="relative">
        <input
          ref={ref}
          type={visible ? "text" : "password"}
          className={`input pr-11 ${className ?? ""}`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          title={visible ? "Ocultar senha" : "Mostrar senha"}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-[var(--koda-text-faint)] transition-colors hover:text-[var(--koda-text)]"
        >
          {visible ? <Icon name="eyeOff" className="h-[18px] w-[18px]" /> : <Icon name="eye" className="h-[18px] w-[18px]" />}
        </button>
      </div>
    );
  }
);