import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { type Utilisateur, UsersService } from '../users/users.service';
import { PasswordService } from './password.service';
import { type SessionEmise, SessionService } from './session.service';
import { DUREE_JETON_SECONDES, TokenService } from './token.service';
import { IdentityService } from './identity.service';

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
    private readonly identity: IdentityService,
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

    const roles = await this.users.rolesDe(utilisateur.id);
    if (roles.some((role) => ['admin', 'scolarite', 'direction_etudes', 'chef_departement'].includes(role))) {
      if (!utilisateur.email) {
        throw new ForbiddenException('Une adresse e-mail institutionnelle doit etre configuree pour le MFA');
      }
      const mfa = await this.identity.creerChallengeMfa(
        utilisateur.id,
        utilisateur.email,
        await this.identity.totpDisponible(utilisateur.id),
      );
      return mfa;
    }

    const roleActif = roles[0];
    if (!roleActif) throw new UnauthorizedException(MESSAGE_ECHEC);
    const refresh = await this.sessions.creer(utilisateur.id, roleActif);
    return this.reponseAvec(utilisateur, refresh, roleActif);
  }

  async rafraichir(jetonBrut: string) {
    const session = await this.sessions.renouveler(jetonBrut);
    const utilisateur = await this.users.trouverParId(session.userId);

    // Compte supprime ou desactive depuis la derniere connexion : on coupe tout
    if (!utilisateur || !utilisateur.actif) {
      await this.sessions.revoquer(session.jeton);
      throw new UnauthorizedException(MESSAGE_SESSION);
    }
    const roles = await this.users.rolesDe(utilisateur.id);
    const roleActif = session.activeRole && roles.includes(session.activeRole)
      ? session.activeRole
      : roles[0];
    if (!roleActif) {
      await this.sessions.revoquer(session.jeton);
      throw new UnauthorizedException(MESSAGE_SESSION);
    }
    return this.reponseAvec(
      utilisateur,
      { jeton: session.jeton, expireLe: session.expireLe },
      roleActif,
    );
  }

  async verifierMfa(challengeId: string, method: string, code: string) {
    const userId = await this.identity.verifierChallengeMfa(challengeId, method, code);
    const utilisateur = await this.users.trouverParId(userId);
    if (!utilisateur || !utilisateur.actif || !utilisateur.mot_de_passe_hash) {
      throw new UnauthorizedException(MESSAGE_ECHEC);
    }
    const roles = await this.users.rolesDe(userId);
    const roleActif = roles[0];
    if (!roleActif) throw new UnauthorizedException(MESSAGE_ECHEC);
    const refresh = await this.sessions.creer(userId, roleActif);
    return this.reponseAvec(utilisateur, refresh, roleActif);
  }

  async selectionnerProfil(userId: number, role: string, refreshToken: string) {
    const roles = await this.users.rolesDe(userId);
    if (!roles.includes(role)) throw new ForbiddenException('Profil non attribue a ce compte');
    if (!(await this.sessions.changerProfil(refreshToken, userId, role))) {
      throw new UnauthorizedException(MESSAGE_SESSION);
    }
    const utilisateur = await this.users.trouverParId(userId);
    if (!utilisateur || !utilisateur.actif) throw new UnauthorizedException(MESSAGE_SESSION);
    return {
      accessToken: this.tokens.signerAcces({
        sub: String(userId),
        roles,
        activeRole: role,
      }),
      expiresIn: DUREE_JETON_SECONDES,
      utilisateur: {
        id: utilisateur.id,
        nom: utilisateur.nom,
        prenom: utilisateur.prenom,
        roles,
        activeRole: role,
      },
    };
  }

  async deconnecter(jetonBrut: string): Promise<void> {
    await this.sessions.revoquer(jetonBrut);
  }

  private async reponseAvec(
    utilisateur: Pick<Utilisateur, 'id' | 'nom' | 'prenom'>,
    refresh: SessionEmise,
    activeRole: string,
  ) {
    const roles = await this.users.rolesDe(utilisateur.id);
    return {
      accessToken: this.tokens.signerAcces({
        sub: String(utilisateur.id),
        roles,
        activeRole,
      }),
      expiresIn: DUREE_JETON_SECONDES,
      utilisateur: {
        id: utilisateur.id,
        nom: utilisateur.nom,
        prenom: utilisateur.prenom,
        roles,
        activeRole,
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