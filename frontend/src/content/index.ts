import { contentPackSchema, type ContentPack } from "../domain";
import { authoritativeSources } from "./sources";
import { domainCatalog } from "./domains";
import { learningModules } from "./modules";
import { questionBank } from "./questions";

const rawContentPack = {
  sources: authoritativeSources,
  domains: domainCatalog,
  modules: learningModules,
  questions: questionBank,
};

// Validate runtime integrity of content pack at module load
const validationResult = contentPackSchema.safeParse(rawContentPack);

if (!validationResult.success) {
  console.error("FATAL: Content Pack validation failed:", validationResult.error.format());
  throw new Error(
    `Content Pack integrity check failed: ${JSON.stringify(validationResult.error.issues)}`,
  );
}

export const validatedContentPack: ContentPack = validationResult.data;

export function getDomainById(domainId: string) {
  return validatedContentPack.domains.find((d) => d.id === domainId);
}

export function getModuleBySlug(slug: string) {
  return validatedContentPack.modules.find((m) => m.slug === slug);
}

export function getQuestionsForModule(moduleId: string) {
  return validatedContentPack.questions.filter((q) => q.moduleId === moduleId);
}

export function getSourceById(sourceId: string) {
  return validatedContentPack.sources.find((s) => s.id === sourceId);
}
