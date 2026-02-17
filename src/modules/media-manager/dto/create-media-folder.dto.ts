import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateMediaFolderDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;
}
