import { z } from "zod";
import {
  domainCatalogEntrySchema,
  learningModuleSchema,
  sourceCitationSchema,
} from "./learning-module";
import { scenarioQuestionSchema } from "./assessment";

export const contentPackSchema = z
  .object({
    sources: z.array(sourceCitationSchema).min(1),
    domains: z.array(domainCatalogEntrySchema).min(6),
    modules: z.array(learningModuleSchema).min(3),
    questions: z.array(scenarioQuestionSchema).min(6),
  })
  .superRefine((pack, ctx) => {
    const sourceIds = new Set(pack.sources.map((s) => s.id));
    const moduleSlugs = new Set(pack.modules.map((m) => m.slug));
    const moduleIds = new Set(pack.modules.map((m) => m.id));
    const questionIds = new Set(pack.questions.map((q) => q.id));

    pack.domains.forEach((domain, dIdx) => {
      domain.featuredModuleSlugs.forEach((slug, sIdx) => {
        if (!moduleSlugs.has(slug)) {
          ctx.addIssue({
            code: "custom",
            message: `Domain "${domain.id}" references unknown module slug "${slug}"`,
            path: ["domains", dIdx, "featuredModuleSlugs", sIdx],
          });
        }
      });
    });

    pack.modules.forEach((mod, mIdx) => {
      mod.sourceIds.forEach((sid, sIdx) => {
        if (!sourceIds.has(sid)) {
          ctx.addIssue({
            code: "custom",
            message: `Module "${mod.id}" references unknown sourceId "${sid}"`,
            path: ["modules", mIdx, "sourceIds", sIdx],
          });
        }
      });

      mod.questionIds.forEach((qid, qIdx) => {
        if (!questionIds.has(qid)) {
          ctx.addIssue({
            code: "custom",
            message: `Module "${mod.id}" references unknown questionId "${qid}"`,
            path: ["modules", mIdx, "questionIds", qIdx],
          });
        }
      });
    });

    pack.questions.forEach((q, qIdx) => {
      if (!moduleIds.has(q.moduleId)) {
        ctx.addIssue({
          code: "custom",
          message: `Question "${q.id}" references unknown moduleId "${q.moduleId}"`,
          path: ["questions", qIdx, "moduleId"],
        });
      }
      q.sourceIds.forEach((sid, sIdx) => {
        if (!sourceIds.has(sid)) {
          ctx.addIssue({
            code: "custom",
            message: `Question "${q.id}" references unknown sourceId "${sid}"`,
            path: ["questions", qIdx, "sourceIds", sIdx],
          });
        }
      });
    });
  });

export type ContentPack = z.infer<typeof contentPackSchema>;
