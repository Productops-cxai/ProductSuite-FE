import { useEffect, useState } from "react";
import { listPayflowEmailUnsubscribes } from "../../api/payflow";
import {
  EMAIL_UNSUBSCRIBE_REASON_OPTIONS,
  EMAIL_UNSUBSCRIBE_REVIEW_CODES,
  toggleUnsubscribeReason,
} from "../../lib/emailUnsubscribe";
import type { EmailUnsubscribeReasonOption } from "../../types";
import { Modal } from "../ui/Modal";
import { Btn, Field, StatusPill, TextArea } from "./lovable/payflow-ui";

export type MarkUnsubscribedInput = {
  reasons: string[];
  comment: string;
};

type Props = {
  open: boolean;
  busy?: boolean;
  error?: string;
  onClose: () => void;
  onConfirm: (input: MarkUnsubscribedInput) => void;
};

export function MarkUnsubscribedModal({ open, busy, error, onClose, onConfirm }: Props) {
  const [options, setOptions] = useState<EmailUnsubscribeReasonOption[]>(
    EMAIL_UNSUBSCRIBE_REASON_OPTIONS,
  );
  const [reviewCodes, setReviewCodes] = useState<Set<string>>(
    () => new Set(EMAIL_UNSUBSCRIBE_REVIEW_CODES),
  );
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setSelected([]);
    setComment("");
    setOptionsLoading(true);
    listPayflowEmailUnsubscribes({ limit: 1, offset: 0 })
      .then((res) => {
        if (cancelled) return;
        if (res.reason_options?.length) setOptions(res.reason_options);
        else setOptions(EMAIL_UNSUBSCRIBE_REASON_OPTIONS);
        setReviewCodes(
          new Set(
            res.review_reason_codes?.length
              ? res.review_reason_codes
              : EMAIL_UNSUBSCRIBE_REVIEW_CODES,
          ),
        );
      })
      .catch(() => {
        if (cancelled) return;
        setOptions(EMAIL_UNSUBSCRIBE_REASON_OPTIONS);
        setReviewCodes(new Set(EMAIL_UNSUBSCRIBE_REVIEW_CODES));
      })
      .finally(() => {
        if (!cancelled) setOptionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  return (
    <Modal
      open={open}
      title="Mark unsubscribed"
      description="Collection email stops immediately. Reasons and a comment are optional, and are stored for operations."
      onClose={busy ? () => undefined : onClose}
      overlayClassName="z-[70]"
      size="wide"
      footer={
        <div className="mt-2 flex justify-end gap-2.5">
          <Btn disabled={busy} onClick={onClose}>
            Cancel
          </Btn>
          <Btn
            variant="primary"
            disabled={busy || optionsLoading}
            onClick={() => onConfirm({ reasons: selected, comment: comment.trim() })}
          >
            {busy ? "Saving…" : "Mark unsubscribed"}
          </Btn>
        </div>
      }
    >
      <fieldset disabled={busy || optionsLoading} className="min-w-0">
        <legend className="mb-1.5 text-[12px] font-medium text-foreground">
          Reasons (optional)
        </legend>
        <p className="mb-2 text-[11px] leading-relaxed text-muted-foreground">
          Leave this blank if the customer did not give a reason. Review reasons are flagged for
          follow-up. This does not open a Human Review task.
        </p>
        {optionsLoading ? (
          <p className="text-[12px] text-muted-foreground">Loading reasons…</p>
        ) : (
          <div className="space-y-0.5">
            {options.map((option) => (
              <label key={option.code} className="flex items-start gap-2.5 py-1 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 size-3.5 accent-primary"
                  checked={selected.includes(option.code)}
                  onChange={() => setSelected((current) => toggleUnsubscribeReason(current, option.code))}
                />
                <span className="min-w-0 text-[12.5px] leading-snug text-foreground">
                  {option.label}
                  {reviewCodes.has(option.code) ? (
                    <span className="ml-2 inline-flex align-middle">
                      <StatusPill tone="warning">Review</StatusPill>
                    </span>
                  ) : null}
                </span>
              </label>
            ))}
          </div>
        )}
      </fieldset>
      <div className="mt-3">
        <Field label="Comment (optional)" hint="Optional even when Other is selected.">
          <TextArea
            value={comment}
            onChange={setComment}
            disabled={busy}
            placeholder="What the customer said, if anything"
          />
        </Field>
      </div>
      {error ? <p className="mt-2 text-[12px] text-destructive">{error}</p> : null}
    </Modal>
  );
}
