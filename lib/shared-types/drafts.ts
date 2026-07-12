import { DraftStatus } from "@prisma/client";
export type { ConfirmDraftPayload } from "@/lib/validations/draft-schema";


export interface ExtractedItem {
    raw_text: string;
    stated_amount: string;
    calculated_grams: number;
    resolved_ingredient_id: number | null;
}

export interface RecipeDraft {
    id: number;
    raw_input_text: string;
    image_url: string | null;
    extracted_json: ExtractedItem[] | null;
    status?: DraftStatus;
    error_message?: string | null;
    created_at?: string;
}

