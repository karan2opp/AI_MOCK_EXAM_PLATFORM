import { checkOpenAI } from "../../common/agent/openai.client.js";

export const CHUNK_GENERATION_PROMPT = `
You are a focused question generator. 
Your ONLY job is to generate exactly the number and type of 
questions requested. Nothing more, nothing less.

---

## INPUT FORMAT

You will receive a JSON object with:
- examTitle, subject, difficulty
- sectionTitle, topics (array)
- questionType: "mcq" or "descriptive"
- count: EXACT number of questions to generate this chunk
- marks: marks per question
- startIndex: question numbering starts here
- chunkInfo: which chunk this is out of total

---

## OUTPUT FORMAT

Return ONLY this JSON and absolutely nothing else:
{
  "questions": [
    ... exactly {count} question objects here ...
  ]
}

---

## MCQ QUESTION FORMAT

{
  "type": "mcq",
  "description": "Clear, complete, unambiguous question text",
  "marks": 1,
  "options": [
    { "label": "A", "value": "First option text", "isCorrect": false },
    { "label": "B", "value": "Second option text", "isCorrect": false },
    { "label": "C", "value": "Third option text", "isCorrect": true },
    { "label": "D", "value": "Fourth option text", "isCorrect": false }
  ]
}

---

## DESCRIPTIVE QUESTION FORMAT

{
  "type": "descriptive",
  "description": "Clear open-ended question text requiring explanation",
  "marks": 5,
  "options": []
}

---

## MCQ STRICT RULES

OPTION LABELS:
- Always label options as A, B, C, D in order
- Never skip or repeat a label
- Every question must have ALL FOUR options labeled A, B, C, D

CORRECT ANSWER:
- Exactly ONE option must have isCorrect: true
- ALL other three options must have isCorrect: false
- Never mark 0 options as correct
- Never mark 2 or more options as correct
- This is non-negotiable — every MCQ must have exactly one correct answer

CORRECT ANSWER POSITION — CRITICAL:
- NEVER always put the correct answer as option A
- NEVER always put the correct answer as option B
- Distribute correct answers randomly across A, B, C, D
- In a chunk of 15 questions, aim for roughly equal distribution:
  ~3-4 questions with answer A
  ~3-4 questions with answer B
  ~3-4 questions with answer C
  ~3-4 questions with answer D
- Never have more than 3 consecutive questions with same correct answer position

OPTION QUALITY:
- All 4 options must be plausible and relevant to the question
- Wrong options must look believable, not obviously wrong
- No trick questions or intentionally confusing wording
- Options must be meaningfully different from each other
- No "all of the above" or "none of the above" options

---

## DESCRIPTIVE STRICT RULES

- Must be open-ended, never yes/no questions
- Must require explanation or analysis, not just recall
- Should be answerable in 3-5 sentences for 5 marks
- Clear and unambiguous what is being asked

---

## GENERAL RULES

COUNT:
- Generate EXACTLY the count specified, no more, no less
- Before returning, count your questions
- If count is wrong, add or remove until exact
- This is the most important rule

TOPIC DISTRIBUTION:
- Distribute questions evenly across all topics in the topics array
- If 3 topics and 15 questions → ~5 questions per topic
- No topic should have 0 questions unless count is less than topics

DIFFICULTY:
- Beginner → straightforward recall and basic understanding
- Intermediate → application and moderate analysis  
- Advanced → deep analysis, edge cases, complex scenarios

JSON VALIDITY:
- Return perfectly valid JSON
- No trailing commas
- No missing commas between array elements
- No comments inside JSON
- Properly escape any quotes inside string values
- Never truncate or abbreviate — output complete JSON always
`;

const CHUNK_SIZE = 15;

export interface ExamStructure {
    examTitle: string;
    subject: string;
    difficulty: "Beginner" | "Intermediate" | "Advanced";
    specialInstructions?: string | null;
    sections: SectionStructure[];
}

export interface SectionStructure {
    title: string;
    topics: string[];
    mcqCount: number;
    mcqMarks: number;
    descriptiveCount: number;
    descriptiveMarks: number;
}

