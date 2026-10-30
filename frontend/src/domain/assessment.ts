import { z } from "zod";
import { domainIdSchema, identifierSchema } from "./learning-module";

export const answerChoiceSchema = z.object({
  id: identifierSchema,
  /** English choice text */
  text: z.string().trim().min(1),
  /** Technical rationale of why this option is right or wrong (English preferred) */
  explanation: z.string().trim().min(1).optional(),
  explanationEn: z.string().trim().min(1).optional(),
  explanationVi: z.string().trim().min(1).optional(),
}).refine(
  (data) => Boolean(data.explanation || data.explanationEn || data.explanationVi),
  { message: "Either explanation, explanationEn, or explanationVi must be provided" }
);

export type AnswerChoice = z.infer<typeof answerChoiceSchema>;

export const questionTypeSchema = z.enum(["single-choice", "multiple-response"]);
export type QuestionType = z.infer<typeof questionTypeSchema>;

export const scenarioQuestionSchema = z
  .object({
    id: identifierSchema,
    moduleId: identifierSchema,
    domainId: domainIdSchema,
    type: questionTypeSchema,
    /** English scenario stem */
    stem: z.string().trim().min(1),
    choices: z.array(answerChoiceSchema).min(3).max(6),
    correctChoiceIds: z.array(identifierSchema).min(1),
    /** Overall synthesis of the correct architectural decision (English preferred) */
    correctExplanation: z.string().trim().min(1).optional(),
    correctExplanationEn: z.string().trim().min(1).optional(),
    correctExplanationVi: z.string().trim().min(1).optional(),
    sourceIds: z.array(identifierSchema).min(1),
  })
  .superRefine((question, ctx) => {
    const choiceIds = new Set<string>();
    question.choices.forEach((choice, idx) => {
      if (choiceIds.has(choice.id)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate choice id "${choice.id}"`,
          path: ["choices", idx, "id"],
        });
      }
      choiceIds.add(choice.id);
    });

    const uniqueCorrect = new Set(question.correctChoiceIds);
    if (uniqueCorrect.size !== question.correctChoiceIds.length) {
      ctx.addIssue({
        code: "custom",
        message: "correctChoiceIds must not contain duplicates",
        path: ["correctChoiceIds"],
      });
    }

    for (const cid of question.correctChoiceIds) {
      if (!choiceIds.has(cid)) {
        ctx.addIssue({
          code: "custom",
          message: `correctChoiceId "${cid}" does not exist in choices`,
          path: ["correctChoiceIds"],
        });
      }
    }

    if (question.type === "single-choice" && question.correctChoiceIds.length !== 1) {
      ctx.addIssue({
        code: "custom",
        message: "single-choice question must have exactly 1 correctChoiceId",
        path: ["correctChoiceIds"],
      });
    }

    if (question.type === "multiple-response" && question.correctChoiceIds.length < 2) {
      ctx.addIssue({
        code: "custom",
        message: "multiple-response question must have at least 2 correctChoiceIds",
        path: ["correctChoiceIds"],
      });
    }

    if (!question.correctExplanation && !question.correctExplanationEn && !question.correctExplanationVi) {
      ctx.addIssue({
        code: "custom",
        message: "Either correctExplanation, correctExplanationEn, or correctExplanationVi must be provided",
        path: ["correctExplanation"],
      });
    }
  });

export type ScenarioQuestion = z.infer<typeof scenarioQuestionSchema>;
