import {
  buildNotificationFromDecision,
  sendNotification,
} from "../services/notificationService.js";

export const communicateCareDecision = async ({
  patient,
  decision,
}) => {
  const notification =
    buildNotificationFromDecision({
      patient,
      decision,
    });

  return sendNotification(notification);
};
