import { useState, type InputHTMLAttributes } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
};

export function PasswordInput({ label, id, className, ...rest }: Props) {
  const [visible, setVisible] = useState(false);
  const inputId = id || rest.name || "password";

  return (
    <div className="form-field">
      <label htmlFor={inputId}>{label}</label>
      <div className="password-input-wrap">
        <input
          {...rest}
          id={inputId}
          type={visible ? "text" : "password"}
          className={className}
        />
        <button
          type="button"
          className="password-eye-btn"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          tabIndex={-1}
        >
          {visible ? (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M3 3l18 18" />
              <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
              <path d="M9.9 5.1A10.5 10.5 0 0 1 12 5c5 0 9 4.5 9.9 7-.3.8-1 2-2.1 3.2M6.1 6.1C4.2 7.5 2.9 9.3 2.1 12c.9 2.5 4.9 7 9.9 7 1.4 0 2.7-.3 3.9-.8" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M2.1 12C3 9.5 7 5 12 5s9 4.5 9.9 7c-.9 2.5-4.9 7-9.9 7s-9-4.5-9.9-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
