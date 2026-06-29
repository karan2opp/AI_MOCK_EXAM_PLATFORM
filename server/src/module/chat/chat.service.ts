import { eq, and, desc } from "drizzle-orm";
import db from "../../common/db/index.js";
import { chats } from "./chat.schema.js";
import { ApiError } from "../../common/utils/ApiError.js";
import { checkOpenAI, checkMistral } from "../../common/agent/openai.client.js";

const getExamGenieSystemPrompt = () => `## IDENTITY

Current Year: ${new Date().getFullYear()}

You are ExamGenie, an intelligent exam creation assistant built for educators.
You help teachers create high quality, well structured exams through natural 
conversation. You have deep knowledge of pedagogy, question design, and 
assessment best practices across all subjects and difficulty levels.

You are friendly, focused, and efficient. You never waste the teacher's time 
with unnecessary questions or filler responses.

---

## RESPONSE BEHAVIOR

- Group related questions together (ask 2-3 at a time) to save the teacher's time
- ALWAYS format your questions as a Markdown bulleted list for better readability
- Be concise and conversational, not robotic or formal
- Never use repeated filler words like "Great!", "Sure!", "Absolutely!", "Of course!"
- Use plain language, avoid jargon unless the teacher uses it first

---

## WORKFLOW

Follow these exact steps in order.

STEP 1 — GATHER BASIC INFO
Ask ONE single message combining these:
- Exam Title
- Exam Subject (e.g., Programming, Tally, MS Office)
- Exam Difficulty (Beginner, Intermediate, Advanced)

STEP 2 — GATHER SECTIONS & TOPICS
After getting subject/difficulty, ask ONE single message combining:
- How many sections the exam should have and what their names are
- Which specific topics to include for each section

STEP 3 — GATHER QUESTION COUNTS & MARKS
After getting sections and topics, ask ONE single message combining:
- How many Multiple Choice (MCQ) and how many Descriptive questions for EACH section
- What are the marks assigned for EACH question type
- Internally store these exact counts — you will output them in GENERATE_MODE

STEP 4 — ADDITIONAL INSTRUCTIONS
Ask if there are any special instructions or specific focus areas.

STEP 5 — CONFIRM SUMMARY
Before generating, present a clear compact summary:

"Here is the summary of your exam:

📋 Title: [title]
📚 Subject: [subject]
🎯 Difficulty: [difficulty]

Sections:
1. [Section Name]
   • MCQ: [X] questions × [marks] marks each
   • Descriptive: [X] questions × [marks] marks each
   • Topics: [topics]

2. [Section Name]
   • MCQ: [X] questions × [marks] marks each
   • Descriptive: [X] questions × [marks] marks each
   • Topics: [topics]

Special Instructions: [instructions or none]

⚠️ Duration and time settings will be configured separately.

Shall I go ahead and generate the exam?"

Only proceed after teacher confirms.

STEP 6 — TRIGGER GENERATION
When teacher confirms, respond with exactly this and nothing else:

"Perfect! I have everything I need. Generating your exam now...
[GENERATE_MODE]
{
  "examTitle": "[exact title teacher gave]",
  "subject": "[subject]",
  "difficulty": "[difficulty]",
  "specialInstructions": "[instructions or null]",
  "sections": [
    {
      "title": "[section title]",
      "topics": ["topic1", "topic2", "topic3"],
      "mcqCount": 0,
      "mcqMarks": 0,
      "descriptiveCount": 0,
      "descriptiveMarks": 0
    }
  ]
}
[/GENERATE_MODE]"

CRITICAL RULES FOR GENERATE_MODE JSON:
- Use EXACT numbers teacher specified, never approximate
- topics must be an array of strings
- mcqCount and descriptiveCount must be integers
- If teacher said 0 descriptive, set descriptiveCount: 0
- Never round or change the counts
- JSON must be perfectly valid

STEP 7 — POST-GENERATION EDITS
After the backend generates the exam and shows it to the teacher,
if teacher asks to change, edit, or modify any questions:
- Accept the request
- Apply changes
- Re-output the complete updated [EXAM_DATA] block

If teacher asks to see questions or requests modifications, 
re-output entire [EXAM_DATA] JSON:

[EXAM_DATA]
{ ... complete updated exam JSON ... }
[/EXAM_DATA]

STEP 8 — CONFIRM AND SAVE
When teacher is satisfied and wants to save, respond with exactly:
"EXAM_CONFIRMED"

---

## POST GENERATION FORMAT
Only used in Step 7 when teacher requests edits after generation:

[EXAM_DATA]
{
  "exam": {
    "title": "",
    "description": "",
    "sections": [
      {
        "title": "",
        "questions": [
          {
            "type": "mcq",
            "description": "",
            "marks": 1,
            "options": [
              { "label": "A", "value": "", "isCorrect": false },
              { "label": "B", "value": "", "isCorrect": false },
              { "label": "C", "value": "", "isCorrect": true },
              { "label": "D", "value": "", "isCorrect": false }
            ]
          },
          {
            "type": "descriptive",
            "description": "",
            "marks": 5,
            "options": []
          }
        ]
      }
    ]
  }
}
[/EXAM_DATA]

---

## RESTRICTIONS

NEVER:
- Generate questions yourself — backend handles all generation
- Output [EXAM_DATA] before [GENERATE_MODE] is processed by backend
- Generate exam without teacher confirmation
- Save without teacher saying yes
- Use filler words repeatedly
- Access other teachers data
- Delete saved exams
- Tell user about retries or internal processes
- Share join codes
- Answer questions unrelated to exam creation or management
- Approximate or change question counts in GENERATE_MODE JSON

ALWAYS:
- Output exact counts teacher specified in GENERATE_MODE JSON
- Wait for backend to complete generation before responding
- Accept edit requests after generation
- Re-output complete EXAM_DATA when edits requested
- Keep JSON perfectly valid

---

## FALLBACK
If you cannot fulfill a request:
"I can only help with creating and managing exams.
Is there anything else I can help you with?"

RETRY PROTOCOL:
If something goes wrong:
"I'm having trouble right now. Please try again in a moment."`;

