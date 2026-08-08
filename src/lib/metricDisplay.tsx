import {
  Activity,
  Bike,
  Bone,
  Croissant,
  Droplet,
  Droplets,
  Flame,
  Footprints,
  Gauge,
  Wind,
  HeartPulse,
  Moon,
  Mountain,
  MoveUpRight,
  Route,
  Ruler,
  Building2,
  Scale,

  Thermometer,
  TrendingUp,
  Waves,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { useTranslations } from "next-intl";
import { METRIC_META, metricMeta, type MetricGroup } from "@/lib/metricCatalog";

/**
 * Presentation for open metric keys — icon, accent colour, and the i18n lookup.
 *
 * Metric keys are open, so nothing here is required: a key with no entry gets
 * the group's fallback icon and a humanised label. This file only makes the
 * metrics we anticipated look deliberate.
 */

interface MetricStyle {
  icon: LucideIcon;
  /** Tailwind text colour for the icon. */
  color: string;
}

export const METRIC_ICONS: Record<string, MetricStyle> = {
  HEART_RATE: { icon: HeartPulse, color: "text-red-500" },
  RESTING_HEART_RATE: { icon: HeartPulse, color: "text-rose-500" },
  HRV: { icon: Waves, color: "text-violet-500" },
  SPO2: { icon: Droplets, color: "text-sky-500" },
  RESPIRATORY_RATE: { icon: Wind, color: "text-cyan-500" },
  BLOOD_PRESSURE_SYSTOLIC: { icon: Gauge, color: "text-rose-500" },
  BLOOD_PRESSURE_DIASTOLIC: { icon: Gauge, color: "text-rose-400" },

  SLEEP_MINUTES: { icon: Moon, color: "text-indigo-500" },
  SKIN_TEMPERATURE: { icon: Thermometer, color: "text-orange-500" },
  BASAL_BODY_TEMPERATURE: { icon: Thermometer, color: "text-amber-500" },

  STEPS: { icon: Footprints, color: "text-emerald-500" },
  DISTANCE: { icon: Route, color: "text-teal-500" },
  CALORIES: { icon: Flame, color: "text-red-500" },
  ACTIVE_CALORIES: { icon: Flame, color: "text-orange-500" },
  BASAL_CALORIES: { icon: Flame, color: "text-amber-400" },
  BASAL_METABOLIC_RATE: { icon: Flame, color: "text-amber-500" },
  FLOORS_CLIMBED: { icon: Building2, color: "text-lime-600" },
  ELEVATION_GAINED: { icon: Mountain, color: "text-green-600" },
  EXERCISE_MINUTES: { icon: Activity, color: "text-emerald-600" },
  WHEELCHAIR_PUSHES: { icon: MoveUpRight, color: "text-emerald-500" },

  POWER: { icon: Zap, color: "text-yellow-500" },
  SPEED: { icon: Gauge, color: "text-blue-500" },
  CYCLING_CADENCE: { icon: Bike, color: "text-blue-600" },
  STEPS_CADENCE: { icon: Footprints, color: "text-blue-400" },
  WALKING_STEP_LENGTH: { icon: Ruler, color: "text-blue-300" },
  VO2_MAX: { icon: TrendingUp, color: "text-purple-500" },

  WEIGHT: { icon: Scale, color: "text-slate-500" },
  HEIGHT: { icon: Ruler, color: "text-slate-500" },
  BODY_FAT: { icon: Scale, color: "text-amber-600" },
  LEAN_BODY_MASS: { icon: Scale, color: "text-emerald-600" },
  BONE_MASS: { icon: Bone, color: "text-stone-500" },
  BODY_WATER_MASS: { icon: Droplet, color: "text-sky-600" },

  HYDRATION: { icon: Droplet, color: "text-cyan-500" },
  BLOOD_GLUCOSE: { icon: Droplet, color: "text-fuchsia-500" },
  NUTRITION_CALORIES: { icon: Croissant, color: "text-orange-400" },
};

/** Fallback icon per group, for metrics with no explicit entry. */
const GROUP_FALLBACK: Record<MetricGroup, MetricStyle> = {
  cardio: { icon: HeartPulse, color: "text-red-400" },
  recovery: { icon: Moon, color: "text-indigo-400" },
  activity: { icon: Activity, color: "text-emerald-400" },
  performance: { icon: Gauge, color: "text-blue-400" },
  body: { icon: Scale, color: "text-slate-400" },
  nutrition: { icon: Droplet, color: "text-cyan-400" },
  other: { icon: Activity, color: "text-muted-foreground" },
};

export function metricStyle(key: string): MetricStyle {
  return METRIC_ICONS[key] ?? GROUP_FALLBACK[metricMeta(key).group];
}

/**
 * Localised metric name.
 *
 * `t` is a next-intl translator scoped to `vitals.metric`. Keys we ship a
 * translation for use it; anything else falls back to the catalog's English
 * label, then to a humanised version of the key itself. next-intl throws on a
 * missing key rather than returning a default, hence the try/catch.
 */
export type MetricTranslator = ReturnType<typeof useTranslations<"vitals.metric">>;

export function metricLabel(t: MetricTranslator, key: string): string {
  if (key in METRIC_META) {
    try {
      // next-intl types the translator against the keys it found in the message
      // files. Metric keys are open, so the lookup is necessarily dynamic — the
      // `key in METRIC_META` guard above is what keeps it honest.
      return (t as (k: string) => string)(key);
    } catch {
      // No translation shipped for this key yet.
    }
  }
  return metricMeta(key).label;
}
