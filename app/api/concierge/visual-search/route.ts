const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function outputText(result: { output?: { content?: { type?: string; text?: string }[] }[] }) {
  return result.output
    ?.flatMap((item) => item.content ?? [])
    .find((item) => item.type === "output_text")?.text;
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const image = form.get("image");
    if (!(image instanceof File)) return Response.json({ error: "Choose a screenshot or photo first." }, { status: 400 });
    if (!ALLOWED_IMAGE_TYPES.has(image.type)) return Response.json({ error: "Use a JPG, PNG or WebP image." }, { status: 415 });
    if (!image.size || image.size > MAX_IMAGE_BYTES) return Response.json({ error: "The image must be smaller than 5 MB." }, { status: 413 });
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return Response.json({ error: "Visual search is being connected. For now, describe the item to Selma in the message box." }, { status: 503 });

    const bytes = Buffer.from(await image.arrayBuffer());
    const dataUrl = `data:${image.type};base64,${bytes.toString("base64")}`;
    const aiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({
        model: process.env.OPENAI_VISION_MODEL ?? "gpt-5.4-mini",
        store: false,
        max_output_tokens: 220,
        text: { format: { type: "json_schema", name: "visual_product_search", strict: true, schema: { type: "object", additionalProperties: false, properties: { summary: { type: "string" }, query: { type: "string" }, category: { type: "string" }, colours: { type: "array", items: { type: "string" }, maxItems: 6 }, attributes: { type: "array", items: { type: "string" }, maxItems: 10 } }, required: ["summary", "query", "category", "colours", "attributes"] } } },
        input: [{
          role: "user",
          content: [
            { type: "input_text", text: "Identify the main purchasable item in this image for a Namibian marketplace search. Do not identify people, infer sensitive traits, or reproduce personal information visible in the image." },
            { type: "input_image", image_url: dataUrl, detail: "low" },
          ],
        }],
      }),
    });
    const result = await aiResponse.json() as { output?: { content?: { type?: string; text?: string }[] }[]; error?: { message?: string } };
    if (!aiResponse.ok) {
      console.error("visual search analysis failed", { status: aiResponse.status, error: result.error?.message });
      return Response.json({ error: "Selma could not analyse this image right now. Try again or describe the item." }, { status: 502 });
    }
    const raw = outputText(result)?.trim();
    if (!raw) return Response.json({ error: "Selma could not identify a clear item. Try a closer screenshot or describe it." }, { status: 422 });
    const analysis = JSON.parse(raw) as { summary?: string; query?: string; category?: string; colours?: string[]; attributes?: string[] };
    const query = [analysis.query, analysis.category, ...(analysis.colours ?? []), ...(analysis.attributes ?? [])].filter(Boolean).join(" ").slice(0, 300);
    if (query.length < 2) return Response.json({ error: "Selma could not identify a searchable item. Try a clearer image." }, { status: 422 });
    return Response.json({ summary: analysis.summary ?? "I identified the main item in your image.", query }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("visual search failed", error);
    return Response.json({ error: "Selma could not analyse this image. Try a JPG, PNG or WebP screenshot." }, { status: 500 });
  }
}
