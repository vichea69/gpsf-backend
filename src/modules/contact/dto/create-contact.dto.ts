import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateContactDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  lastName: string;

  @IsEmail()
  @MaxLength(190)
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(190)
  organisationName?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(220)
  subject: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsBoolean()
  isRead?: boolean;
}