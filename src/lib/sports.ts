// Canonical sport definitions shared across profile, session creation, and exercise fields.

export type SportCategory = "wod" | "strength" | "endurance" | "martial_arts" | "flexibility" | "team";

export interface SportDef {
  id: string;
  label: string;
  category: SportCategory;
  /** Shows Sets / Reps / Duration / Rest exercise fields */
  hasExercises: boolean;
  /** Shows the WOD timer type selector */
  isWodCompatible: boolean;
}

export const SPORTS: SportDef[] = [
  // WOD / HIIT
  { id: "crossfit",    label: "CrossFit",           category: "wod",          hasExercises: true,  isWodCompatible: true  },
  { id: "hiit",        label: "HIIT",               category: "wod",          hasExercises: true,  isWodCompatible: true  },
  { id: "functional",  label: "Functional Training",category: "wod",          hasExercises: true,  isWodCompatible: true  },
  { id: "calisthenics",label: "Calisthenics",       category: "wod",          hasExercises: true,  isWodCompatible: true  },
  // Strength
  { id: "weightlifting",label: "Weightlifting",     category: "strength",     hasExercises: true,  isWodCompatible: false },
  { id: "powerlifting", label: "Powerlifting",      category: "strength",     hasExercises: true,  isWodCompatible: false },
  { id: "bodybuilding", label: "Bodybuilding",      category: "strength",     hasExercises: true,  isWodCompatible: false },
  { id: "gym",          label: "General Gym",       category: "strength",     hasExercises: true,  isWodCompatible: false },
  // Endurance
  { id: "running",     label: "Running",            category: "endurance",    hasExercises: false, isWodCompatible: false },
  { id: "cycling",     label: "Cycling",            category: "endurance",    hasExercises: false, isWodCompatible: false },
  { id: "swimming",    label: "Swimming",           category: "endurance",    hasExercises: false, isWodCompatible: false },
  { id: "rowing",      label: "Rowing",             category: "endurance",    hasExercises: false, isWodCompatible: false },
  { id: "triathlon",   label: "Triathlon",          category: "endurance",    hasExercises: false, isWodCompatible: false },
  // Flexibility
  { id: "yoga",        label: "Yoga",               category: "flexibility",  hasExercises: false, isWodCompatible: false },
  { id: "pilates",     label: "Pilates",            category: "flexibility",  hasExercises: true,  isWodCompatible: false },
  // Martial Arts
  { id: "boxing",      label: "Boxing",             category: "martial_arts", hasExercises: true,  isWodCompatible: true  },
  { id: "mma",         label: "MMA / Kickboxing",   category: "martial_arts", hasExercises: true,  isWodCompatible: true  },
  { id: "bjj",         label: "BJJ / Grappling",   category: "martial_arts", hasExercises: false, isWodCompatible: false },
  // Team Sports
  { id: "basketball",  label: "Basketball",         category: "team",         hasExercises: false, isWodCompatible: false },
  { id: "football",    label: "Football / Soccer",  category: "team",         hasExercises: false, isWodCompatible: false },
  { id: "tennis",      label: "Tennis",             category: "team",         hasExercises: false, isWodCompatible: false },
];

export const SPORT_MAP: Record<string, SportDef> = Object.fromEntries(SPORTS.map((s) => [s.id, s]));

export const CATEGORY_LABELS: Record<SportCategory, string> = {
  wod:          "WOD / HIIT",
  strength:     "Strength",
  endurance:    "Endurance",
  martial_arts: "Martial Arts",
  flexibility:  "Flexibility",
  team:         "Team Sports",
};

// ── WOD exercise field configuration ─────────────────────────────────────────

export type ExerciseField = "sets" | "reps" | "durationSeconds" | "restSeconds";
export type WodType = "AMRAP" | "FOR_TIME" | "EMOM" | "TABATA" | "MIX";

export interface FieldConfig {
  field: ExerciseField;
  label: string;
  placeholder: string;
}

/** Fields shown per WOD type */
export const WOD_FIELD_MAP: Record<WodType, FieldConfig[]> = {
  AMRAP:    [
    { field: "durationSeconds", label: "TIME CAP (s)",   placeholder: "e.g. 600" },
    { field: "reps",            label: "REPS / ROUND",   placeholder: "e.g. 10"  },
  ],
  FOR_TIME: [
    { field: "sets",            label: "ROUNDS",          placeholder: "e.g. 5"  },
    { field: "reps",            label: "REPS / ROUND",   placeholder: "e.g. 10"  },
  ],
  EMOM:     [
    { field: "sets",            label: "TOTAL MINUTES",   placeholder: "e.g. 10"  },
    { field: "reps",            label: "REPS / MINUTE",   placeholder: "e.g. 15"  },
  ],
  TABATA:   [
    { field: "sets",            label: "ROUNDS",          placeholder: "e.g. 8"   },
  ],
  MIX:      [
    { field: "sets",            label: "SETS",            placeholder: "Sets"      },
    { field: "reps",            label: "REPS",            placeholder: "Reps"      },
    { field: "durationSeconds", label: "DURATION (s)",    placeholder: "Duration"  },
    { field: "restSeconds",     label: "REST (s)",        placeholder: "Rest"      },
  ],
};

/** Standard fields for strength / structured sports (no WOD timer) */
export const STRENGTH_FIELDS: FieldConfig[] = [
  { field: "sets",            label: "SETS",         placeholder: "Sets"      },
  { field: "reps",            label: "REPS",         placeholder: "Reps"      },
  { field: "durationSeconds", label: "DURATION (s)", placeholder: "Duration"  },
  { field: "restSeconds",     label: "REST (s)",     placeholder: "Rest"      },
];

export const WOD_OPTIONS: WodType[] = ["AMRAP", "FOR_TIME", "EMOM", "TABATA", "MIX"];

/** Returns which exercise fields to show given a sport and selected WOD type. */
export function getExerciseFields(sport: SportDef | undefined, wodType: string): FieldConfig[] {
  if (!sport?.hasExercises) return [];
  if (!sport.isWodCompatible || !wodType) return STRENGTH_FIELDS;
  return WOD_FIELD_MAP[wodType as WodType] ?? STRENGTH_FIELDS;
}

/** Find a sport by its id (exact) or by a legacy free-text sport name (case-insensitive). */
export function findSport(value: string): SportDef | undefined {
  const exact = SPORT_MAP[value];
  if (exact) return exact;
  const lower = value.toLowerCase();
  return SPORTS.find((s) => s.label.toLowerCase() === lower || s.id === lower);
}
