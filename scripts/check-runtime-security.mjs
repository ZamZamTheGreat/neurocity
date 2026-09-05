if (process.env.NODE_ENV === "production") {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL is required in production.");
  }
  if (process.env.DATABASE_MIGRATION_URL?.trim()) {
    throw new Error(
      "DATABASE_MIGRATION_URL must not be exposed to the production web service. Run migrations from a separate trusted operator or CI environment.",
    );
  }
}

console.log("Runtime security configuration accepted.");
