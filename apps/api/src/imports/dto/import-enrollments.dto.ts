import { IsNotEmpty, IsString } from 'class-validator';

export class ImportEnrollmentRowDto {
  @IsNotEmpty()
  @IsString()
  studentMatricule: string;

  @IsNotEmpty()
  @IsString()
  courseCode: string;

  @IsNotEmpty()
  @IsString()
  academicYear: string; // ex: 2026-2027
}