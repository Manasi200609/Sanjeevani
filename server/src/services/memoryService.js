import Memory from "../models/Memory.js";
import Patient from "../models/Patient.js";

const MEMORY_TYPES = [
  "timeline_summary",
  "clinical_pattern",
  "care_history",
  "risk_history",
  "preference",
  "agent_learning",
];

const normalizeMemoryType = (type) =>
  MEMORY_TYPES.includes(type)
    ? type
    : "timeline_summary";

export const createMemory = async ({
  patientId,
  memoryType,
  periodStart,
  periodEnd,
  summary,
  keySignals = [],
  symptomPatterns = [],
  medicationPatterns = [],
  riskHistory = {},
  careHistory = {},
  sourceEventIds = [],
  version = 1,
  isActive = true,
  generatedBy = "system",
  confidence = null,
}) => {
  const patient =
    await Patient.findById(patientId);

  if (!patient) {
    throw new Error("Patient not found");
  }

  if (!summary?.trim()) {
    throw new Error("Memory summary is required");
  }

  return Memory.create({
    patientId,
    memoryType:
      normalizeMemoryType(memoryType),
    periodStart:
      periodStart || new Date(),
    periodEnd:
      periodEnd || new Date(),
    summary: summary.trim(),
    keySignals: Array.isArray(keySignals)
      ? keySignals
      : [],
    symptomPatterns:
      Array.isArray(symptomPatterns)
        ? symptomPatterns
        : [],
    medicationPatterns:
      Array.isArray(medicationPatterns)
        ? medicationPatterns
        : [],
    riskHistory,
    careHistory,
    sourceEventIds:
      Array.isArray(sourceEventIds)
        ? sourceEventIds
        : [],
    version,
    isActive,
    generatedBy,
    confidence,
  });
};

export const deactivateMemoriesForPeriod = async ({
  patientId,
  startDate,
  endDate,
}) => {
  return Memory.updateMany(
    {
      patientId,
      isActive: true,
      periodStart: {
        $lte: endDate,
      },
      periodEnd: {
        $gte: startDate,
      },
    },
    {
      $set: {
        isActive: false,
      },
    }
  );
};

export const getMemoryById = async (memoryId) => {
  const memory =
    await Memory.findById(memoryId);

  if (!memory) {
    throw new Error("Memory not found");
  }

  return memory;
};

export const getPatientMemories = async (
  patientId,
  {
    limit = 50,
    type,
    activeOnly = true,
  } = {}
) => {
  const filter = { patientId };

  if (activeOnly) {
    filter.isActive = true;
  }

  if (type) {
    filter.memoryType =
      normalizeMemoryType(type);
  }

  return Memory.find(filter)
    .sort({
      periodEnd: -1,
      version: -1,
    })
    .limit(Number(limit))
    .lean();
};

export const getImportantMemories = async (
  patientId,
  limit = 20
) => {
  return Memory.find({
    patientId,
    isActive: true,
  })
    .sort({
      periodEnd: -1,
      confidence: -1,
    })
    .limit(Number(limit))
    .lean();
};

export const searchMemories = async ({
  patientId,
  query,
  limit = 10,
}) => {
  if (!query?.trim()) {
    throw new Error(
      "Memory search query is required"
    );
  }

  return Memory.find({
    patientId,
    isActive: true,
    $or: [
      {
        summary: {
          $regex: query.trim(),
          $options: "i",
        },
      },
      {
        keySignals: {
          $regex: query.trim(),
          $options: "i",
        },
      },
    ],
  })
    .sort({ periodEnd: -1 })
    .limit(Number(limit))
    .lean();
};

export const getMemoriesByType = async (
  patientId,
  type,
  limit = 20
) =>
  Memory.find({
    patientId,
    memoryType:
      normalizeMemoryType(type),
    isActive: true,
  })
    .sort({ periodEnd: -1 })
    .limit(Number(limit))
    .lean();

export const updateMemory = async (
  memoryId,
  updates
) => {
  const safe = { ...updates };

  delete safe._id;
  delete safe.patientId;
  delete safe.createdAt;
  delete safe.updatedAt;
  delete safe.__v;

  if (safe.memoryType) {
    safe.memoryType =
      normalizeMemoryType(
        safe.memoryType
      );
  }

  const memory =
    await Memory.findByIdAndUpdate(
      memoryId,
      { $set: safe },
      {
        new: true,
        runValidators: true,
      }
    );

  if (!memory) {
    throw new Error("Memory not found");
  }

  return memory;
};

export const deleteMemory = async (
  memoryId
) => {
  const memory =
    await Memory.findByIdAndDelete(
      memoryId
    );

  if (!memory) {
    throw new Error("Memory not found");
  }

  return memory;
};

export const countPatientMemories =
  async (patientId) =>
    Memory.countDocuments({
      patientId,
      isActive: true,
    });

export const buildMemoryContext = async (
  patientId,
  { limit = 20 } = {}
) => {
  const memories =
    await getPatientMemories(
      patientId,
      { limit }
    );

  return {
    memories,
    total: memories.length,
  };
};
