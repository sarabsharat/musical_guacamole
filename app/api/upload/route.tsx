import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/upload
 * Handles file uploads (images, documents) for recipes and drafts.
 * Mock implementation - in production, integrates with S3-compatible storage.
 */
export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const restaurantId = formData.get('restaurantId') as string;

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        if (!restaurantId) {
            return NextResponse.json(
                { error: 'Restaurant ID required' },
                { status: 400 }
            );
        }

        // Mock file processing
        const fileSize = file.size;
        const mimeType = file.type;
        const filename = file.name;

        // Simulate S3 upload delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // Generate mock S3 URL
        const mockS3Url = `https://mock-storage.example.com/restaurants/${restaurantId}/${Date.now()}-${filename}`;

        return NextResponse.json(
            {
                success: true,
                url: mockS3Url,
                filename,
                size: fileSize,
                mimeType,
                uploadedAt: new Date().toISOString(),
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { error: 'Upload failed', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/upload
 * Returns mock upload endpoint info (optional health check).
 */
export async function GET() {
    return NextResponse.json(
        {
            message: 'Upload endpoint is active',
            maxFileSize: '10MB',
            supportedFormats: ['image/jpeg', 'image/png', 'application/pdf'],
        },
        { status: 200 }
    );
}
