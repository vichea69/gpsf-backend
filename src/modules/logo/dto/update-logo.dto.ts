import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateLogoDto {
  // Optional: provide an image URL (e.g. from media manager) to replace the current logo
  @IsOptional()
  @IsString()
  @MaxLength(600)
  url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(600)
  link?: string;

}
