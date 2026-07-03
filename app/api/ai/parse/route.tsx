import { NextRequest, NextResponse } from 'next/server';

interface ParseRequest {
    rawText?: string;
    imageUrl?: string;
    restaurantId: string;
}

interface ParsedRecipe {
    meal_name: string;
    preparation_notes: string;
    estimated_calories: number;
    estimated_protein: number;
    estimated_carbs: number;
    estimated_fat: number;
    ingredients: Array<{
        name: string;
        amount: string;
        estimated_grams: number;
    }>;
    detected_allergens: string[];
    confidence: number;
}

/**
 * POST /api/ai/parse
 * Mock AI endpoint for parsing recipe text or images into structured nutrition data.
 * In production, this would call an LLM or vision model to extract recipe details.
 */
export async function POST(req: NextRequest) {
    try {
        const body: ParseRequest = await req.json();
        const { rawText, imageUrl, restaurantId } = body;

        if (!restaurantId) {
            return NextResponse.json(
                { error: 'restaurantId is required' },
                { status: 400 }
            );
        }

        if (!rawText && !imageUrl) {
            return NextResponse.json(
                { error: 'Either rawText or imageUrl must be provided' },
                { status: 400 }
            );
        }

        // Simulate AI processing delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Mock parsed recipe based on input
        const mockParsedRecipe: ParsedRecipe = {
            meal_name: 'Grilled Chicken with Vegetables',
            preparation_notes: 'Season chicken with salt and pepper. Grill at 180°C for 20 minutes. Serve with steamed broccoli and carrots.',
            estimated_calories: 450,
            estimated_protein: 45,
            estimated_carbs: 25,
            estimated_fat: 12,
            ingredients: [
                {
                    name: 'Chicken Breast',
                    amount: '200g',
                    estimated_grams: 200,
                },
                {
                    name: 'Broccoli',
                    amount: '1 cup',
                    estimated_grams: 150,
                },
                {
                    name: 'Carrot',
                    amount: '1 medium',
                    estimated_grams: 100,
                },
                {
                    name: 'Olive Oil',
                    amount: '1 tablespoon',
                    estimated_grams: 15,
                },
            ],
            detected_allergens: [],
            confidence: 0.85,
        };

        // If rawText is provided, attempt to customize the mock response
        if (rawText && rawText.toLowerCase().includes('salad')) {
            mockParsedRecipe.meal_name = 'Mixed Green Salad';
            mockParsedRecipe.estimated_calories = 180;
            mockParsedRecipe.estimated_protein = 8;
            mockParsedRecipe.estimated_carbs = 15;
            mockParsedRecipe.estimated_fat = 10;
            mockParsedRecipe.ingredients = [
                { name: 'Lettuce', amount: '2 cups', estimated_grams: 100 },
                { name: 'Tomato', amount: '1 medium', estimated_grams: 150 },
                { name: 'Cucumber', amount: '1/2', estimated_grams: 75 },
                { name: 'Olive Oil', amount: '1 tablespoon', estimated_grams: 15 },
            ];
        }

        // If imageUrl is provided, log it (in production, you'd send to vision model)
        if (imageUrl) {
            console.log(`Processing image from URL: ${imageUrl}`);
            mockParsedRecipe.confidence = 0.78; // Slightly lower confidence for images
        }

        return NextResponse.json(
            {
                success: true,
                data: mockParsedRecipe,
                processingTime: '1.2s',
                model: 'mock-nutritionist-v1',
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('AI parse error:', error);
        return NextResponse.json(
            {
                error: 'Failed to parse recipe',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

/**
 * GET /api/ai/parse
 * Returns info about the AI parsing endpoint.
 */
export async function GET() {
    return NextResponse.json(
        {
            message: 'AI recipe parser endpoint is active',
            capabilities: [
                'Parse raw recipe text',
                'Analyze recipe images',
                'Extract nutritional estimates',
                'Detect common allergens',
            ],
            supportedModels: ['mock-nutritionist-v1'],
            responseTime: '~1000ms',
        },
        { status: 200 }
    );
}
