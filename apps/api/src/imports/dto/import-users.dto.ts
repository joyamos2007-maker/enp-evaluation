import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum RoleEnum {
  ETUDIANT = 'ETUDIANT',
  DELEGUE = 'DELEGUE',
  ENSEIGNANT = 'ENSEIGNANT',
  CHEF_DEPT = 'CHEF_DEPT',
  SCOLARITE = 'SCOLARITE',
  DIRECTION_ETUDES = 'DIRECTION_ETUDES',
  ADMIN_TECH = 'ADMIN_TECH',
}

export class ImportUserRowDto {
  @ApiProperty({ example: 'TEST-2026-001', description: 'Matricule unique de l\'utilisateur' })
  @IsNotEmpty()
  @IsString()
  matricule: string;

  @ApiProperty({ example: 'etudiant@enp.tg', description: 'Adresse email institutionnelle' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'KOUDASSE', description: 'Nom de famille' })
  @IsNotEmpty()
  @IsString()
  nom: string;

  @ApiProperty({ example: 'Joy Amos', description: 'Prénom' })
  @IsNotEmpty()
  @IsString()
  prenom: string;

  @ApiProperty({ enum: RoleEnum, example: RoleEnum.ETUDIANT, description: 'Rôle attribué' })
  @IsEnum(RoleEnum)
  role: RoleEnum;

  @ApiPropertyOptional({ example: 'ENP-CL', description: 'Code du campus (ex: ENP-CL pour Lomé, ENP-CK pour Kara)' })
  @IsOptional()
  @IsString()
  campusCode?: string;

  @ApiPropertyOptional({ example: 'GC', description: 'Code du département' })
  @IsOptional()
  @IsString()
  departmentCode?: string;
}