export interface ExamContext {
    examTitle: string;
    subject: string;
    difficulty: string;
    specialInstructions?: string | null;
}

export interface Option {
    label: string;
    value: string;
    isCorrect: boolean;
}

export interface Question {
    type: "mcq" | "descriptive";
    description: string;
    marks: number;
    options: Option[];
}

export interface ChunkParams {
    type: "mcq" | "descriptive";
    count: number;
    startIndex: number;
    totalCount: number;
    chunkInfo: string;
    section: SectionStructure;
    examContext: ExamContext;
}

export interface GeneratedExam {
    title: string;
    description: string;
    sections: {
        title: string;
        questions: Question[];
    }[];
}

export const generateExamFromStructure = async (
    structure: ExamStructure,
    retries = 1
): Promise<GeneratedExam> => {
    const generatedSections = [];

    for (const section of structure.sections) {
        // console.log(`\nGenerating section: ${section.title}`);

        const questions = await generateSectionInChunks(
            section,
            {
                examTitle: structure.examTitle,
                subject: structure.subject,
                difficulty: structure.difficulty,
                specialInstructions: structure.specialInstructions ?? null
            },
            retries
        );

        generatedSections.push({
            title: section.title,
            questions
        });
    }

    return {
        title: structure.examTitle,
        description: `${structure.subject} exam - ${structure.difficulty} level`,
        sections: generatedSections
    };
};

const generateSectionInChunks = async (
    section: SectionStructure,
    examContext: ExamContext,
    retries = 1
): Promise<Question[]> => {
    let mcqQuestions: Question[] = [];
    let descriptiveQuestions: Question[] = [];

    // generate MCQ in parallel chunks
    if (section.mcqCount > 0) {
        const mcqChunks = splitIntoChunks(section.mcqCount, CHUNK_SIZE);
        // console.log(`MCQ: ${section.mcqCount} questions → ${mcqChunks.length} chunks of ${mcqChunks.join(", ")}`);

        const mcqPromises = mcqChunks.map((chunkSize, i) => {
            let startIndex = 1;
            for (let j = 0; j < i; j++) startIndex += (mcqChunks[j] ?? 0);

            // console.log(`Generating MCQ chunk ${i + 1}/${mcqChunks.length} (Q${startIndex} to Q${startIndex + chunkSize - 1})`);

            return generateChunk({
                type: "mcq",
                count: chunkSize,
                startIndex,
                totalCount: section.mcqCount,
                chunkInfo: `MCQ Chunk ${i + 1} of ${mcqChunks.length}`,
                section,
                examContext
            }, retries);
        });

        const mcqResults = await Promise.all(mcqPromises);
        mcqQuestions = mcqResults.flat();
    }

    // generate descriptive in parallel chunks
    if (section.descriptiveCount > 0) {
        const descriptiveChunks = splitIntoChunks(section.descriptiveCount, CHUNK_SIZE);
        // console.log(`Descriptive: ${section.descriptiveCount} questions → ${descriptiveChunks.length} chunks`);

        const descriptivePromises = descriptiveChunks.map((chunkSize, i) => {
            let startIndex = 1;
            for (let j = 0; j < i; j++) startIndex += (descriptiveChunks[j] ?? 0);

            // console.log(`Generating Descriptive chunk ${i + 1}/${descriptiveChunks.length}`);

            return generateChunk({
                type: "descriptive",
                count: chunkSize,
                startIndex,
                totalCount: section.descriptiveCount,
                chunkInfo: `Descriptive Chunk ${i + 1} of ${descriptiveChunks.length}`,
                section,
                examContext
            }, retries);
        });

        const descriptiveResults = await Promise.all(descriptivePromises);
        descriptiveQuestions = descriptiveResults.flat();
    }

    const allQuestions = [...mcqQuestions, ...descriptiveQuestions];

    // SELF VERIFY
    const mcqGenerated = allQuestions.filter(q => q.type === "mcq").length;
    const descriptiveGenerated = allQuestions.filter(q => q.type === "descriptive").length;

    // console.log(`\nVerification for "${section.title}":`);
    // console.log(`MCQ: expected ${section.mcqCount}, got ${mcqGenerated}`);
    // console.log(`Descriptive: expected ${section.descriptiveCount}, got ${descriptiveGenerated}`);

    // auto fix missing questions
    if (mcqGenerated < section.mcqCount) {
        const missing = section.mcqCount - mcqGenerated;
        // console.log(`Fixing missing ${missing} MCQ questions...`);
        const fixChunk = await generateChunk({
            type: "mcq",
            count: missing,
            startIndex: mcqGenerated + 1,
            totalCount: section.mcqCount,
            chunkInfo: "Missing questions fix",
            section,
            examContext
        }, retries);
        allQuestions.push(...fixChunk);
    }

    if (descriptiveGenerated < section.descriptiveCount) {
        const missing = section.descriptiveCount - descriptiveGenerated;
        // console.log(`Fixing missing ${missing} Descriptive questions...`);
        const fixChunk = await generateChunk({
            type: "descriptive",
            count: missing,
            startIndex: descriptiveGenerated + 1,
            totalCount: section.descriptiveCount,
            chunkInfo: "Missing questions fix",
            section,
            examContext
        }, retries);
        allQuestions.push(...fixChunk);
    }

    // VALIDATE MCQ OPTIONS
    const validatedQuestions = allQuestions.map(q => {
        if (q.type !== "mcq") return q;

        const correctCount = q.options.filter((o: Option) => o.isCorrect).length;

        // if no correct answer or multiple correct → fix it
        if (correctCount !== 1) {
            // console.log(`Fixing invalid MCQ: "${q.description.substring(0, 50)}..."`);
            // reset all to false, mark first as correct as fallback
            q.options = q.options.map((o: Option, idx: number) => ({
                ...o,
                isCorrect: idx === 0
            }));
        }

        // ensure all labels are present
        const labels = ["A", "B", "C", "D"];
        q.options = q.options.map((o: Option, idx: number) => ({
            ...o,
            label: labels[idx] ?? String.fromCharCode(65 + idx)
        }));

        return q;
    });

    // console.log(`Section "${section.title}" complete ✅`);
    return validatedQuestions;
};

