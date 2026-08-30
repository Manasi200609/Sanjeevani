import { CalendarClock, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function UpcomingFollowUp() {
  const navigate = useNavigate();

  return (
    <div className="p-followup-card">
      <div className="p-followup-header">
        <div className="p-followup-icon">
          <CalendarClock size={18} />
        </div>
        <div>
          <div className="p-followup-label">UPCOMING FOLLOW-UP</div>
          <div className="p-followup-date">In 3 days</div>
        </div>
      </div>

      <p className="p-followup-note">
        Your next health check-up is scheduled soon.
        Vaidya will help you prepare.
      </p>

      <button
        type="button"
        className="p-followup-link"
        onClick={() => navigate("/patient/health")}
      >
        View details <ArrowRight size={14} />
      </button>

      <style>{`
        .p-followup-card {
          padding: 20px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
        }

        .p-followup-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .p-followup-icon {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          background: var(--teal-light);
          color: var(--teal);
        }

        .p-followup-label {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.8px;
          color: var(--muted);
        }

        .p-followup-date {
          font-family: "Manrope", sans-serif;
          font-size: 15px;
          font-weight: 700;
          color: var(--text);
          margin-top: 2px;
        }

        .p-followup-note {
          margin: 0 0 14px;
          color: var(--muted);
          font-size: 12px;
          line-height: 1.6;
        }

        .p-followup-link {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 0;
          background: transparent;
          color: var(--green);
          font-size: 11px;
          font-weight: 600;
        }

        .p-followup-link:hover {
          opacity: 0.8;
        }
      `}</style>
    </div>
  );
}
