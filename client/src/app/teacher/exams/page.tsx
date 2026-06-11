"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Edit2, Trash2, Calendar, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getExamsService, deleteExamService } from "./exam.service";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function ExamsList() {
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchExams = async () => {
    try {
      const res = await getExamsService();
      setExams(res.data || []);
    } catch (error) {
      toast.error("Failed to load exams");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this exam? All sections and questions will be permanently deleted.")) return;
    try {
      await deleteExamService(id);
      toast.success("Exam deleted");
      fetchExams();
    } catch (err) {
      toast.error("Failed to delete exam");
    }
  };

  if (loading) return <div className="p-10 text-white text-center">Loading exams...</div>;

  return (
    <div className="p-10 h-full overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Assessments</h2>
          <p className="text-gray-400 mt-1">Manage all your created exams and quizzes.</p>
        </div>
        <Link href="/teacher/exams/new">
          <Button className="bg-purple-600 hover:bg-purple-700 text-white font-semibold">
            <Plus className="mr-2 h-5 w-5" />
            Create Assessment
          </Button>
        </Link>
      </div>

      {exams.length === 0 ? (
        <Card className="bg-[#111520]/50 border-white/5 py-16 text-center">
          <CardContent className="flex flex-col items-center">
            <div className="h-16 w-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-gray-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No assessments found</h3>
            <p className="text-gray-400 max-w-sm mb-6">You haven't created any exams yet. Click the button above to get started.</p>
            <Link href="/teacher/exams/new">
              <Button className="bg-purple-600 hover:bg-purple-700 text-white">Create Assessment</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {exams.map((exam) => (
            <Card key={exam.id || exam._id} className="bg-[#111520] border-white/5 hover:border-purple-500/30 transition-colors shadow-lg overflow-hidden group">
              <div className="h-2 bg-gradient-to-r from-purple-600 to-indigo-600"></div>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4 gap-4">
                  <h3 className="text-lg font-bold text-white leading-tight line-clamp-2">{exam.title}</h3>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8 text-gray-400 hover:text-white"
                      onClick={() => router.push(`/teacher/exams/${exam.id || exam._id}`)}
                      title="Edit Settings"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                      onClick={() => handleDelete(exam.id || exam._id)}
                      title="Delete Exam"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2 mt-4 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-purple-400" />
                    <span>Duration: {exam.duration} mins</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-purple-400" />
                    <span>Total Marks: {exam.totalMarks}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-purple-400" />
                    <span>Start: {new Date(exam.startTime).toLocaleDateString()} {new Date(exam.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                </div>
                
                <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-1 rounded bg-white/5 text-gray-300 uppercase tracking-wider border border-white/5">
                    {exam.status || "DRAFT"}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="bg-transparent border-white/10 text-gray-300 hover:text-white hover:bg-white/5"
                    onClick={() => router.push(`/teacher/exams/${exam.id || exam._id}`)}
                  >
                    Manage Exam
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
