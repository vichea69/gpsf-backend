import { IsNotEmpty, IsObject, IsOptional} from 'class-validator';

export class CreateCategoryDto {
  @IsObject()
  @IsNotEmpty()
  name: {
    en: string;
    km?: string;
  };

  @IsOptional()
  @IsObject()
  description?: {
    en: string;
    km?: string;
  };
};


