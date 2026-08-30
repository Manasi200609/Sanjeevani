import { ArrowUpRight } from "lucide-react";

export default function StatCard({
  label,
  value,
  change,
  icon: Icon,
  type = "neutral",
}) {
  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <div className={`stat-icon ${type}`}>
          {Icon && <Icon size={19} />}
        </div>

        <ArrowUpRight
          size={17}
          className="stat-arrow"
        />
      </div>

      <div className="stat-value">
        {value}
      </div>

      <div className="stat-label">
        {label}
      </div>

      <div className={`stat-change ${type}`}>
        {change}
      </div>
    </div>
  );
}