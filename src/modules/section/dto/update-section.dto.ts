import { IsBoolean, IsNumber, IsObject, IsOptional, IsString, Min } from "class-validator";
import { IsJsonPayload } from "@/modules/section/decorators/is-json-payload.decorator";

export class UpdateSectionDto {
    @IsString()
    @IsOptional()
    pageSlug?: string;

    @IsString()
    @IsOptional()
    blockType?: string;

    @IsString()
    @IsOptional()
    title?: string;

    @IsJsonPayload({ message: "data must be an object or array" })
    @IsOptional()
    data?: Record<string, unknown> | unknown[];

    @IsNumber()
    @IsOptional()
    @Min(0)
    orderIndex?: number;

    @IsBoolean()
    @IsOptional()
    enabled?: boolean;

    @IsObject()
    @IsOptional()
    metadata?: Record<string, unknown>;
}
