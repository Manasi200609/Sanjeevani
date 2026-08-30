import {
  Eye,
  Brain,
  ClipboardCheck,
  Play,
  MessageSquare,
  Check,
} from "lucide-react";

const stepConfig = {
  observe: {
    label: "Observe",
    icon: Eye,
  },
  reason: {
    label: "Reason",
    icon: Brain,
  },
  plan: {
    label: "Plan",
    icon: ClipboardCheck,
  },
  execute: {
    label: "Execute",
    icon: Play,
  },
  communicate: {
    label: "Communicate",
    icon: MessageSquare,
  },
};

export default function AgentSteps({
  steps = [],
}) {
  return (
    <div className="agent-steps">
      {steps.map((step, index) => {
        const config =
          stepConfig[step.step] || {
            label: step.step,
            icon: Brain,
          };

        const Icon = config.icon;

        const completed =
          step.status === "completed";

        const running =
          step.status === "running";

        return (
          <div
            className={`agent-step ${
              completed ? "completed" : ""
            } ${running ? "running" : ""}`}
            key={`${step.step}-${index}`}
          >
            <div className="agent-step-indicator">
              <div className="agent-step-icon">
                {completed ? (
                  <Check size={15} />
                ) : (
                  <Icon size={16} />
                )}
              </div>

              {index < steps.length - 1 && (
                <div
                  className={`agent-step-line ${
                    completed ? "completed" : ""
                  }`}
                />
              )}
            </div>

            <div className="agent-step-content">
              <div className="agent-step-header">
                <span className="agent-step-number">
                  {String(index + 1).padStart(2, "0")}
                </span>

                <span className="agent-step-name">
                  {config.label}
                </span>

                <span
                  className={`agent-step-status ${
                    step.status
                  }`}
                >
                  {step.status}
                </span>
              </div>

              {step.details && (
                <div className="agent-step-details">
                  {Object.entries(step.details).map(
                    ([key, value]) => (
                      <div
                        className="agent-step-detail"
                        key={key}
                      >
                        <span>
                          {key
                            .replace(
                              /([A-Z])/g,
                              " $1"
                            )
                            .replace(/^./, (char) =>
                              char.toUpperCase()
                            )}
                        </span>

                        <strong>
                          {Array.isArray(value)
                            ? value.join(", ")
                            : String(value)}
                        </strong>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {steps.length === 0 && (
        <div className="agent-empty">
          No agent steps available yet.
        </div>
      )}
    </div>
  );
}