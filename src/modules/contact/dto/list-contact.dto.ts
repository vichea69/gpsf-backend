import { Transform } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";

export class ListContactDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsIn(["createdAt", "email", "subject", "isRead"])
  sortBy?: "createdAt" | "email" | "subject" | "isRead" = "createdAt";

  @IsOptional()
  @IsIn(["ASC", "DESC"])
  order?: "ASC" | "DESC" = "DESC";
}