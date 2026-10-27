import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';

@Injectable()
export class PasswordService {
  hash(motDePasse: string): Promise<string> {
    return hash(motDePasse);
  }

  async verify(empreinte: string, motDePasse: string): Promise<boolean> {
    try {
      return await verify(empreinte, motDePasse);
    } catch {
      return false;
    }
  }
}