const databaseUrl = process.env.DATABASE_URL;
if (process.env.NODE_ENV === "production" && !databaseUrl) {
  throw new Error("DATABASE_URL is missing. Add the Render PostgreSQL Internal Database URL to the neurocity web service environment.");
}

export default {
  out: "./drizzle-postgres",
  schema: "./db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl ?? "postgres://postgres:postgres@localhost:5432/neurocity",
    ssl: databaseUrl && !databaseUrl.includes("localhost") ? "require" : false,
  },
};
