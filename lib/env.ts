export function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function appUrl(): string {
  return requiredEnv("NEXT_PUBLIC_APP_URL").replace(/\/+$/, "");
}
