import { z } from "zod";

export const identifierSchema = z
  .string()
  .trim()
  .min(1)
  .regex(/^[a-z0-9-]+$/, "Identifier must be lowercase kebab-case");

export const domainIdSchema = z.enum([
  "java",
  "messaging",
  "distributed-systems",
  "databases",
  "caching",
  "design-patterns",
  "system-design",
]);

export type DomainId = z.infer<typeof domainIdSchema>;

export const governanceStatusSchema = z.enum([
  "PROPOSED",
  "DISCUSSION",
  "ACCEPTED",
  "IMPLEMENTED",
  "VERIFIED",
]);

export type GovernanceStatus = z.infer<typeof governanceStatusSchema>;

export const sourceCitationSchema = z.object({
  id: identifierSchema,
  title: z.string().trim().min(1),
  publisher: z.string().trim().min(1),
  url: z.string().url(),
  accessedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  supports: z.string().trim().min(1),
});

export type SourceCitation = z.infer<typeof sourceCitationSchema>;

export const simulationFidelityContractSchema = z.object({
  mode: z.enum(["deterministic-educational-model", "live-infrastructure-trace"]),
  realWorldReference: z.string().trim().min(1),
  accurateBehaviors: z.array(z.string().trim().min(1)).min(2),
  simplifications: z.array(z.string().trim().min(1)).min(1),
  assumptions: z.array(z.string().trim().min(1)).min(1),
  unsupportedEdgeCases: z.array(z.string().trim().min(1)).min(1),
});

export type SimulationFidelityContract = z.infer<typeof simulationFidelityContractSchema>;

export const pedagogicalStageKeySchema = z.enum([
  "what",
  "why",
  "how",
  "internals",
  "tradeOffs",
  "failureScenarios",
  "productionEngineering",
]);

export type PedagogicalStageKey = z.infer<typeof pedagogicalStageKeySchema>;

export const stageSectionSchema = z.object({
  heading: z.string().trim().min(1),
  paragraphs: z.array(z.string().trim().min(1)).min(1),
  bulletPoints: z.array(z.string().trim().min(1)).optional(),
  codeSnippet: z
    .object({
      language: z.string().trim().min(1),
      caption: z.string().trim().min(1),
      code: z.string().trim().min(1),
    })
    .optional(),
  callout: z
    .object({
      tone: z.enum(["note", "warning", "production"]),
      title: z.string().trim().min(1),
      body: z.string().trim().min(1),
    })
    .optional(),
});

export type StageSection = z.infer<typeof stageSectionSchema>;

export const simulationIdSchema = z.enum([
  "kafka-consumer-group",
  "redis-stampede",
  "postgres-mvcc-btree",
  "java-memory-gc",
  "java-hashmap-treeification",
  "java-virtual-threads",
]);

export type SimulationId = z.infer<typeof simulationIdSchema>;

export const learningModuleSchema = z.object({
  id: identifierSchema,
  slug: identifierSchema,
  domainId: domainIdSchema,
  title: z.string().trim().min(1),
  subtitle: z.string().trim().min(1),
  governanceStatus: governanceStatusSchema,
  estimatedMinutes: z.number().int().min(5).max(180),
  difficulty: z.enum(["Foundational", "Intermediate", "Senior / Staff"]),
  simulationId: simulationIdSchema.optional(),
  keyTerms: z.array(
    z.object({
      term: z.string().trim().min(1),
      definitionVi: z.string().trim().min(1),
    }),
  ).min(3),
  stages: z.object({
    what: stageSectionSchema,
    why: stageSectionSchema,
    how: stageSectionSchema,
    internals: stageSectionSchema,
    tradeOffs: stageSectionSchema,
    failureScenarios: stageSectionSchema,
    productionEngineering: stageSectionSchema,
  }),
  sourceIds: z.array(identifierSchema).min(1),
  questionIds: z.array(identifierSchema).min(2),
});

export type LearningModule = z.infer<typeof learningModuleSchema>;

export const domainCatalogEntrySchema = z.object({
  id: domainIdSchema,
  title: z.string().trim().min(1),
  tagline: z.string().trim().min(1),
  descriptionVi: z.string().trim().min(1),
  status: z.enum(["Active Interactive Labs", "Planned Expansion"]),
  topics: z.array(z.string().trim().min(1)).min(4),
  featuredModuleSlugs: z.array(identifierSchema),
});

export type DomainCatalogEntry = z.infer<typeof domainCatalogEntrySchema>;
