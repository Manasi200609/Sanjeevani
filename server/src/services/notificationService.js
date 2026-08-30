// ============================================================
// NOTIFICATION SERVICE
// ============================================================
//
// CareFlow notification layer.
//
// Agent
//   ↓
// Care Decision
//   ↓
// Notification Service
//   ↓
// ASHA Worker
//
// For now we create and return notification payloads.
//
// Later this service can connect to:
// - WhatsApp
// - SMS
// - Push notifications
// - Firebase Cloud Messaging
// - Other communication providers
//
// Keeping this separate means we won't have to modify the
// agent when we add a real notification provider.
// ============================================================


// ============================================================
// NOTIFICATION TYPES
// ============================================================

const NOTIFICATION_TYPES = [
  "followup",
  "urgent_review",
  "escalation",
  "medication",
  "general",
];


// ============================================================
// PRIORITY LEVELS
// ============================================================

const PRIORITIES = [
  "normal",
  "high",
  "urgent",
];


// ============================================================
// NORMALIZE NOTIFICATION TYPE
// ============================================================

const normalizeType = (
  type
) => {
  if (
    NOTIFICATION_TYPES.includes(
      type
    )
  ) {
    return type;
  }

  return "general";
};


// ============================================================
// NORMALIZE PRIORITY
// ============================================================

const normalizePriority = (
  priority
) => {
  if (
    PRIORITIES.includes(
      priority
    )
  ) {
    return priority;
  }

  // AI may return "elevated"
  if (
    priority === "elevated"
  ) {
    return "high";
  }

  return "normal";
};


// ============================================================
// CREATE NOTIFICATION
// ============================================================
//
// This does NOT send anything externally yet.
//
// It creates a standardized notification object that can later
// be passed to WhatsApp/SMS/push providers.
// ============================================================

export const createNotification =
  ({
    patientId,
    patientCode,
    patientName,
    type = "general",
    priority = "normal",
    title,
    message,
    ashaMessage,
    scheduledFor = null,
    metadata = {},
  }) => {
    if (!patientId) {
      throw new Error(
        "patientId is required"
      );
    }

    if (
      !title &&
      !message &&
      !ashaMessage
    ) {
      throw new Error(
        "Notification content is required"
      );
    }

    return {
      patientId,

      patientCode:
        patientCode || null,

      patientName:
        patientName || null,

      type:
        normalizeType(type),

      priority:
        normalizePriority(
          priority
        ),

      title:
        title ||
        "CareFlow Patient Update",

      message:
        message ||
        ashaMessage ||
        "",

      ashaMessage:
        ashaMessage ||
        message ||
        "",

      scheduledFor,

      metadata,

      createdAt:
        new Date(),

      status:
        "pending",
    };
  };


// ============================================================
// CREATE FOLLOW-UP NOTIFICATION
// ============================================================

export const createFollowUpNotification =
  ({
    patient,
    decision,
  }) => {
    if (!patient) {
      throw new Error(
        "Patient information is required"
      );
    }

    const interval =
      decision
        ?.recommendedFollowUpIntervalDays ||
      patient.followUp
        ?.intervalDays ||
      7;

    const message =
      decision?.ashaMessage ||
      `Follow up with ${patient.name} within ${interval} day${
        interval === 1
          ? ""
          : "s"
      }.`;

    return createNotification({
      patientId:
        patient._id,

      patientCode:
        patient.patientCode,

      patientName:
        patient.name,

      type:
        "followup",

      priority:
        decision?.priority ||
        "normal",

      title:
        "Follow-up Required",

      message,

      ashaMessage:
        message,

      scheduledFor:
        patient.followUp
          ?.nextFollowUpAt ||
        null,

      metadata: {
        decisionId:
          decision?._id ||
          null,

        followUpIntervalDays:
          interval,

        decisionType:
          decision?.decisionType ||
          "maintain_followup",
      },
    });
  };


// ============================================================
// CREATE URGENT NOTIFICATION
// ============================================================

export const createUrgentNotification =
  ({
    patient,
    decision,
  }) => {
    if (!patient) {
      throw new Error(
        "Patient information is required"
      );
    }

    const message =
      decision?.ashaMessage ||
      `Urgent review required for ${patient.name}.`;

    return createNotification({
      patientId:
        patient._id,

      patientCode:
        patient.patientCode,

      patientName:
        patient.name,

      type:
        "urgent_review",

      priority:
        "urgent",

      title:
        "Urgent Patient Review",

      message,

      ashaMessage:
        message,

      metadata: {
        decisionId:
          decision?._id ||
          null,

        decisionType:
          decision?.decisionType ||
          "urgent_review",
      },
    });
  };


// ============================================================
// CREATE ESCALATION NOTIFICATION
// ============================================================

