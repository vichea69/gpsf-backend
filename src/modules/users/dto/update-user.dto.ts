import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Matches } from 'class-validator';

export class UpdateUserDto {

    @IsOptional()
    @IsString()
    username?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @Transform(({ value }) => (value === null ? '' : value))
    @IsString()
    bio?: string;

    @IsOptional()
    @Transform(({ value }) => (value === null ? '' : value))
    @IsString()
    image?: string;

    @IsOptional()
    @IsString()
    password?: string;

    @IsOptional()
    @Matches(/^[a-z0-9-]+$/, { message: 'Role must be a slug using lowercase letters, numbers, or hyphens.' })
    role?: string;
}
