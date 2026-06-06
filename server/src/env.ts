import { z } from "zod";
import "dotenv/config";
const envSchema = z.object({
  PORT: z.string().default("3000").transform((val) => parseInt(val, 10)),
});

function createEnv(env: NodeJS.ProcessEnv) {
  const safeParseResult = envSchema.safeParse(env);
  if (!safeParseResult.success) throw new Error(safeParseResult.error.message);
  return safeParseResult.data;
}
export const env = createEnv(process.env);
