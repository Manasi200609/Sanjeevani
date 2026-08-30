import Patient from "../models/Patient.js";

/**
 * ============================================================
 * FOLLOW-UP MONITOR
 * ============================================================
 *
 * Finds patients whose next follow-up is due.
 *
 * This does NOT directly make a medical decision.
 * It identifies patients that need the agent's attention.
 *
 * Flow:
 *
 * Scheduler
 *    ↓
 * followUpMonitor
 *    ↓
 * Find due patients
 *    ↓
 * Agent orchestrator
 *    ↓
 * Observe → Reason → Plan → Execute
 *
 * ============================================================
 */

// ============================================================
// FIND DUE PATIENTS
// ============================================================

export const getDuePatients = async () => {
  const now = new Date();

  const patients = await Patient.find({
    isActive: true,

    "followUp.required": true,

    "followUp.nextFollowUpAt": {
      $lte: now,
    },
  }).sort({
    "followUp.nextFollowUpAt": 1,
  });

  return patients;
};

// ============================================================
// FIND UPCOMING PATIENTS
// ============================================================

export const getUpcomingPatients = async (
  withinHours = 24
) => {
  const now = new Date();

  const future = new Date(
    now.getTime() +
      withinHours *
        60 *
        60 *
        1000
  );

  const patients = await Patient.find({
    isActive: true,

    "followUp.required": true,

    "followUp.nextFollowUpAt": {
      $gte: now,
      $lte: future,
    },
  }).sort({
    "followUp.nextFollowUpAt": 1,
  });

  return patients;
};

// ============================================================
// GET OVERDUE PATIENTS
// ============================================================

export const getOverduePatients = async () => {
  const now = new Date();

  const patients = await Patient.find({
    isActive: true,

    "followUp.required": true,

    "followUp.nextFollowUpAt": {
      $lt: now,
    },
  }).sort({
    "followUp.nextFollowUpAt": 1,
  });

  return patients;
};

// ============================================================
// BUILD FOLLOW-UP QUEUE
// ============================================================

export const buildFollowUpQueue = async () => {
  const [
    overduePatients,
    duePatients,
    upcomingPatients,
  ] = await Promise.all([
    getOverduePatients(),

    getDuePatients(),

    getUpcomingPatients(24),
  ]);

  // ----------------------------------------------------------
  // Remove duplicates
  // ----------------------------------------------------------

  const patientMap = new Map();

  [
    ...overduePatients,
    ...duePatients,
    ...upcomingPatients,
  ].forEach((patient) => {
    patientMap.set(
      patient._id.toString(),
      patient
    );
  });

  const patients = [
    ...patientMap.values(),
  ];

  // ----------------------------------------------------------
  // Sort by urgency
  // ----------------------------------------------------------

  patients.sort((a, b) => {
    const priorityRank = {
      critical: 0,
      elevated: 1,
      high: 2,
      normal: 3,
      low: 4,
    };

    const aPriority =
      priorityRank[a.priority] ?? 99;

    const bPriority =
      priorityRank[b.priority] ?? 99;

    if (
      aPriority !== bPriority
    ) {
      return (
        aPriority - bPriority
      );
    }

    const aDate =
      a.followUp?.nextFollowUpAt
        ? new Date(
            a.followUp.nextFollowUpAt
          ).getTime()
        : Infinity;

    const bDate =
      b.followUp?.nextFollowUpAt
        ? new Date(
            b.followUp.nextFollowUpAt
          ).getTime()
        : Infinity;

    return aDate - bDate;
  });

  return {
    generatedAt: new Date(),

    total: patients.length,

    overdue: overduePatients.length,

    due: duePatients.length,

    upcoming:
      upcomingPatients.length,

    patients,
  };
};

// ============================================================
// GET FOLLOW-UP STATUS
// ============================================================

export const getFollowUpStatus = (
  patient
) => {
  if (
    !patient.followUp?.required
  ) {
    return "not_required";
  }

  if (
    !patient.followUp?.nextFollowUpAt
  ) {
    return "unscheduled";
  }

  const now = new Date();

  const nextFollowUp =
    new Date(
      patient.followUp
        .nextFollowUpAt
    );

  if (nextFollowUp <= now) {
    return "due";
  }

  const hoursUntil =
    (
      nextFollowUp.getTime() -
      now.getTime()
    ) /
    (1000 * 60 * 60);

  if (hoursUntil <= 24) {
    return "upcoming";
  }

  return "scheduled";
};

// ============================================================
// GET PATIENT FOLLOW-UP SUMMARY
// ============================================================

export const getPatientFollowUpSummary =
  (patient) => {
    const status =
      getFollowUpStatus(
        patient
      );

    return {
      patientId:
        patient._id,

      patientCode:
        patient.patientCode,

      name:
        patient.name,

      priority:
        patient.priority,

      currentState:
        patient.currentState,

      trajectoryStatus:
        patient.trajectoryStatus,

      followUp: {
        required:
          patient.followUp
            ?.required ?? false,

        intervalDays:
          patient.followUp
            ?.intervalDays ?? null,

        nextFollowUpAt:
          patient.followUp
            ?.nextFollowUpAt ??
          null,

        status,
      },
    };
  };

// ============================================================
// MONITOR FOLLOW-UP
// ============================================================

export const monitorFollowUps =
  async () => {
    const queue =
      await buildFollowUpQueue();

    const summaries =
      queue.patients.map(
        getPatientFollowUpSummary
      );

    console.log(
      "\n========================================"
    );

    console.log(
      "🩺 CAREFLOW FOLLOW-UP MONITOR"
    );

    console.log(
      "========================================"
    );

    console.log(
      `📋 Total patients: ${queue.total}`
    );

    console.log(
      `🔴 Overdue: ${queue.overdue}`
    );

    console.log(
      `🟡 Due: ${queue.due}`
    );

    console.log(
      `🟢 Upcoming: ${queue.upcoming}`
    );

    console.log(
      "========================================\n"
    );

    return {
      ...queue,
      patients: summaries,
    };
  };

// ============================================================
// FIND PATIENTS REQUIRING AGENT ATTENTION
// ============================================================

export const getPatientsRequiringAttention =
  async () => {
    const patients =
      await Patient.find({
        isActive: true,

        $or: [
          {
            "followUp.nextFollowUpAt":
              {
                $lte: new Date(),
              },
          },

          {
            trajectoryStatus:
              "worsening",
          },

          {
            priority: {
              $in: [
                "elevated",
                "high",
                "critical",
              ],
            },
          },

          {
            currentState:
              "urgent",
          },
        ],
      }).sort({
        priority: 1,
        "followUp.nextFollowUpAt": 1,
      });

    return patients;
  };