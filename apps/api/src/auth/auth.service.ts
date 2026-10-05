import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { type Utilisateur, UsersService } from '../users/users.service';
import { PasswordService } from './password.service';
import { type SessionEmise, SessionService } from './session.service';
import { DUREE_JETON_SECONDES, TokenService } from './token.service';

const MESSAGE_ECHEC = 'Identifiant ou mot de passe incorrect';
const MESSAGE_SESSION = 'Session expiree, reconnectez-vous';

@Injectable()
export class AuthService {
  private empreinteFactice?: Promise<string>;

  constructor(
    private readonly users: UsersService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly sessions: SessionService,
  ) {}

  async connecter(identifiant: string, motDePasse: string) {
    const utilisateur = await this.users.trouverParIdentifiant(identifiant);

    // Compte verrouille : on ne teste meme pas le mot de passe
    const finVerrouillage = utilisateur?.verrouille_jusqua;
    if (finVerrouillage && finVerrouillage.getTime() > Date.now()) {
      const minutes = Math.ceil((finVerrouillage.getTime() - Date.now()) / 60000);
      throw new HttpException(
        'Trop de tentatives echouees. Reessayez dans ' + minutes + ' minute(s).',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Meme calcul de hachage que l identifiant existe ou non
    const empreinte = utilisateur?.mot_de_passe_hash ?? (await this.obtenirEmpreinteFactice());
    const motDePasseValide = await this.passwords.verify(empreinte, motDePasse);

    if (!utilisateur || !utilisateur.actif || !utilisateur.mot_de_passe_hash) {
      throw new UnauthorizedException(MESSAGE_ECHEC);
    }
    if (!motDePasseValide) {
      await this.users.enregistrerEchec(utilisateur.id);
      throw new UnauthorizedException(MESSAGE_ECHEC);
    }

    if (utilisateur.tentatives_echouees > 0 || utilisateur.verrouille_jusqua) {
      await this.users.reinitialiserEchecs(utilisateur.id);
    }

    const refresh = await this.sessions.creer(utilisateur.id);
    return this.reponseAvec(utilisateur, refresh);
  }

  async rafraichir(jetonBrut: string) {
    const session = await this.sessions.renouveler(jetonBrut);
    const utilisateur = await this.users.trouverParId(session.userId);

    // Compte supprime ou desactive depuis la derniere connexion : on coupe tout
    if (!utilisateur || !utilisateur.actif) {
      await this.sessions.revoquer(session.jeton);
      throw new UnauthorizedException(MESSAGE_SESSION);
    }
    return this.reponseAvec(utilisateur, { jeton: session.jeton, expireLe: session.expireLe });
  }

  async deconnecter(jetonBrut: string): Promise<void> {
    await this.sessions.revoquer(jetonBrut);
  }

  private async reponseAvec(
    utilisateur: Pick<Utilisateur, 'id' | 'nom' | 'prenom'>,
    refresh: SessionEmise,
  ) {
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
      refresh,
    };
  }

  private obtenirEmpreinteFactice(): Promise<string> {
    if (!this.empreinteFactice) {
      this.empreinteFactice = this.passwords.hash('mot-de-passe-factice');
    }
    return this.empreinteFactice;
  }
}