"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Trophy, ArrowLeft, Clock, Calendar } from "lucide-react";
import { getSubmissionByIdService, getExamForSubmissionService } from "../../student.service";
import { toast } from "sonner";
import Link from "next/link";

export default function ResultsPage() {
  const params = useParams();
  const submissionId = params.id as string;
  const router = useRouter();

  const [submission, setSubmission] = useState<any>(null);
  const [exam, setExam] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!submissionId) return;

    const fetchResult = async () => {
      try {
        const [subRes, examRes] = await Promise.all([
          getSubmissionByIdService(submissionId),
          getExamForSubmissionService(submissionId)
        ]);

        const subData = subRes.data || subRes;
        const examData = examRes.data || examRes;

        if (subData.status === "inprogress") {
          toast.info("This exam is still in progress.");
          router.replace(`/student/exams/${submissionId}`);
          return;
        }

        setSubmission(subData);
        setExam(examData);
      } catch (err) {
        toast.error("Failed to load results.");
        router.push("/student");
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [submissionId, router]);

  if (loading) return <div className="p-10 text-white text-center">Loading results...</div>;
  if (!submission || !exam) return <div className="p-10 text-white text-center">Result not found.</div>;

  const score = submission.score ?? 0;
  const totalMarks = exam.totalMarks ?? 0;
  const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;

  // Determine performance color
  let colorClass = "text-red-500";
  let bgClass = "bg-red-500/10";
  let borderClass = "border-red-500/20";
  let message = "Keep practicing!";
  
  if (percentage >= 80) {
    colorClass = "text-emerald-500";
    bgClass = "bg-emerald-500/10";
    borderClass = "border-emerald-500/20";
    message = "Excellent work!";
  } else if (percentage >= 50) {
    colorClass = "text-yellow-500";
    bgClass = "bg-yellow-500/10";
    borderClass = "border-yellow-500/20";
    message = "Good effort!";
  }

  // Count correct/incorrect from answers if they exist
  let correctCount = 0;
  let incorrectCount = 0;
  let skippedCount = 0;

  // To calculate skipped, we'd need to know total questions
  let totalQuestions = 0;
  exam.sections?.forEach((s: any) => {
    totalQuestions += (s.questions?.length || 0);
  });

  submission.answers?.forEach((ans: any) => {
    if (ans.isCorrect === true) correctCount++;
    else if (ans.isCorrect === false) incorrectCount++;
  });

  skippedCount = totalQuestions - (correctCount + incorrectCount);

  return (
    <div className="p-10 h-full overflow-y-auto custom-scrollbar flex flex-col items-center">
      <div className="w-full max-w-3xl">
        <Link href="/student" className="inline-flex items-center text-gray-400 hover:text-white mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>

        <Card className="bg-[#111520] border-white/5 shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-purple-600"></div>
          
          <CardHeader className="text-center pt-10 pb-2">
            <div className="mx-auto w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-6 border border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.15)]">
              <Trophy className="h-10 w-10 text-blue-400" />
            </div>
            <CardTitle className="text-3xl font-bold text-white mb-2">Assessment Completed</CardTitle>
            <CardDescription className="text-gray-400 text-lg">
              {exam.title}
            </CardDescription>
          </CardHeader>

          <CardContent className="px-10 pb-10">
            {/* Score Ring */}
            <div className="flex flex-col items-center justify-center py-8">
              <div className={`relative flex items-center justify-center w-48 h-48 rounded-full border-8 ${borderClass} ${bgClass} shadow-lg`}>
                <div className="text-center">
                  <div className={`text-5xl font-extrabold ${colorClass} tracking-tighter`}>
                    {percentage}%
                  </div>
                  <div className="text-sm text-gray-400 font-medium uppercase tracking-widest mt-1">
                    Score
                  </div>
                </div>
              </div>
              <div className={`mt-6 font-bold text-xl ${colorClass}`}>{message}</div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 border-t border-white/5 pt-8">
              <div className="bg-black/20 rounded-xl p-4 text-center border border-white/5">
                <div className="text-2xl font-bold text-white mb-1">{score} <span className="text-sm text-gray-500 font-normal">/ {totalMarks}</span></div>
                <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Total Marks</div>
              </div>
              <div className="bg-emerald-500/10 rounded-xl p-4 text-center border border-emerald-500/20">
                <div className="text-2xl font-bold text-emerald-400 mb-1">{correctCount}</div>
                <div className="text-xs text-emerald-500/70 uppercase tracking-wider font-semibold">Correct</div>
              </div>
              <div className="bg-red-500/10 rounded-xl p-4 text-center border border-red-500/20">
                <div className="text-2xl font-bold text-red-400 mb-1">{incorrectCount}</div>
                <div className="text-xs text-red-500/70 uppercase tracking-wider font-semibold">Incorrect</div>
              </div>
              <div className="bg-gray-500/10 rounded-xl p-4 text-center border border-gray-500/20">
                <div className="text-2xl font-bold text-gray-300 mb-1">{skippedCount}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Skipped</div>
              </div>
            </div>

            {/* Meta Info */}
            <div className="flex items-center justify-center gap-8 mt-10 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Submitted: {new Date(submission.submittedAt || submission.updatedAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Status: <span className="text-emerald-400 capitalize">{submission.status}</span></span>
              </div>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
