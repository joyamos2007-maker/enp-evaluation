import {
  Controller,
  Post, // ✅ 'Post' avec une majuscule (et non POST)
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Acces } from '../auth/acces.decorator';
import { ImportsService } from './imports.service';
import { FileUploadDto } from './dto/file-upload.dto';

@ApiTags('Imports CSV (Référentiels & Comptes)')
@ApiBearerAuth()
@Acces('scolarite', 'admin')
@Controller('imports')
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Post('users')
  @ApiOperation({
    summary: 'Importer des comptes utilisateurs à partir d\'un fichier CSV',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Fichier CSV contenant les utilisateurs',
    type: FileUploadDto,
  })
  @UseInterceptors(FileInterceptor('file'))
  async importUsers(@UploadedFile() file: any, @Req() req: any) { // ✅ Utiliser 'any' ou 'Express.Multer.File'
    if (!file) {
      throw new BadRequestException('Aucun fichier CSV fourni.');
    }

    const scope = {
      campusId: req.user?.campusId,
    };

    return this.importsService.importUsers(file.buffer, scope);
  }
}