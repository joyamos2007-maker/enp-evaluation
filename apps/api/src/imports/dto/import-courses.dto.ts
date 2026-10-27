import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class ImportCourseRowDto {
  @IsNotEmpty()
  @IsString()
  code: string; // Code UE / Cours

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsInt()
  @Min(1)
  credits: number;

  @IsInt()
  @Min(0)
  hoursCM: number;

  @IsInt()
  @Min(0)
  hoursTD: number;

  @IsInt()
  @Min(0)
  hoursTP: number;

  @IsNotEmpty()
  @IsString()
  programCode: string;

  @IsNotEmpty()
  @IsString()
  semesterCode: string; // S1 à S10
}