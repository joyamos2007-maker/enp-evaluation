import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { Acces } from '../auth/acces.decorator';
import { AuditService } from './audit.service';

@Controller('audit')
@Acces('admin')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  lister(@Query('limite') limiteBrute?: string) {
    const limite = limiteBrute === undefined ? 100 : Number(limiteBrute);
    if (!Number.isSafeInteger(limite) || limite < 1 || limite > 200) {
      throw new BadRequestException(
        'limite doit être un entier compris entre 1 et 200',
      );
    }
    return this.audit.lister(limite);
  }
}
