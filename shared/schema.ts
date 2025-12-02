import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const sheetDataSchema = z.object({
  name: z.string(),
  rowCount: z.number(),
  columnCount: z.number(),
  headers: z.array(z.string()),
  data: z.array(z.record(z.string(), z.unknown())),
});

export const excelProcessResultSchema = z.object({
  success: z.boolean(),
  fileName: z.string(),
  fileSize: z.number(),
  sheets: z.array(sheetDataSchema),
  processingTime: z.number(),
  error: z.string().optional(),
});

export type ExcelProcessResult = z.infer<typeof excelProcessResultSchema>;

export type SheetData = z.infer<typeof sheetDataSchema>;

export type UploadState = 'idle' | 'uploading' | 'processing' | 'success' | 'error';
