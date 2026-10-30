import { describe, it, expect } from "vitest";
import { validatedContentPack } from "../content";

describe("Content Pack Validation & Decoupling Invariants", () => {
  it("loads and validates all domains, modules, questions and sources with zero schema errors", () => {
    expect(validatedContentPack.domains.length).toBeGreaterThanOrEqual(6);
    expect(validatedContentPack.modules.length).toBeGreaterThanOrEqual(3);
    expect(validatedContentPack.questions.length).toBeGreaterThanOrEqual(6);
    expect(validatedContentPack.sources.length).toBeGreaterThanOrEqual(9);
  });

  it("ensures each module covers all 7 pedagogical stages with substantive text", () => {
    for (const mod of validatedContentPack.modules) {
      expect(mod.stages.what.paragraphs.length).toBeGreaterThanOrEqual(1);
      expect(mod.stages.why.paragraphs.length).toBeGreaterThanOrEqual(1);
      expect(mod.stages.how.paragraphs.length).toBeGreaterThanOrEqual(1);
      expect(mod.stages.internals.paragraphs.length).toBeGreaterThanOrEqual(1);
      expect(mod.stages.tradeOffs.paragraphs.length).toBeGreaterThanOrEqual(1);
      expect(mod.stages.failureScenarios.paragraphs.length).toBeGreaterThanOrEqual(1);
      expect(mod.stages.productionEngineering.paragraphs.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("ensures each question has unique choices and valid non-empty Vietnamese explanations for all choices", () => {
    for (const q of validatedContentPack.questions) {
      expect(q.stem.length).toBeGreaterThan(10);
      expect(q.choices.length).toBeGreaterThanOrEqual(3);
      for (const choice of q.choices) {
        expect(choice.text.length).toBeGreaterThan(0);
        expect(choice.explanationVi.length).toBeGreaterThan(0);
      }
    }
  });
});
