import type { ReactNode } from "react";
import { Button } from "./Button";

type Props = {
  title: string;
  description?: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  footer?: ReactNode;
};

export function Modal({ title, description, open, onClose, children, wide, footer }: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-900/45 p-5"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`w-full rounded-xl bg-white p-[22px] shadow-[0_20px_50px_rgba(15,23,42,0.2)] ${wide ? "max-w-[560px]" : "max-w-[480px]"}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h3 className="font-display mb-1.5 text-[1.15rem] font-bold">{title}</h3>
        {description ? <p className="mb-[18px] text-[0.9rem] text-slate-500">{description}</p> : null}
        {children}
        {footer ?? (
          <div className="mt-2 flex justify-end gap-2.5">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
