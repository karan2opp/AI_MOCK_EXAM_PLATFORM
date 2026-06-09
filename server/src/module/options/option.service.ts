import { eq } from "drizzle-orm";
import db from "../../common/db/index.js";
import { options, questions, sections, exams } from "../../common/db/schema.js";
import { ApiError } from "../../common/utils/ApiError.js";
import type { CreateOptionDto, UpdateOptionDto } from "./dto/option.dto.js";

// ── Helper: verify option belongs to teacher ───────────────────────────────────
const verifyOptionOwnership = async (optionId: string, teacherId: string) => {
    const [option] = await db.select({
        id: options.id,
        questionId: options.questionId,
        value: options.value,
        isCorrect: options.isCorrect,
        examCreatedBy: exams.createdBy,
    })
        .from(options)
        .innerJoin(questions, eq(options.questionId, questions.id))
        .innerJoin(sections, eq(questions.sectionId, sections.id))
        .innerJoin(exams, eq(sections.examId, exams.id))
        .where(eq(options.id, optionId));

    if (!option) throw ApiError.notFound("Option not found");
    if (option.examCreatedBy !== teacherId) throw ApiError.forbidden("You are not authorized");
    return option;
};

// ── Create Single Option ───────────────────────────────────────────────────────
const createOption = async (data: CreateOptionDto, teacherId: string) => {
    // verify question exists and belongs to teacher
    const [question] = await db.select({
        id: questions.id,
        type: questions.type,
        examCreatedBy: exams.createdBy,
    })
        .from(questions)
        .innerJoin(sections, eq(questions.sectionId, sections.id))
        .innerJoin(exams, eq(sections.examId, exams.id))
        .where(eq(questions.id, data.questionId));

    if (!question) throw ApiError.notFound("Question not found");
    if (question.examCreatedBy !== teacherId) throw ApiError.forbidden("You are not authorized");
    if (question.type !== "mcq") throw ApiError.badRequest("Cannot add options to a descriptive question");

    // check max 5 options limit
    const existingOptions = await db.select().from(options).where(eq(options.questionId, data.questionId));
    if (existingOptions.length >= 5) throw ApiError.badRequest("Cannot add more than 5 options to a question");

    const [option] = await db.insert(options).values({
        questionId: data.questionId,
        value: data.value,
        isCorrect: data.isCorrect,
    }).returning();

    if (!option) throw ApiError.internal("Failed to create option");
    return option;
};

// ── Update Option ──────────────────────────────────────────────────────────────
const updateOption = async (optionId: string, data: UpdateOptionDto, teacherId: string) => {
    await verifyOptionOwnership(optionId, teacherId);

    const [updated] = await db.update(options)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(options.id, optionId))
        .returning();

    return updated;
};

// ── Delete Option ──────────────────────────────────────────────────────────────
const deleteOption = async (optionId: string, teacherId: string) => {
    const option = await verifyOptionOwnership(optionId, teacherId);

    // prevent deleting if only 2 options left
    const existingOptions = await db.select().from(options).where(eq(options.questionId, option.questionId));
    if (existingOptions.length <= 2) throw ApiError.badRequest("MCQ must have at least 2 options — delete the question instead");

    await db.delete(options).where(eq(options.id, optionId));
};

export { createOption, updateOption, deleteOption };