import { useState } from "react";
import type { TextInputProps } from "react-native";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { colors, typography } from "../theme";

type InputFieldProps = TextInputProps & {
  label: string;
  hint?: string;
  autoComplete?:
    | "email"
    | "password"
    | "new-password"
    | "current-password"
    | "username"
    | "name"
    | "given-name"
    | "family-name"
    | "off";
  textContentType?:
    | "emailAddress"
    | "password"
    | "newPassword"
    | "username"
    | "givenName"
    | "familyName"
    | "name";
};

export const InputField = ({
  label,
  hint,
  style,
  onFocus,
  onBlur,
  autoComplete,
  textContentType,
  ...rest
}: InputFieldProps) => {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, focused && styles.inputFocused, style]}
        placeholderTextColor="rgba(255,255,255,0.4)"
        cursorColor={colors.accentPink}
        autoComplete={autoComplete}
        textContentType={textContentType}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        {...rest}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    ...typography.subtitle,
    color: colors.textPrimary,
    marginBottom: 10,
  },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(11, 5, 32, 0.72)",
    paddingHorizontal: 20,
    paddingVertical: 16,
    color: colors.textPrimary,
    ...typography.body,
    letterSpacing: 0.2,
  },
  inputFocused: {
    borderColor: colors.accentPurple,
    shadowColor: colors.accentPurple,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    backgroundColor: "rgba(156, 107, 255, 0.22)",
  },
  hint: {
    ...typography.caption,
    marginTop: 6,
    color: colors.textSecondary,
  },
});
