import { ApiProperty } from '@nestjs/swagger';

export class FileUploadDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Fichier CSV d\'import (encodage UTF-8)',
  })
  file: any;
}