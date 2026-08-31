import { useNavigate } from "react-router-dom";
import {
  HeartPulse,
  MessageCircle,
  ArrowRight,
} from "lucide-react";

const roles = [
  {
    id: "asha",
    title: "ASHA Worker",
    description:
      "Coordinate patients, monitor health trajectories, and receive intelligent care recommendations.",
    icon: HeartPulse,
    route: "/asha/dashboard",
    accent: "green",
    logo: "/images/sanjeevani-green.png",
  },
  {
    id: "patient",
    title: "Patient",
    description:
      "Talk to your health assistant, understand your health, and stay connected with your care.",
    icon: MessageCircle,
    route: "/patient/home",
    accent: "blue",
    logo: "/images/sanjeevani-blue.png",
  },
];

export default function RoleSelector() {
  const navigate = useNavigate();

  return (
    <div className="role-selector">
      <div className="role-selector-bg" />

      <div className="role-selector-content">
        <div className="role-selector-brand">
          <img
            src="/images/sanjeevani-green.png"
            alt="Sanjeevani"
            style={{ width: 88, height: 88, objectFit: "contain" }}
          />
        </div>

        <h1 className="role-selector-title">
          Welcome to Sanjeevani
        </h1>
        <p className="role-selector-subtitle">
          How would you like to continue?
        </p>

        <div className="role-cards">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <button
                key={role.id}
                type="button"
                className={`role-card role-card-${role.accent}`}
                onClick={() => navigate(role.route)}
              >
                <div className="role-card-logo">
                  <img
                    src={role.logo}
                    alt=""
                    style={{ width: 60, height: 60, objectFit: "contain" }}
                  />
                </div>

                <div className="role-card-body">
                  <h2>{role.title}</h2>
                  <p>{role.description}</p>
                </div>

                <div className="role-card-action">
                  <span>Continue</span>
                  <ArrowRight size={16} />
                </div>
              </button>
            );
          })}
        </div>

        <p className="role-selector-footer">
          Sanjeevani — Life-giving care, revived by attention
        </p>
      </div>

      <style>{`
        .role-selector {
          position: fixed;
          inset: 0;
          z-index: 999;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #020C1B;
          overflow: hidden;
        }

        .role-selector-bg {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 80% 50% at 50% -10%, rgba(16, 185, 129, 0.06), transparent),
            radial-gradient(ellipse 60% 40% at 80% 100%, rgba(56, 189, 248, 0.04), transparent);
          pointer-events: none;
        }

        .role-selector-content {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          max-width: 640px;
          padding: 32px 24px;
          animation: roleFadeIn 0.6s ease both;
        }

        @keyframes roleFadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .role-selector-brand {
          margin-bottom: 28px;
          opacity: 0.95;
        }

        .role-selector-title {
          margin: 0;
          font-family: "Manrope", sans-serif;
          font-size: 28px;
          font-weight: 700;
          letter-spacing: -0.7px;
          color: #F0F4F8;
          text-align: center;
        }

        .role-selector-subtitle {
          margin: 8px 0 0;
          color: #64748B;
          font-size: 13px;
          text-align: center;
        }

        .role-cards {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          width: 100%;
          margin-top: 32px;
        }

        @media (max-width: 560px) {
          .role-cards {
            grid-template-columns: 1fr;
          }
        }

        .role-card {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 16px;
          padding: 28px 24px;
          background: rgba(17, 34, 64, 0.6);
          border: 1px solid rgba(148, 163, 184, 0.1);
          border-radius: 14px;
          text-align: left;
          cursor: pointer;
          backdrop-filter: blur(8px);
          transition:
            box-shadow 0.2s ease,
            transform 0.2s ease,
            border-color 0.2s ease;
        }

        .role-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .role-card-green:hover {
          border-color: rgba(16, 185, 129, 0.4);
        }

        .role-card-blue:hover {
          border-color: rgba(56, 189, 248, 0.4);
        }

        .role-card-logo {
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.04);
        }

        .role-card-body h2 {
          margin: 0;
          font-family: "Manrope", sans-serif;
          font-size: 16px;
          font-weight: 700;
          letter-spacing: -0.3px;
          color: #F0F4F8;
        }

        .role-card-body p {
          margin: 6px 0 0;
          color: #94A3B8;
          font-size: 12px;
          line-height: 1.6;
        }

        .role-card-action {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-top: auto;
          padding-top: 12px;
          font-size: 11px;
          font-weight: 600;
        }

        .role-card-green .role-card-action {
          color: #10B981;
        }

        .role-card-blue .role-card-action {
          color: #38BDF8;
        }

        .role-card-action svg {
          transition: transform 0.2s ease;
        }

        .role-card:hover .role-card-action svg {
          transform: translateX(3px);
        }

        .role-selector-footer {
          margin: 36px 0 0;
          color: #475569;
          font-size: 10px;
          letter-spacing: 0.5px;
          text-align: center;
        }
      `}</style>
    </div>
  );
}
