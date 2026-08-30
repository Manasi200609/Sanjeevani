import { AlertTriangle, CheckCircle2, Eye } from "lucide-react";

const statusConfig = {
  stable: {
    label: "Stable",
    icon: CheckCircle2,
  },
  watch: {
    label: "Watch",
    icon: Eye,
  },
  worsening: {
    label: "Worsening",
    icon: AlertTriangle,
  },
};

export default function PatientStatusBadge({
  status = "stable",
}) {
  const normalizedStatus =
    String(status).toLowerCase();

  const config =
    statusConfig[normalizedStatus] ||
    statusConfig.stable;

  const Icon = config.icon;

  return (
    <span
      className={`patient-status-badge ${normalizedStatus}`}
    >
      <Icon size={14} />
      {config.label}
    </span>
  );
}