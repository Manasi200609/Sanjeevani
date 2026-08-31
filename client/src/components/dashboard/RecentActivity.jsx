import {
  Activity,
  Brain,
  CheckCircle2,
  Clock3,
  UserRound,
} from "lucide-react";

const activities = [
  {
    icon: Brain,
    title: "Sanjeevani completed an agent run",
    description:
      "Anita Shinde · Follow-up increased to every 3 days",
    time: "Just now",
    type: "agent",
  },
  {
    icon: CheckCircle2,
    title: "Care decision executed",
    description:
      "Increased follow-up frequency for CT-003",
    time: "2 min ago",
    type: "success",
  },
  {
    icon: Activity,
    title: "Patient trajectory updated",
    description:
      "Anita Shinde · Risk score increased from 18 to 35",
    time: "5 min ago",
    type: "warning",
  },
  {
    icon: UserRound,
    title: "New patient event recorded",
    description:
      "CT-003 · ASHA worker visit",
    time: "18 min ago",
    type: "neutral",
  },
];

export default function RecentActivity() {
  return (
    <div className="recent-activity-card">
      <div className="section-heading">
        <div>
          <div className="section-eyebrow">
            SYSTEM ACTIVITY
          </div>

          <h2>Recent activity</h2>
        </div>

        <div className="activity-live">
          <span />
          Live
        </div>
      </div>

      <div className="activity-list">
        {activities.map((activity, index) => {
          const Icon = activity.icon;

          return (
            <div
              className="activity-item"
              key={`${activity.title}-${index}`}
            >
              <div
                className={`activity-icon ${activity.type}`}
              >
                <Icon size={16} />
              </div>

              <div className="activity-content">
                <div className="activity-title">
                  {activity.title}
                </div>

                <div className="activity-description">
                  {activity.description}
                </div>

                <div className="activity-time">
                  <Clock3 size={12} />
                  {activity.time}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}