CREATE SCHEMA IF NOT EXISTS evaluation;
CREATE SCHEMA IF NOT EXISTS ballot;

-- Qui a vote (sans la reponse)
CREATE TABLE IF NOT EXISTS evaluation.participation_ledger (
  campaign_id INT NOT NULL,
  course_id   INT NOT NULL,
  student_id  INT NOT NULL,
  jour        DATE NOT NULL DEFAULT CURRENT_DATE,
  PRIMARY KEY (campaign_id, course_id, student_id)
);

-- Ce qui a ete vote (sans l identite)
CREATE TABLE IF NOT EXISTS ballot.ballots (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id INT NOT NULL,
  course_id   INT NOT NULL,
  version_id  INT NOT NULL
);

CREATE TABLE IF NOT EXISTS ballot.ballot_answers (
  ballot_id    UUID NOT NULL REFERENCES ballot.ballots(id),
  criterion_id INT  NOT NULL,
  valeur       SMALLINT CHECK (valeur BETWEEN 1 AND 5),
  PRIMARY KEY (ballot_id, criterion_id)
);