export const getChats = async (teacherId: string) => {
    return await db.select({
        _id: chats.id,
        title: chats.title,
        createdAt: chats.createdAt,
        updatedAt: chats.updatedAt,
    }).from(chats).where(eq(chats.teacherId, teacherId)).orderBy(desc(chats.updatedAt));
};

export const generateChatTitle = async (firstMessage: string) => {
    try {
        const client = await checkOpenAI();
        const response = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a helpful assistant that summarizes a user's exam creation request into a short, punchy 3-4 word title (e.g., 'ML Mystery Exam' or 'Data Structures Mock'). Return ONLY the raw string title, no quotes. If the user is just saying hello, greeting you, or the exam topic is not yet clear, you MUST strictly return 'New Chat'." },
                { role: "user", content: firstMessage }
            ],
            temperature: 0.5,
            max_tokens: 15
        });
        const generated = response.choices[0]?.message?.content?.trim();
        return generated || "New Chat";
    } catch (e) {
        return "New Chat";
    }
};

export const getChatById = async (chatId: string, teacherId: string) => {
    const chatArr = await db.select().from(chats).where(and(eq(chats.id, chatId), eq(chats.teacherId, teacherId)));
    if (!chatArr.length) throw new ApiError(404, "Chat not found");
    const chat = chatArr[0];
    if (!chat) throw new ApiError(404, "Chat not found");
    return { ...chat, _id: chat.id };
};

export const createEmptyChat = async (teacherId: string, model: string = "gpt-4o-mini") => {
    const chatArr = await db.insert(chats).values({
        teacherId,
        title: "New Chat",
        model,
        messages: []
    }).returning();
    const chat = chatArr[0];
    if (!chat) throw new ApiError(500, "Failed to create chat");
    return { ...chat, _id: chat.id };
};

export const createChat = async (teacherId: string, firstMessage: string, model: string = "gpt-4o-mini") => {
    const title = await generateChatTitle(firstMessage);
    
    const chatArr = await db.insert(chats).values({
        teacherId,
        title,
        model,
        messages: [{ role: "user", content: firstMessage }]
    }).returning();
    const chat = chatArr[0];
    if (!chat) throw new ApiError(500, "Failed to create chat");

    return await generateChatResponse(chat.id, teacherId);
};

export const addMessageToChat = async (chatId: string, teacherId: string, content: string) => {
    const chatArr = await db.select().from(chats).where(and(eq(chats.id, chatId), eq(chats.teacherId, teacherId)));
    if (!chatArr.length) throw new ApiError(404, "Chat not found");

    const chat = chatArr[0];
    if (!chat) throw new ApiError(404, "Chat not found");

    let chatTitle = chat.title;
    if (chatTitle === "New Chat" && content) {
        chatTitle = await generateChatTitle(content);
    }

    const updatedMessages = [...(chat.messages as any[]), { role: "user", content }];

    await db.update(chats).set({ messages: updatedMessages, title: chatTitle, updatedAt: new Date() }).where(eq(chats.id, chatId));

    return await generateChatResponse(chatId, teacherId);
};

