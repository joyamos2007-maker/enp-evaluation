import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: "Matricule ou adresse email de l'utilisateur",
    example: 'admin@enp.edu',
  })
  @IsNotEmpty()
  @IsString()
  identifiant: string;

  @ApiProperty({
    description: "Mot de passe de l'utilisateur",
    example: 'Admin2026!',
  })
  @IsNotEmpty()
  @IsString()
  motDePasse: string;
}