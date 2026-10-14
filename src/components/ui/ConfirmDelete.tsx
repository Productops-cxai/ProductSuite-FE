import type { ReactNode } from "react";
import { Button } from "./Button";
import { Modal } from "./Modal";

type Props = {
  open: boolean;
  title?: string;
  description: ReactNode;
  confirmLabel?: string;
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function ConfirmDelete({
  open,
  title = "Delete permanently?",
  description,
  confirmLabel = "Delete",
  busy,
  onClose,
  onConfirm,
}: Props) {
  return (
    <Modal
      open={open}
      title={title}
      description={typeof description === "string" ? description : undefined}
      onClose={busy ? () => undefined : onClose}
      overlayClassName="z-[70]"
      footer={
        <div className="mt-2 flex justify-end gap-2.5">
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" disabled={busy} onClick={onConfirm}>
            {busy ? "Deleting…" : confirmLabel}
          </Button>
        </div>
      }
    >
      {typeof description === "string" ? null : <div className="mb-[18px] text-[0.9rem] text-slate-500">{description}</div>}
    </Modal>
  );
}
