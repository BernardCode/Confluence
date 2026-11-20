import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  segment: z.string().max(120), area: z.string().max(80),
  minPsi: z.number().min(0).max(200), durationMin: z.number().min(0).max(1440), notes: z.string().max(500),
});

export const draftAdvisory = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data }) => {
    const { draftWithLovableAI } = await import("./ai.server");
    return draftWithLovableAI(data);
  });
