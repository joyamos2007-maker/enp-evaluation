import {
  Controller,
  ForbiddenException,
  Post,
  UseInterceptors,
  UploadedFile,
  Param,
  Body,
  BadRequestException,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { RequeteAuthentifiee } from '../auth/auth.types';
import { CampusScopeService } from '../database/campus-scope.service';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Acces } from '../auth/acces.decorator';
import { ImportsService } from './imports.service';
import { FileUploadDto } from './dto/file-upload.dto';
import { AcademicImportsService, type TypeImportAcademique } from './academic-imports.service';

const TYPES_IMPORT: TypeImportAcademique[] = [
  'etudiants',
  'enseignants',
  'ue',
  'offres',
  'affectations',
  'inscriptions',
  'delegues',
];

@ApiTags('Imports CSV (Référentiels & Comptes)')
@ApiBearerAuth()
@Acces('scolarite', 'admin')
@Controller('imports')
export class ImportsController {
  constructor(
    private readonly importsService: ImportsService,
    private readonly campusScope: CampusScopeService,
    private readonly academicImports: AcademicImportsService,
  ) {}

  @Post('users')
  @ApiOperation({
    summary: 'Importer des comptes utilisateurs à partir d\'un fichier CSV',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Fichier CSV contenant les utilisateurs',
    type: FileUploadDto,
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024 } }))
  async importUsers(
    @UploadedFile() file: { buffer: Buffer } | undefined,
    @Req() requete: RequeteAuthentifiee,
  ) {
    if (!file) {
      throw new BadRequestException('Aucun fichier CSV fourni.');
    }
    const utilisateur = requete.utilisateur;
    if (!utilisateur) throw new UnauthorizedException('Jeton manquant');
    const campusId = await this.campusScope.forScolarite(utilisateur.id, utilisateur.roles);
    return this.importsService.importUsers(file.buffer, campusId, utilisateur.roles);
  }

  @Post(':type/verification')
  @ApiOperation({ summary: 'Valider un CSV académique sans modifier les référentiels' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('fichier', { limits: { fileSize: 2 * 1024 * 1024 } }))
  async verifierImport(
    @Param('type') typeBrut: string,
    @UploadedFile() file: { buffer: Buffer } | undefined,
    @Req() requete: RequeteAuthentifiee,
  ) {
    const type = this.lireType(typeBrut);
    if (!file) throw new BadRequestException('Aucun fichier CSV fourni');
    const utilisateur = requete.utilisateur;
    if (!utilisateur) throw new UnauthorizedException('Jeton manquant');
    if (type === 'ue' && utilisateur.activeRole !== 'admin') {
      throw new ForbiddenException('Seule l’administration peut modifier le catalogue des UE');
    }
    const campusId = await this.campusScope.forScolarite(utilisateur.id, utilisateur.roles);
    return this.academicImports.verifier(type, file.buffer, utilisateur.id, campusId);
  }

  @Post(':type/valider')
  @ApiOperation({ summary: 'Appliquer les lignes valides d’un import vérifié' })
  async validerImport(
    @Param('type') typeBrut: string,
    @Body() body: { importId?: string },
    @Req() requete: RequeteAuthentifiee,
  ) {
    const type = this.lireType(typeBrut);
    if (typeof body?.importId !== 'string') throw new BadRequestException('Identifiant d’import obligatoire');
    const utilisateur = requete.utilisateur;
    if (!utilisateur) throw new UnauthorizedException('Jeton manquant');
    const campusId = await this.campusScope.forScolarite(utilisateur.id, utilisateur.roles);
    return this.academicImports.valider(type, body.importId, utilisateur.id, campusId);
  }

  private lireType(type: string): TypeImportAcademique {
    if (TYPES_IMPORT.includes(type as TypeImportAcademique)) return type as TypeImportAcademique;
    throw new BadRequestException('Type d’import non pris en charge');
  }
}