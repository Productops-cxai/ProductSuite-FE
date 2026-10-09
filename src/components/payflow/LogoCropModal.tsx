import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";

/** Landscape-friendly frame so wide logos can be seen in full. */
const VIEW_W = 440;
const VIEW_H = 260;
const MAX_OUTPUT = 1024;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

type Props = {
  open: boolean;
  imageSrc: string | null;
  fileName?: string;
  busy?: boolean;
  onClose: () => void;
  onApply: (file: File) => void | Promise<void>;
};

/** Fit entire image inside the frame (letterbox) — never crop at 100%. */
function containScale(imgW: number, imgH: number, boxW: number, boxH: number) {
  return Math.min(boxW / imgW, boxH / imgH);
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function maxPan(imgW: number, imgH: number, zoom: number) {
  const scale = containScale(imgW, imgH, VIEW_W, VIEW_H) * zoom;
  return {
    x: Math.max(0, (imgW * scale - VIEW_W) / 2),
    y: Math.max(0, (imgH * scale - VIEW_H) / 2),
  };
}

export function LogoCropModal({
  open,
  imageSrc,
  fileName = "logo.png",
  busy = false,
  onClose,
  onApply,
}: Props) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [ready, setReady] = useState(false);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !imageSrc) {
      setReady(false);
      setNatural({ w: 0, h: 0 });
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setError("");
      imgRef.current = null;
      return;
    }

    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      imgRef.current = img;
      setNatural({ w: img.naturalWidth, h: img.naturalHeight });
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setReady(true);
      setError("");
    };
    img.onerror = () => {
      if (cancelled) return;
      setReady(false);
      setError("Could not load this image for cropping.");
    };
    img.src = imageSrc;
    return () => {
      cancelled = true;
    };
  }, [open, imageSrc]);

  const applyPanClamp = useCallback(
    (nextZoom: number, nextOffset: { x: number; y: number }) => {
      if (!natural.w || !natural.h) return nextOffset;
      const lim = maxPan(natural.w, natural.h, nextZoom);
      return {
        x: clamp(nextOffset.x, -lim.x, lim.x),
        y: clamp(nextOffset.y, -lim.y, lim.y),
      };
    },
    [natural.h, natural.w],
  );

  function onZoomChange(value: number) {
    const next = clamp(value, MIN_ZOOM, MAX_ZOOM);
    setZoom(next);
    setOffset((prev) => applyPanClamp(next, prev));
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!ready || busy) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    setOffset(
      applyPanClamp(zoom, {
        x: drag.ox + (e.clientX - drag.x),
        y: drag.oy + (e.clientY - drag.y),
      }),
    );
  }

  function onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    dragRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  async function handleApply() {
    const img = imgRef.current;
    if (!img || !natural.w || !natural.h) return;
    setError("");
    try {
      const scale = containScale(natural.w, natural.h, VIEW_W, VIEW_H) * zoom;
      const displayedW = natural.w * scale;
      const displayedH = natural.h * scale;
      const imgLeftInView = VIEW_W / 2 + offset.x - displayedW / 2;
      const imgTopInView = VIEW_H / 2 + offset.y - displayedH / 2;

      // Visible overlap between the frame and the image (image pixel coords).
      const visLeft = Math.max(0, (0 - imgLeftInView) / scale);
      const visTop = Math.max(0, (0 - imgTopInView) / scale);
      const visRight = Math.min(natural.w, (VIEW_W - imgLeftInView) / scale);
      const visBottom = Math.min(natural.h, (VIEW_H - imgTopInView) / scale);
      const cropW = visRight - visLeft;
      const cropH = visBottom - visTop;
      if (cropW < 2 || cropH < 2) throw new Error("Nothing to export — zoom out a little");

      const longSide = Math.max(cropW, cropH);
      const outScale = longSide > MAX_OUTPUT ? MAX_OUTPUT / longSide : 1;
      const outW = Math.max(1, Math.round(cropW * outScale));
      const outH = Math.max(1, Math.round(cropH * outScale));

      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");
      ctx.clearRect(0, 0, outW, outH);
      ctx.drawImage(img, visLeft, visTop, cropW, cropH, 0, 0, outW, outH);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Failed to export crop"))),
          "image/png",
        );
      });
      const base = fileName.replace(/\.[^.]+$/, "") || "logo";
      await onApply(new File([blob], `${base}.png`, { type: "image/png" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to crop logo");
    }
  }

  const scale =
    natural.w && natural.h ? containScale(natural.w, natural.h, VIEW_W, VIEW_H) * zoom : 1;
  const displayW = natural.w * scale;
  const displayH = natural.h * scale;
  const canPan = maxPan(natural.w || 1, natural.h || 1, zoom).x > 0 || maxPan(natural.w || 1, natural.h || 1, zoom).y > 0;

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      title="Adjust logo"
      description="At 100% the full logo is shown. Zoom in only if you want to crop tighter; landscape logos keep their shape."
      size="wide"
      overlayClassName="z-[90]"
      footer={
        <div className="mt-2 flex shrink-0 justify-end gap-2.5">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void handleApply()} disabled={!ready || busy}>
            {busy ? "Uploading…" : "Apply & upload"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div
          className="relative mx-auto touch-none select-none overflow-hidden rounded-lg border border-border"
          style={{
            width: VIEW_W,
            height: VIEW_H,
            maxWidth: "100%",
            cursor: ready && canPan ? "grab" : "default",
            backgroundImage:
              "linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)",
            backgroundSize: "16px 16px",
            backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0",
            backgroundColor: "#f8fafc",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {ready && imageSrc ? (
            <img
              src={imageSrc}
              alt=""
              draggable={false}
              className="pointer-events-none absolute max-w-none"
              style={{
                width: displayW,
                height: displayH,
                left: VIEW_W / 2 + offset.x - displayW / 2,
                top: VIEW_H / 2 + offset.y - displayH / 2,
              }}
            />
          ) : (
            <div className="grid size-full place-items-center bg-surface text-[12px] text-muted-foreground">
              {error || "Loading…"}
            </div>
          )}
          <div
            className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-inset ring-black/10"
            aria-hidden
          />
        </div>

        <div className="mx-auto w-full max-w-[440px] space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Zoom</span>
            <span>{Math.round(zoom * 100)}%</span>
          </div>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            disabled={!ready || busy}
            onChange={(e) => onZoomChange(Number(e.target.value))}
            className="w-full accent-[var(--color-primary)]"
            aria-label="Zoom logo"
          />
        </div>

        {error ? (
          <p className="text-center text-[12px] text-red-600 dark:text-red-400">{error}</p>
        ) : (
          <p className="text-center text-[11px] text-muted-foreground">
            Full logo kept · aspect ratio preserved · max {MAX_OUTPUT}px on the long side
          </p>
        )}
      </div>
    </Modal>
  );
}
