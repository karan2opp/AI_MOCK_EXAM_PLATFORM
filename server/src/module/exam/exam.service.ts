import { eq, and } from "drizzle-orm";
import db from "../../common/db/index.js";
import { exams } from "../../common/db/schema.js";
import { ApiError } from "../../common/utils/ApiError.js";
import type { CreateExamDto, UpdateExamDto } from "./dto/exam.dto.js";

// ── Generate Join Code ─────────────────────────────────────────────────────────
const generateJoinCode = (): string => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// ── Create Exam ────────────────────────────────────────────────────────────────
const createExam = async (data: CreateExamDto, teacherId: string) => {
    let joinCode = generateJoinCode();

    // ensure join code is unique
    let existing = await db.select().from(exams).where(eq(exams.joinCode, joinCode));
    while (existing.length > 0) {
        joinCode = generateJoinCode();
        existing = await db.select().from(exams).where(eq(exams.joinCode, joinCode));
    }

    const [exam] = await db.insert(exams).values({
        ...data,
        joinCode,
        createdBy: teacherId,
    }).returning();

    if (!exam) throw ApiError.internal("Failed to create exam");
    return exam;
};

// ── Get All Exams (teacher sees only his own) ──────────────────────────────────
const getExams = async (teacherId: string) => {
    const result = await db.select().from(exams).where(eq(exams.createdBy, teacherId));
    return result;
};

// ── Get Single Exam ────────────────────────────────────────────────────────────
const getExamById = async (examId: string, teacherId: string) => {
    const [exam] = await db.select().from(exams).where(
        and(eq(exams.id, examId), eq(exams.createdBy, teacherId))
    );
    if (!exam) throw ApiError.notFound("Exam not found");
    return exam;
};

// ── Update Exam ────────────────────────────────────────────────────────────────
const updateExam = async (examId: string, data: UpdateExamDto, teacherId: string) => {
    const [existing] = await db.select().from(exams).where(
        and(eq(exams.id, examId), eq(exams.createdBy, teacherId))
    );
    if (!existing) throw ApiError.notFound("Exam not found");

    const [updated] = await db.update(exams)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(exams.id, examId))
        .returning();

    return updated;
};

// ── Delete Exam ────────────────────────────────────────────────────────────────
const deleteExam = async (examId: string, teacherId: string) => {
    const [existing] = await db.select().from(exams).where(
        and(eq(exams.id, examId), eq(exams.createdBy, teacherId))
    );
    if (!existing) throw ApiError.notFound("Exam not found");

    await db.delete(exams).where(eq(exams.id, examId));
};

export { createExam, getExams, getExamById, updateExam, deleteExam };