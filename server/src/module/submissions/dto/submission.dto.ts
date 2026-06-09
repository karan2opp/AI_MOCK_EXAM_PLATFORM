
import { z } from "zod"

export const joinExamSchema = z.object({
  joinCode: z.string({ message: "Join code is required" })
    .length(6, "Join code must be 6 characters")
    .toUpperCase()
})

export type JoinExamDto = z.infer<typeof joinExamSchema>

export const updateSubmissionSchema = z.object({
  status: z.enum(["inprogress", "submitted", "timeout"], {
    message: "Status must be 'inprogress', 'submitted', or 'timeout'"
  }).optional(),
  score: z.number({ message: "Score must be a number" }).optional(),
});

export type UpdateSubmissionDto = z.infer<typeof updateSubmissionSchema>;
