// app/api/generate/route.ts
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

// Style suffix appended to every prompt before sending to fal.ai.
// Pushes FLUX schnell away from photographic defaults toward illustrated /
// graphic-design output — closer to creative agency deliverables.
const STYLE_SUFFIX =
  ", modern editorial illustration, bold graphic design, vibrant flat colours, contemporary poster aesthetic";

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== "string" || prompt.trim().length < 3) {
      return NextResponse.json({ error: "Prompt is too short" }, { status: 400 });
    }

    const falKey = process.env.FAL_KEY;
    if (!falKey) {
      console.error("[generate] FAL_KEY env var not set");
      return NextResponse.json(
        { error: "FAL_KEY not configured on server" },
        { status: 500 }
      );
    }

    // Cap user portion at 400 chars to leave room for style suffix
    const userPart = prompt.trim().slice(0, 400);
    const finalPrompt = userPart + STYLE_SUFFIX;

    console.log("[generate] Calling fal.ai with prompt:", finalPrompt.slice(0, 120));

    const response = await fetch("https://fal.run/fal-ai/flux/schnell", {
      method: "POST",
      headers: {
        Authorization: `Key ${falKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: finalPrompt,
        image_size: "square_hd",
        num_inference_steps: 4,
        num_images: 1,
        enable_safety_checker: true,
      }),
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error(
        "[generate] fal.ai error:",
        response.status,
        response.statusText,
        responseText
      );
      return NextResponse.json(
        {
          error: "Image generation failed",
          falStatus: response.status,
          falStatusText: response.statusText,
          falBody: responseText.slice(0, 500),
        },
        { status: 500 }
      );
    }

    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error("[generate] fal.ai returned non-JSON:", responseText.slice(0, 200));
      return NextResponse.json(
        { error: "Invalid response from fal.ai", falBody: responseText.slice(0, 500) },
        { status: 500 }
      );
    }

    const imageUrl = data.images?.[0]?.url;
    if (!imageUrl) {
      console.error("[generate] No image in response:", data);
      return NextResponse.json(
        { error: "No image in response", falData: data },
        { status: 500 }
      );
    }

    console.log("[generate] Success, image URL returned");
    return NextResponse.json({ url: imageUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[generate] Caught exception:", msg);
    return NextResponse.json({ error: "Internal error", detail: msg }, { status: 500 });
  }
}
