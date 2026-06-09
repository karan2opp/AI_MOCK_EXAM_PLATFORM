import express from "express";
import cookieParser from "cookie-parser";
import authRoutes from "./module/auth/auth.route.js";
import examRouter from "./module/exam/exam.route.js";
import sectionsRouter from "./module/sections/section.routes.js";
import questionsRouter from "./module/questions/question.route.js";
import optionsRouter from "./module/options/option.route.js";
import submissionsRouter from "./module/submissions/submission.route.js";
import answersRouter from "./module/answers/answer.route.js";
import errorHandler from "./common/middleware/error.middleware.js";
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/exams", examRouter)
app.use("/api/sections", sectionsRouter)
app.use("/api/questions", questionsRouter)
app.use("/api/options", optionsRouter)
app.use("/api/submissions", submissionsRouter)
app.use("/api/answers", answersRouter)
app.use(errorHandler)

export default app;