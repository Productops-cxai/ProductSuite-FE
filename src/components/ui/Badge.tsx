type Props = {
  tone?: "success" | "danger";
  children: React.ReactNode;
};

export function Badge({ tone = "success", children }: Props) {
  return (
    <span className={`badge badge-${tone}`}>
      <span className="dot" />
      {children}
    </span>
  );
}
