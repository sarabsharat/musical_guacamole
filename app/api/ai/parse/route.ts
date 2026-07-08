import { NextResponse } from "next/server";
import { parseAndMapUnstructuredInput } from "@/lib/ai-pipeline";

export async function POST(request: Request) {
    try {
        // Parse the incoming JSON body
        const body = await request.json();

        // 1. We now extract imageUrl alongside rawNotes
        const { rawNotes, imageUrl } = body;

        // 2. Validate the inputs
        if (!rawNotes || typeof rawNotes !== "string") {
            return NextResponse.json(
                { success: false, error: "Missing or invalid 'rawNotes' string in payload." },
                { status: 400 }
            );
        }

        if (!imageUrl || typeof imageUrl !== "string") {
            return NextResponse.json(
                { success: false, error: "Missing or invalid 'imageUrl' string in payload." },
                { status: 400 }
            );
        }

        // 3. Pass BOTH the notes and the image to your Gemini pipeline
        const parsedIngredients = await parseAndMapUnstructuredInput(rawNotes, imageUrl);

        // Return the successfully mapped ingredients
        return NextResponse.json(
            { success: true, data: parsedIngredients },
            { status: 200 }
        );

    } catch (error: unknown) {
        console.error("API Route Error (AI Parse):", error);
        const errorMessage = error instanceof Error ? error.message : "Internal server error during AI extraction.";

        return NextResponse.json(
            { success: false, error: errorMessage },
            { status: 500 }
        );
    }
}