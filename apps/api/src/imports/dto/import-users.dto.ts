import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsString } from 'class-validator';

export enum RoleEnum {
  ETUDIANT = 'etudiant',
  DELEGUE = 'delegue',
  ENSEIGNANT = 'enseignant',
  CHEF_DEPARTEMENT = 'chef_departement',
  SCOLARITE = 'scolarite',
  DIRECTION_ETUDES = 'direction_etudes',
  ADMIN = 'admin',
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

}