import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { EmailService } from '../auth/email.service';

interface NotificationRow {
  id: number;
  title: string;
  message: string;
  link: string | null;
  cree_le: string;
  lu_le: string | null;
}

interface Courriel {
  id: number;
  recipient: string;
  subject: string;
  body: string;
  attempts: number;
  max_attempts: number;
}

@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsService.name);
  private timer?: NodeJS.Timeout;
  private traitementEnCours = false;

  constructor(
    private readonly db: DatabaseService,
    private readonly email: EmailService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => void this.traiter(), 60_000);
    this.timer.unref();
    void this.traiter();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async lister(userId: number) {
    const rows = await this.db.query<NotificationRow>(
      `SELECT id, title, message, link,
              to_char(cree_le AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS cree_le,
              CASE WHEN lu_le IS NULL THEN NULL
                   ELSE to_char(lu_le AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
              END AS lu_le
       FROM system.notifications
       WHERE user_id = $1
       ORDER BY cree_le DESC, id DESC
       LIMIT 100`,
      [userId],
    );
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      message: row.message,
      link: row.link ?? undefined,
      creeLe: row.cree_le,
      luLe: row.lu_le ?? undefined,
    }));
  }

  async marquerLue(userId: number, notificationId: number): Promise<void> {
    await this.db.query(
      `UPDATE system.notifications
       SET lu_le = COALESCE(lu_le, NOW())
       WHERE id = $1 AND user_id = $2`,
      [notificationId, userId],
    );
  }

  private async traiter(): Promise<void> {
    if (this.traitementEnCours) return;
    this.traitementEnCours = true;
    try {
      await this.creerRappelsCampagne();
      await this.creerRappelsSeances();
      await this.envoyerCourrielsEnAttente();
    } catch {
      this.logger.error('Le traitement des rappels et courriels a échoué');
    } finally {
      this.traitementEnCours = false;
    }
  }

  private async creerRappelsCampagne(): Promise<void> {
    await this.db.query(
      `WITH destinataires AS (
         SELECT c.id AS campaign_id, co.id AS course_id, e.student_id,
                u.email, coalesce(ue.intitule, c.libelle) AS cours,
                to_char(c.fin AT TIME ZONE 'UTC', 'DD/MM/YYYY HH24:MI') AS echeance
         FROM evaluation.campaigns c
         JOIN ref.department d ON d.id = c.department_id
         JOIN ref.program p ON p.department_id = d.id
         JOIN ref.course co
           ON co.program_id = p.id
          AND co.annee_universitaire = c.annee_universitaire
          AND co.semestre = c.semestre
         JOIN ref.ue ue ON ue.id = co.ue_id
         JOIN ref.enrollment e ON e.course_id = co.id
         JOIN identity.users u ON u.id = e.student_id AND u.email IS NOT NULL AND u.actif
         WHERE c.statut = 'ouverte' AND c.debut <= NOW()
           AND c.fin > NOW() AND c.fin <= NOW() + INTERVAL '48 hours'
           AND NOT EXISTS (
             SELECT 1 FROM evaluation.participation_ledger pl
             WHERE pl.campaign_id = c.id AND pl.course_id = co.id
               AND pl.student_id = e.student_id
           )
       )
       INSERT INTO system.notifications (user_id, event_key, title, message, link)
       SELECT student_id,
              'evaluation-reminder:' || campaign_id || ':' || course_id || ':' || student_id,
              'Évaluation à compléter',
              'La campagne « ' || cours || ' » se termine le ' || echeance || '.',
              '/evaluations'
       FROM destinataires
       ON CONFLICT (user_id, event_key) DO NOTHING`,
    );

    await this.db.query(
      `WITH destinataires AS (
         SELECT c.id AS campaign_id, co.id AS course_id, e.student_id, u.email,
                coalesce(ue.intitule, c.libelle) AS cours,
                to_char(c.fin AT TIME ZONE 'UTC', 'DD/MM/YYYY HH24:MI') AS echeance,
                c.fin AS expire_le
         FROM evaluation.campaigns c
         JOIN ref.department d ON d.id = c.department_id
         JOIN ref.program p ON p.department_id = d.id
         JOIN ref.course co
           ON co.program_id = p.id
          AND co.annee_universitaire = c.annee_universitaire
          AND co.semestre = c.semestre
         JOIN ref.ue ue ON ue.id = co.ue_id
         JOIN ref.enrollment e ON e.course_id = co.id
         JOIN identity.users u ON u.id = e.student_id AND u.email IS NOT NULL AND u.actif
         WHERE c.statut = 'ouverte' AND c.debut <= NOW()
           AND c.fin > NOW() AND c.fin <= NOW() + INTERVAL '48 hours'
           AND NOT EXISTS (
             SELECT 1 FROM evaluation.participation_ledger pl
             WHERE pl.campaign_id = c.id AND pl.course_id = co.id
               AND pl.student_id = e.student_id
           )
       )
       INSERT INTO system.email_outbox (event_key, recipient, subject, body, expires_at)
       SELECT 'evaluation-reminder:' || campaign_id || ':' || course_id || ':' || student_id,
              email, 'Rappel : campagne d’évaluation',
              'La campagne « ' || cours || ' » se termine le ' || echeance ||
                '. Vous pouvez participer depuis votre espace étudiant.',
              expire_le
       FROM destinataires
       ON CONFLICT (event_key) DO NOTHING`,
    );
  }

  private async creerRappelsSeances(): Promise<void> {
    await this.db.query(
      `WITH destinataires AS (
         SELECT s.id AS session_id, e.student_id, ue.code, ue.intitule,
                to_char(s.date, 'DD/MM/YYYY') AS date_seance,
                to_char(s.debut, 'HH24:MI') AS debut,
                to_char(s.fin, 'HH24:MI') AS fin
         FROM academic.class_sessions s
         JOIN ref.course co ON co.id = s.course_id
         JOIN ref.ue ue ON ue.id = co.ue_id
         JOIN ref.enrollment e ON e.course_id = co.id
         JOIN identity.users u ON u.id = e.student_id AND u.actif
         WHERE s.statut = 'planifiee'
           AND (s.date + s.debut) >= LOCALTIMESTAMP
           AND (s.date + s.debut) < LOCALTIMESTAMP + INTERVAL '24 hours'
       )
       INSERT INTO system.notifications (user_id, event_key, title, message, link)
       SELECT student_id, 'class-session-reminder:' || session_id || ':' || student_id,
              'Rappel de séance',
              'Séance ' || code || ' — ' || intitule || ', le ' || date_seance ||
                ' de ' || debut || ' à ' || fin || '.',
              '/cahier-texte'
       FROM destinataires
       ON CONFLICT (user_id, event_key) DO NOTHING`,
    );

    await this.db.query(
      `WITH destinataires AS (
         SELECT s.id AS session_id, e.student_id, u.email, ue.code, ue.intitule,
                to_char(s.date, 'DD/MM/YYYY') AS date_seance,
                to_char(s.debut, 'HH24:MI') AS debut,
                to_char(s.fin, 'HH24:MI') AS fin,
                ((s.date + s.debut) AT TIME ZONE current_setting('TIMEZONE')) AS expire_le
         FROM academic.class_sessions s
         JOIN ref.course co ON co.id = s.course_id
         JOIN ref.ue ue ON ue.id = co.ue_id
         JOIN ref.enrollment e ON e.course_id = co.id
         JOIN identity.users u ON u.id = e.student_id AND u.email IS NOT NULL AND u.actif
         WHERE s.statut = 'planifiee'
           AND (s.date + s.debut) >= LOCALTIMESTAMP
           AND (s.date + s.debut) < LOCALTIMESTAMP + INTERVAL '24 hours'
       )
       INSERT INTO system.email_outbox (event_key, recipient, subject, body, expires_at)
       SELECT 'class-session-reminder:' || session_id || ':' || student_id,
              email, 'Rappel : séance planifiée',
              'Séance ' || code || ' — ' || intitule || ', le ' || date_seance ||
                ' de ' || debut || ' à ' || fin || '. Consultez votre cahier de texte.',
                expire_le
       FROM destinataires
       ON CONFLICT (event_key) DO NOTHING`,
    );
  }

  private async envoyerCourrielsEnAttente(): Promise<void> {
    await this.db.query(
      `UPDATE system.email_outbox
       SET failed_at = NOW(), recipient = '', subject = '', body = ''
       WHERE sent_at IS NULL AND failed_at IS NULL AND expires_at <= NOW()`,
    );
    for (let nombre = 0; nombre < 10; nombre += 1) {
      const rows = await this.db.transaction(async (query) =>
        query<Courriel>(
          `WITH candidat AS (
             SELECT id FROM system.email_outbox
             WHERE sent_at IS NULL AND failed_at IS NULL
               AND attempts < max_attempts AND available_at <= NOW()
               AND (expires_at IS NULL OR expires_at > NOW())
             ORDER BY available_at, id
             LIMIT 1
             FOR UPDATE SKIP LOCKED
           )
           UPDATE system.email_outbox o
           SET attempts = attempts + 1,
               available_at = NOW() + INTERVAL '10 minutes'
           FROM candidat
           WHERE o.id = candidat.id
           RETURNING o.id, o.recipient, o.subject, o.body, o.attempts, o.max_attempts`,
        ),
      );
      const courriel = rows[0];
      if (!courriel) return;
      try {
        await this.email.envoyer(
          courriel.recipient,
          courriel.subject,
          courriel.body,
        );
        await this.db.query(
          `UPDATE system.email_outbox
           SET sent_at = NOW(), recipient = '', subject = '', body = ''
           WHERE id = $1`,
          [courriel.id],
        );
      } catch {
        const abandonner = courriel.attempts >= courriel.max_attempts;
        await this.db.query(
          `UPDATE system.email_outbox
           SET available_at = NOW() + ($2::int * INTERVAL '1 minute'),
               failed_at = CASE WHEN $3::boolean THEN NOW() ELSE NULL END,
               recipient = CASE WHEN $3::boolean THEN '' ELSE recipient END,
               subject = CASE WHEN $3::boolean THEN '' ELSE subject END,
               body = CASE WHEN $3::boolean THEN '' ELSE body END
           WHERE id = $1`,
          [courriel.id, Math.min(60, 2 ** courriel.attempts), abandonner],
        );
        this.logger.warn(
          'Échec d’envoi d’un courriel; nouvelle tentative planifiée',
        );
      }
    }
  }
}
