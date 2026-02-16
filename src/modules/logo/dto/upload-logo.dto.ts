import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UploadLogoDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(600)
  url: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  title: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(400)
  description: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(600)
  link: string;
}
