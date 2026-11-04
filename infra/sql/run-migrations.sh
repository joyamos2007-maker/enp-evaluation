#!/bin/sh
set -eu

: "${PGHOST:?}"
: "${PGUSER:?}"
: "${PGPASSWORD:?}"
: "${PGDATABASE:?}"
: "${APP_MAIN_PASSWORD:?}"
: "${BALLOT_APP_PASSWORD:?}"
: "${RESULTS_APP_PASSWORD:?}"

export PGSSLMODE="${PGSSLMODE:-require}"
export PGCONNECT_TIMEOUT="${PGCONNECT_TIMEOUT:-30}"

for migration in \
  /migrations/000_init_schemas.sql \
  /migrations/01-schemas.sql \
  /migrations/02-identity.sql \
  /migrations/03-session.sql \
  /migrations/04-referentiels.sql \
  /migrations/05-evaluation.sql \
  /migrations/06-urne.sql \
  /migrations/07-resultats.sql \
  /migrations/08-moderation.sql \
  /migrations/008_step_a_multi_campus_imports.sql \
  /migrations/009_direction_etudes.sql \
  /migrations/010_cahier_texte.sql \
  /migrations/011_chef_departement_pilotage.sql \
  /migrations/012_notes_presences.sql \
  /migrations/013_deliberation_examens.sql \
  /migrations/014_auth_lifecycle.sql \
  /migrations/015_imports_affectations_archives.sql \
  /migrations/016_notifications_exports_cahier_audit.sql \
  /migrations/017_mfa_trusted_devices.sql
do
  printf 'Applying %s\n' "${migration##*/}"
  psql -X --no-password --set=ON_ERROR_STOP=1 --file "$migration"
done

printf '%s\n' \
  "ALTER ROLE app_main WITH PASSWORD :'app_main_password';" \
  "ALTER ROLE ballot_app WITH PASSWORD :'ballot_app_password';" \
  "ALTER ROLE results_app WITH PASSWORD :'results_app_password';" |
  psql -X --no-password --set=ON_ERROR_STOP=1 \
    --set=app_main_password="$APP_MAIN_PASSWORD" \
    --set=ballot_app_password="$BALLOT_APP_PASSWORD" \
    --set=results_app_password="$RESULTS_APP_PASSWORD"
