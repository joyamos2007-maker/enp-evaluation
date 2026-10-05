import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { PasswordService } from './password.service';
import { DUREE_JETON_SECONDES, TokenService } from './token.service';

@Injectable()
export class AuthService {
  private empreinteFactice?: Promise<string>;

  constructor(
    private readonly users: UsersService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
  ) {}

  async connecter(identifiant: string, motDePasse: string) {
    const utilisateur = await this.users.trouverParIdentifiant(identifiant);

    // Meme duree de calcul que l identifiant existe ou non
    const empreinte = utilisateur?.mot_de_passe_hash ?? (await this.obtenirEmpreinteFactice());
    const motDePasseValide = await this.passwords.verify(empreinte, motDePasse);

    if (
      !utilisateur ||
      !utilisateur.actif ||
      !utilisateur.mot_de_passe_hash ||
      !motDePasseValide
    ) {
      throw new UnauthorizedException('Identifiant ou mot de passe incorrect');
    }

    const roles = await this.users.rolesDe(utilisateur.id);
    return {
      accessToken: this.tokens.signerAcces({ sub: String(utilisateur.id), roles }),
      expiresIn: DUREE_JETON_SECONDES,
      utilisateur: {
        id: utilisateur.id,
        nom: utilisateur.nom,
        prenom: utilisateur.prenom,
        roles,
      },
    };
  }

  private obtenirEmpreinteFactice(): Promise<string> {
    if (!this.empreinteFactice) {
      this.empreinteFactice = this.passwords.hash('mot-de-passe-factice');
    }
    return this.empreinteFactice;
  }
}