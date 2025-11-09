import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../theme";

export interface PasswordStrength {
  score: number; // 0-4
  label: string;
  color: string;
  feedback: string[];
}

export const validatePasswordStrength = (
  password: string
): PasswordStrength => {
  const feedback: string[] = [];
  let score = 0;

  // Length check
  if (password.length >= 8) {
    score++;
  } else {
    feedback.push("At least 8 characters");
  }

  // Uppercase check
  if (/[A-Z]/.test(password)) {
    score++;
  } else {
    feedback.push("One uppercase letter");
  }

  // Lowercase check
  if (/[a-z]/.test(password)) {
    score++;
  } else {
    feedback.push("One lowercase letter");
  }

  // Number check
  if (/[0-9]/.test(password)) {
    score++;
  } else {
    feedback.push("One number");
  }

  // Special character check (optional, adds extra strength)
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    score++;
  }

  // Determine label and color
  let label = "Weak";
  let color = "#EF4444"; // red

  if (score === 0) {
    label = "Too Weak";
    color = "#DC2626";
  } else if (score === 1 || score === 2) {
    label = "Weak";
    color = "#EF4444";
  } else if (score === 3) {
    label = "Fair";
    color = "#F59E0B"; // orange
  } else if (score === 4) {
    label = "Good";
    color = "#10B981"; // green
  } else if (score === 5) {
    label = "Strong";
    color = "#059669"; // dark green
  }

  return { score, label, color, feedback };
};

interface Props {
  password: string;
  visible?: boolean;
}

export const PasswordStrengthIndicator: React.FC<Props> = ({
  password,
  visible = true,
}) => {
  if (!visible || !password) {
    return null;
  }

  const strength = validatePasswordStrength(password);

  return (
    <View style={styles.container}>
      {/* Strength bars */}
      <View style={styles.barsContainer}>
        {[0, 1, 2, 3, 4].map((index) => (
          <View
            key={index}
            style={[
              styles.bar,
              index < strength.score
                ? { backgroundColor: strength.color }
                : styles.barInactive,
            ]}
          />
        ))}
      </View>

      {/* Label and feedback */}
      <View style={styles.textContainer}>
        <Text style={[styles.label, { color: strength.color }]}>
          {strength.label}
        </Text>
        {strength.feedback.length > 0 && (
          <Text style={styles.feedback}>
            Need: {strength.feedback.join(", ")}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 4,
  },
  barsContainer: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 6,
  },
  bar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  barInactive: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  textContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
  },
  feedback: {
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
  },
});
