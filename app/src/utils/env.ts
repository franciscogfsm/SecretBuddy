declare const process: {
  env: Record<string, string | undefined>;
};

export const getPublicEnv = (key: string) => process.env?.[key];

export const getPublicEnvOrThrow = (key: string) => {
  const value = getPublicEnv(key);

  if (!value) {
    throw new Error(
      `${key} is not set. Configure this value in your app config or environment.`
    );
  }

  return value;
};