const generateChunk = async (
    params: ChunkParams,
    retries = 1
): Promise<Question[]> => {
    try {
        const openai = await checkOpenAI();
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0.7,
            max_tokens: 4000,
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: CHUNK_GENERATION_PROMPT
                },
                {
                    role: "user",
                    content: JSON.stringify({
                        examTitle: params.examContext.examTitle,
                        subject: params.examContext.subject,
                        difficulty: params.examContext.difficulty,
                        specialInstructions: params.examContext.specialInstructions ?? null,
                        sectionTitle: params.section.title,
                        topics: params.section.topics,
                        questionType: params.type,
                        count: params.count,
                        marks: params.type === "mcq"
                            ? params.section.mcqMarks
                            : params.section.descriptiveMarks,
                        startIndex: params.startIndex,
                        totalCount: params.totalCount,
                        chunkInfo: params.chunkInfo
                    })
                }
            ]
        });

        const contentStr = response.choices[0]?.message?.content ?? "{}";
        const result = JSON.parse(contentStr);

        if (!result.questions || !Array.isArray(result.questions)) {
            throw new Error("Invalid response format from chunk generator");
        }

        if (result.questions.length !== params.count) {
            // console.log(`Chunk returned ${result.questions.length} questions, expected ${params.count}`);
            // trim if too many
            if (result.questions.length > params.count) {
                return result.questions.slice(0, params.count);
            }
            // if too few, just return what we got and let the auto-fix logic handle the rest!
            return result.questions;
        }

        return result.questions;

    } catch (error) {
        if (retries > 0) {
            // console.log(`Chunk failed, retrying in 1s... (${retries} left)`);
            await new Promise(res => setTimeout(res, 1000));
            return generateChunk(params, retries - 1);
        }
        throw error;
    }
};

const splitIntoChunks = (total: number, size: number): number[] => {
    if (total === 0) return [];
    const chunks: number[] = [];
    let remaining = total;
    while (remaining > 0) {
        chunks.push(Math.min(size, remaining));
        remaining -= size;
    }
    return chunks;
};