const generateChatResponse = async (chatId: string, teacherId: string) => {
    const chatArr = await db.select().from(chats).where(and(eq(chats.id, chatId), eq(chats.teacherId, teacherId)));
    if (!chatArr.length) throw new ApiError(404, "Chat not found");

    const chat = chatArr[0];
    if (!chat) throw new ApiError(404, "Chat not found");
    
    const isMistral = chat.model === "mistral-small-latest";
    const client = isMistral ? await checkMistral() : await checkOpenAI();

    const formattedMessages = (chat.messages as any[]).map((m: any) => ({
        role: m.role,
        content: m.content
    }));

    try {
        let currentModel = chat.model;

        // Implement GENERATE_MODE model switching logic
        let inGenerateMode = false;
        for (let i = formattedMessages.length - 1; i >= 0; i--) {
            const m = formattedMessages[i];
            if (!m) continue;
            if (m.role === "assistant") {
                if (m.content && (m.content.includes("All sections generated!") || m.content.includes("EXAM_CONFIRMED"))) {
                    break;
                }
                if (m.content && m.content.includes("[GENERATE_MODE]")) {
                    inGenerateMode = true;
                    break;
                }
            }
        }

        if (inGenerateMode && !isMistral) {
            currentModel = "gpt-4o";
        }

        const response = await client.chat.completions.create({
            model: currentModel,
            messages: [
                { role: "system", content: getExamGenieSystemPrompt() },
                ...formattedMessages
            ],
        });

        let assistantReply = response.choices[0]?.message?.content || "";

        let chatTitle = chat.title;

        // If the reply contains GENERATE_MODE, we intercept it and run the orchestrator synchronously
        if (assistantReply.includes("[GENERATE_MODE]")) {
            try {
                const parts = assistantReply.split("[GENERATE_MODE]");
                if (parts.length > 1) {
                    let jsonStr = parts[1]!.split("[/GENERATE_MODE]")[0]!.trim();
                    const startIdx = jsonStr.indexOf("{");
                    const endIdx = jsonStr.lastIndexOf("}");
                    if (startIdx !== -1 && endIdx !== -1) {
                        jsonStr = jsonStr.substring(startIdx, endIdx + 1);
                        const structure = JSON.parse(jsonStr);
                        
                        // Run the generator
                        console.log("Starting backend chunk generation...");
                        const { generateExamFromStructure } = await import("./chat.generator.js");
                        const generatedExam = await generateExamFromStructure(structure);
                        console.log("Backend generation complete!");

                        // Append EXAM_DATA to the same reply so frontend gets it instantly
                        assistantReply += `\n\n[EXAM_DATA]\n${JSON.stringify({ exam: generatedExam }, null, 2)}\n[/EXAM_DATA]`;
                    }
                }
            } catch (e) {
                console.error("Failed to parse or generate from structure:", e);
                assistantReply += "\n\n*(Error: Failed to generate exam. Please try again.)*";
            }
        }

        const finalMessages = [...formattedMessages, { role: "assistant", content: assistantReply }];
        await db.update(chats).set({ messages: finalMessages, title: chatTitle, updatedAt: new Date() }).where(eq(chats.id, chatId));

        return { chat: { ...chat, messages: finalMessages, title: chatTitle, _id: chat.id }, reply: assistantReply };
    } catch (error) {
        console.error("OpenAI Error:", error);
        throw new ApiError(500, "Failed to chat generate question");
    }
};

export const appendSystemMessage = async (chatId: string, teacherId: string, message: string) => {
    const chatArr = await db.select().from(chats).where(and(eq(chats.id, chatId), eq(chats.teacherId, teacherId)));
    if (!chatArr.length) throw new ApiError(404, "Chat not found");
    const chat = chatArr[0];
    if (!chat) throw new ApiError(404, "Chat not found");
    
    const finalMessages = [...(chat.messages || []), { role: "system", content: message }];
    await db.update(chats).set({ messages: finalMessages, updatedAt: new Date() }).where(eq(chats.id, chatId));
    
    return { chat: { ...chat, messages: finalMessages, _id: chat.id } };
};

export const deleteChat = async (chatId: string, teacherId: string) => {
    const chatArr = await db.delete(chats).where(and(eq(chats.id, chatId), eq(chats.teacherId, teacherId))).returning();
    if (!chatArr.length) throw new ApiError(404, "Chat not found");
    const chat = chatArr[0];
    if (!chat) throw new ApiError(404, "Chat not found");
    return chat;
};
