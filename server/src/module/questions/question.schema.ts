import { pgTable, text, timestamp, pgEnum, doublePrecision, jsonb } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { sections } from "../sections/section.schema.js";

export const questionTypeEnum = pgEnum("question_type", ["mcq", "descriptive"]);

export const questions = pgTable("questions", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  sectionId: text("section_id").references(() => sections.id, { onDelete: "cascade" }).notNull(),
  type: questionTypeEnum("type").notNull(),
  description: text("description").notNull(),
  images: jsonb("images").$type<{ url: string; publicId: string }[]>(),
  marks: doublePrecision("marks").notNull(),
  modelAnswer: text("model_answer"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;
