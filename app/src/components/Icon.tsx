import React, { memo } from "react";
import { ViewStyle } from "react-native";
import * as Outline from "react-native-heroicons/outline";
import * as Solid from "react-native-heroicons/solid";

type Variant = "outline" | "solid";

interface Props {
  name: string; // PascalCase name, e.g. 'Clock', 'Eye', 'ChevronRight'
  size?: number;
  color?: string;
  variant?: Variant;
  style?: ViewStyle;
}

export const Icon = memo(function Icon({
  name,
  size = 18,
  color = "#fff",
  variant = "outline",
  style,
}: Props) {
  const set = variant === "solid" ? Solid : Outline;
  // Try a few strategies to find a matching component in the heroicons set.
  const normalize = (s: string) => s.replace(/[^a-z0-9]/gi, "").toLowerCase();

  // Helpful aliases for common icon names used across the app
  const aliases: Record<string, string> = {
    timer: "Clock",
    time: "Clock",
    clock: "Clock",
    chatbubbles: "ChatBubbleLeftEllipsis",
    chat: "ChatBubbleLeftEllipsis",
    "chevron-forward": "ChevronRight",
    "chevron-right": "ChevronRight",
    chevron: "ChevronRight",
    "checkmark-done": "Check",
    checkmark: "Check",
    check: "Check",
    eye: "Eye",
  };

  const requested = name || "";
  const norm = normalize(requested);

  // 1) direct lookup by key
  // @ts-ignore
  if (set[requested]) {
    // @ts-ignore
    const C = set[requested];
    return <C color={color} width={size} height={size} style={style} />;
  }

  // 2) alias match
  if (aliases[norm]) {
    const aliasKey = aliases[norm];
    // @ts-ignore
    if (set[aliasKey]) {
      // @ts-ignore
      const C = set[aliasKey];
      return <C color={color} width={size} height={size} style={style} />;
    }
  }

  // 3) fuzzy search across available keys (case-insensitive, partial)
  const keys = Object.keys(set);
  const foundKey =
    keys.find((k) => normalize(k) === norm) ||
    keys.find((k) => normalize(k).includes(norm)) ||
    keys.find((k) => norm.includes(normalize(k)));
  if (foundKey) {
    // @ts-ignore
    const C = set[foundKey];
    return <C color={color} width={size} height={size} style={style} />;
  }

  // If nothing matched, return null so the calling code can fallback if needed
  return null;
});

export default Icon;
