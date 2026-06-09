import { eq, and, isNull } from "drizzle-orm";
import db from "../../common/db/index.js";
import { submissions, exams, answers, options, questions } from "../../common/db/schema.js";
import { ApiError } from "../../common/utils/ApiError.js";

// ── Join Exam ──────────────────────────────────────────────────────────────────
const joinExam = async (joinCode: string, studentId: string) => {
    // find exam by join code
    const [exam] = await db.select().from(exams).where(eq(exams.joinCode, joinCode));
    if (!exam) throw ApiError.notFound("Invalid join code");

    // check exam time is valid
    const now = new Date();
    if (exam.startTime && now < exam.startTime) throw ApiError.badRequest("Exam has not started yet");
    if (exam.endTime && now > exam.endTime) throw ApiError.badRequest("Exam has already ended");

    // check student hasn't already joined
    const [existing] = await db.select().from(submissions).where(
        and(
            eq(submissions.examId, exam.id),
            eq(submissions.userId, studentId),
            isNull(submissions.deletedAt)
        )
    );
    if (existing) throw ApiError.conflict("You have already joined this exam");

    // create submission
    const [submission] = await db.insert(submissions).values({
        examId: exam.id,
        userId: studentId,
        status: "inprogress",
    }).returning();

    if (!submission) throw ApiError.internal("Failed to join exam");

    return { submission, exam };
};

// ── Submit Exam ────────────────────────────────────────────────────────────────
const submitExam = async (submissionId: string, studentId: string) => {
    // verify submission exists and belongs to student
    const [submission] = await db.select().from(submissions).where(
        and(
            eq(submissions.id, submissionId),
            eq(submissions.userId, studentId),
            isNull(submissions.deletedAt)
        )
    );
    if (!submission) throw ApiError.notFound("Submission not found");
    if (submission.status !== "inprogress") throw ApiError.badRequest("Exam has already been submitted");

    // fetch all answers for this submission
    const submissionAnswers = await db.select().from(answers).where(
        eq(answers.submissionId, submissionId)
    );

    // calculate MCQ score
    let score = 0;

    for (const answer of submissionAnswers) {
        // get question to check type and marks
        const [question] = await db.select().from(questions).where(eq(questions.id, answer.questionId));
        if (!question || question.type !== "mcq") continue;

        // get correct options for this question
        const correctOptions = await db.select().from(options).where(
            and(eq(options.questionId, answer.questionId), eq(options.isCorrect, true))
        );

        const correctOptionIds = correctOptions.map(opt => opt.id);
        const selectedOptionIds = answer.options ?? [];

        // check if selected options match correct options exactly
        const isCorrect =
            correctOptionIds.length === selectedOptionIds.length &&
            correctOptionIds.every(id => selectedOptionIds.includes(id));

        if (isCorrect) {
            score += question.marks;

            // update answer isCorrect and marksAwarded
            await db.update(answers)
                .set({ isCorrect: true, marksAwarded: question.marks })
                .where(eq(answers.id, answer.id));
        } else {
            await db.update(answers)
                .set({ isCorrect: false, marksAwarded: 0 })
                .where(eq(answers.id, answer.id));
        }
    }

    // update submission status and score
    const [updated] = await db.update(submissions)
        .set({
            status: "submitted",
            score,
            submittedAt: new Date(),
            updatedAt: new Date(),
        })
        .where(eq(submissions.id, submissionId))
        .returning();

    return updated;
};

// ── Get Submission by ID (student sees own) ────────────────────────────────────
const getSubmissionById = async (submissionId: string, studentId: string) => {
    const [submission] = await db.select().from(submissions).where(
        and(
            eq(submissions.id, submissionId),
            eq(submissions.userId, studentId),
            isNull(submissions.deletedAt)
        )
    );
    if (!submission) throw ApiError.notFound("Submission not found");

    // fetch answers with question and options details
    const submissionAnswers = await db.select().from(answers).where(
        eq(answers.submissionId, submissionId)
    );

    return { ...submission, answers: submissionAnswers };
};

// ── Get All Submissions for an Exam (teacher only) ─────────────────────────────
const getSubmissionsByExam = async (examId: string, teacherId: string) => {
    // verify exam belongs to teacher
    const [exam] = await db.select().from(exams).where(
        and(eq(exams.id, examId), eq(exams.createdBy, teacherId))
    );
    if (!exam) throw ApiError.notFound("Exam not found");

    const result = await db.select().from(submissions).where(
        and(eq(submissions.examId, examId), isNull(submissions.deletedAt))
    );

    return result;
};

// ── Soft Delete Submission ─────────────────────────────────────────────────────
const deleteSubmission = async (submissionId: string, studentId: string) => {
    const [submission] = await db.select().from(submissions).where(
        and(
            eq(submissions.id, submissionId),
            eq(submissions.userId, studentId),
            isNull(submissions.deletedAt)
        )
    );
    if (!submission) throw ApiError.notFound("Submission not found");

    await db.update(submissions)
        .set({ deletedAt: new Date() })
        .where(eq(submissions.id, submissionId));
};

export { joinExam, submitExam, getSubmissionById, getSubmissionsByExam, deleteSubmission };