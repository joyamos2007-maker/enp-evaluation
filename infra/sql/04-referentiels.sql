CREATE SCHEMA IF NOT EXISTS ref;

CREATE TABLE IF NOT EXISTS ref.campus (
  id  SERIAL PRIMARY KEY,
  nom TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS ref.department (
  id        SERIAL PRIMARY KEY,
  campus_id INT  NOT NULL REFERENCES ref.campus(id),
  nom       TEXT NOT NULL,
  UNIQUE (campus_id, nom)
);

-- Formation / cursus : Cycle Preparatoire, Cycle Ingenieur, Master...
CREATE TABLE IF NOT EXISTS ref.program (
  id            SERIAL PRIMARY KEY,
  department_id INT  NOT NULL REFERENCES ref.department(id),
  nom           TEXT NOT NULL,
  UNIQUE (department_id, nom)
);

-- Catalogue des UE (independant de l annee)
CREATE TABLE IF NOT EXISTS ref.ue (
  id       SERIAL PRIMARY KEY,
  code     TEXT     NOT NULL UNIQUE,
  intitule TEXT     NOT NULL,
  credits  SMALLINT NOT NULL CHECK (credits > 0)
);

-- Une UE dispensee : c est le course_id du registre et de l urne
CREATE TABLE IF NOT EXISTS ref.course (
  id                  SERIAL PRIMARY KEY,
  ue_id               INT      NOT NULL REFERENCES ref.ue(id),
  program_id          INT      NOT NULL REFERENCES ref.program(id),
  annee_universitaire TEXT     NOT NULL CHECK (annee_universitaire ~ '^[0-9]{4}-[0-9]{4}$'),
  semestre            SMALLINT NOT NULL CHECK (semestre BETWEEN 1 AND 10),
  UNIQUE (ue_id, program_id, annee_universitaire, semestre)
);

-- Affectations : qui enseigne quel cours
CREATE TABLE IF NOT EXISTS ref.course_teacher (
  course_id  INT NOT NULL REFERENCES ref.course(id),
  teacher_id INT NOT NULL REFERENCES identity.users(id),
  PRIMARY KEY (course_id, teacher_id)
);

-- Inscriptions : qui suit quel cours
CREATE TABLE IF NOT EXISTS ref.enrollment (
  course_id  INT NOT NULL REFERENCES ref.course(id),
  student_id INT NOT NULL REFERENCES identity.users(id),
  PRIMARY KEY (course_id, student_id)
);

-- Delegues : par formation et par annee
CREATE TABLE IF NOT EXISTS ref.class_delegate (
  program_id          INT  NOT NULL REFERENCES ref.program(id),
  annee_universitaire TEXT NOT NULL CHECK (annee_universitaire ~ '^[0-9]{4}-[0-9]{4}$'),
  student_id          INT  NOT NULL REFERENCES identity.users(id),
  PRIMARY KEY (program_id, annee_universitaire, student_id)
);

CREATE INDEX IF NOT EXISTS course_teacher_teacher_idx ON ref.course_teacher (teacher_id);
CREATE INDEX IF NOT EXISTS enrollment_student_idx     ON ref.enrollment (student_id);
CREATE INDEX IF NOT EXISTS course_program_idx         ON ref.course (program_id);