export const createEscalationNotification =
  ({
    patient,
    decision,
  }) => {
    if (!patient) {
      throw new Error(
        "Patient information is required"
      );
    }

    const message =
      decision?.ashaMessage ||
      `Immediate escalation required for ${patient.name}.`;

    return createNotification({
      patientId:
        patient._id,

      patientCode:
        patient.patientCode,

      patientName:
        patient.name,

      type:
        "escalation",

      priority:
        "urgent",

      title:
        "Patient Escalation",

      message,

      ashaMessage:
        message,

      metadata: {
        decisionId:
          decision?._id ||
          null,

        decisionType:
          decision?.decisionType ||
          "escalate",
      },
    });
  };


// ============================================================
// BUILD NOTIFICATION FROM CARE DECISION
// ============================================================
//
// Automatically chooses the correct notification based on the
// decision produced by the planning agent.
// ============================================================

export const buildNotificationFromDecision =
  ({
    patient,
    decision,
  }) => {
    if (!decision) {
      throw new Error(
        "Care decision is required"
      );
    }

    // Build evidence-enriched message
    const evidence = [];
    if (decision.keySignals?.length) {
      evidence.push(...decision.keySignals);
    }
    if (decision.contextSnapshot?.trajectoryChange) {
      evidence.push(`Trajectory: ${decision.contextSnapshot.trajectoryChange}`);
    }
    if (decision.contextSnapshot?.riskChange) {
      const dir = decision.contextSnapshot.riskChange > 0 ? 'increased' : 'decreased';
      evidence.push(`Risk ${dir} by ${Math.abs(decision.contextSnapshot.riskChange)} points`);
    }
    if (decision.previousFollowUpIntervalDays && decision.recommendedFollowUpIntervalDays) {
      evidence.push(`Follow-up: ${decision.previousFollowUpIntervalDays}d → ${decision.recommendedFollowUpIntervalDays}d`);
    }
    const evidenceStr = evidence.length ? `\nSignals: ${evidence.join('; ')}` : '';

    switch (
      decision.decisionType
    ) {
      case "escalate":
        return createEscalationNotification(
          {
            patient,
            decision: {
              ...decision,
              ashaMessage: decision.ashaMessage || `Escalation required for ${patient.name}.${evidenceStr}`,
            },
          }
        );

      case "urgent_review":
        return createUrgentNotification(
          {
            patient,
            decision: {
              ...decision,
              ashaMessage: decision.ashaMessage || `Urgent review required for ${patient.name}.${evidenceStr}`,
            },
          }
        );

      case "increase_followup":
      case "maintain_followup":
      default:
        return createFollowUpNotification(
          {
            patient,
            decision: {
              ...decision,
              ashaMessage: decision.ashaMessage || `Follow-up updated for ${patient.name}.${evidenceStr}`,
            },
          }
        );
    }
  };


// ============================================================
// SEND NOTIFICATION
// ============================================================
//
// Placeholder transport layer.
//
// At this stage we simply log the notification and return it.
//
// Later:
//
// sendNotification()
//      ↓
// WhatsApp / SMS / FCM
//
// ============================================================

export const sendNotification =
  async (
    notification
  ) => {
    if (!notification) {
      throw new Error(
        "Notification is required"
      );
    }

    console.log(
      "\n📢 CAREFLOW NOTIFICATION"
    );

    console.log(
      "Patient:",
      notification.patientName ||
        notification.patientCode ||
        notification.patientId
    );

    console.log(
      "Priority:",
      notification.priority
    );

    console.log(
      "Type:",
      notification.type
    );

    console.log(
      "Message:",
      notification.message
    );

    console.log(
      "Scheduled:",
      notification.scheduledFor ||
        "Immediately"
    );

    // --------------------------------------------------------
    // Placeholder response
    // --------------------------------------------------------

    return {
      success: true,

      status:
        "queued",

      channel:
        "internal",

      notification,
    };
  };


// ============================================================
// SEND FOLLOW-UP NOTIFICATION
// ============================================================

export const sendFollowUpNotification =
  async ({
    patient,
    decision,
  }) => {
    const notification =
      createFollowUpNotification({
        patient,
        decision,
      });

    return sendNotification(
      notification
    );
  };


// ============================================================
// SEND URGENT NOTIFICATION
// ============================================================

export const sendUrgentNotification =
  async ({
    patient,
    decision,
  }) => {
    const notification =
      createUrgentNotification({
        patient,
        decision,
      });

    return sendNotification(
      notification
    );
  };


// ============================================================
// SEND ESCALATION NOTIFICATION
// ============================================================

export const sendEscalationNotification =
  async ({
    patient,
    decision,
  }) => {
    const notification =
      createEscalationNotification({
        patient,
        decision,
      });

    return sendNotification(
      notification
    );
  };