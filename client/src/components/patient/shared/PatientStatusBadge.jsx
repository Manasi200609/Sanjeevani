const STATUS_MAP = {
  stable: { label: "Stable", color: "var(--green)", bg: "var(--green-light)" },
  watch: { label: "Watch", color: "var(--amber)", bg: "var(--amber-light)" },
  worsening: { label: "Needs Attention", color: "var(--coral)", bg: "var(--coral-light)" },
  improving: { label: "Improving", color: "var(--teal)", bg: "var(--teal-light)" },
};

export default function PatientStatusBadge({ status = "stable" }) {
  const key = String(status).toLowerCase();
  const config = STATUS_MAP[key] || STATUS_MAP.stable;

  return (
    <span
      className="p-status-badge"
      style={{
        color: config.color,
        background: config.bg,
      }}
    >
      {config.label}

      <style>{`
        .p-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
        }
      `}</style>
    </span>
  );
}
