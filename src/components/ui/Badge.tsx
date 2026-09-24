type Props = {
  tone?: "success" | "danger";
  children: React.ReactNode;
};

const tones = {
  success: "bg-emerald-50 text-emerald-700",
  danger: "bg-red-50 text-red-700",
};

const dots = {
  success: "bg-emerald-500",
  danger: "bg-red-500",
};

export function Badge({ tone = "success", children }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.78rem] font-semibold ${tones[tone]}`}
    >
      <span className={`size-1.5 rounded-full ${dots[tone]}`} />
      {children}
    </span>
  );
}
