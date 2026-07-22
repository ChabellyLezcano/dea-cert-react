#!/usr/bin/env node
// merge-databricks-exams.mjs
//
// Fusiona src/quiz/data/databricks-dea/exams/exam1.ts..exam11.ts en un
// unico archivo src/quiz/data/databricks-dea/exams.ts (append: se mantiene
// el contenido de cada examen, solo se deduplica el import repetido y las
// cabeceras de comentario). Ademas actualiza src/quiz/data/bank.ts para que
// reconozca el nuevo archivo consolidado y genere el id de cada pregunta
// como {examNumber}{n con padding a 2 digitos}, ej. examen 4 pregunta 17 -> "417".
//
// Ejecutar desde la raiz del repo:
//   node merge-databricks-exams.mjs
//
// Requiere Node 18+. No usa dependencias externas.

import { readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = process.cwd();
const EXAMS_DIR = join(REPO_ROOT, 'src/quiz/data/databricks-dea/exams');
const OUT_FILE = join(REPO_ROOT, 'src/quiz/data/databricks-dea/exams.ts');
const BANK_FILE = join(REPO_ROOT, 'src/quiz/data/bank.ts');
const N_EXAMS = 11;

function fail(msg) {
  console.error('\n[ERROR] ' + msg);
  process.exit(1);
}

console.log('== 1/4: Verificando archivos de origen ==');
if (!existsSync(EXAMS_DIR)) {
  fail('No existe ' + EXAMS_DIR + '. ¿Ya se fusiono antes, o el path no es correcto?');
}
for (let i = 1; i <= N_EXAMS; i++) {
  const p = join(EXAMS_DIR, 'exam' + i + '.ts');
  if (!existsSync(p)) fail('Falta ' + p);
}
console.log('  OK: exam1.ts .. exam' + N_EXAMS + '.ts encontrados en ' + EXAMS_DIR);

console.log('== 2/4: Fusionando exam1..exam' + N_EXAMS + ' en exams.ts ==');
let importLine = null;
const afterBlocks = [];

for (let i = 1; i <= N_EXAMS; i++) {
  const path = join(EXAMS_DIR, 'exam' + i + '.ts');
  const raw = readFileSync(path, 'utf8');
  const lines = raw.split('\n');

  const importIdx = lines.findIndex((l) => l.startsWith('import '));
  if (importIdx === -1) fail('No se encontro la linea "import " en ' + path);

  if (importLine === null) {
    importLine = lines[importIdx];
  } else if (lines[importIdx] !== importLine) {
    fail(
      'La linea de import de ' +
        path +
        ' no coincide con las anteriores:\n  esperado: ' +
        importLine +
        '\n  encontrado: ' +
        lines[importIdx],
    );
  }

  let after = lines.slice(importIdx + 1);
  while (after.length && after[0].trim() === '') after = after.slice(1);
  afterBlocks.push(after);
}

const outLines = [importLine, ''];
for (const block of afterBlocks) outLines.push(...block);
while (outLines.length && outLines[outLines.length - 1].trim() === '') outLines.pop();
const mergedContent = outLines.join('\n') + '\n';

writeFileSync(OUT_FILE, mergedContent, 'utf8');
if (!existsSync(OUT_FILE)) fail('No se pudo crear ' + OUT_FILE);

const writtenLines = readFileSync(OUT_FILE, 'utf8').split('\n').length;
const exportedExams = [...mergedContent.matchAll(/^export const exam(\d+):/gm)].map((m) => Number(m[1]));
console.log(
  '  OK: ' + OUT_FILE + ' creado (' + writtenLines + ' lineas, exports: ' + exportedExams.join(', ') + ')',
);
if (exportedExams.length !== N_EXAMS) {
  fail('Se esperaban ' + N_EXAMS + ' exports "examN" y se encontraron ' + exportedExams.length);
}

console.log('== 3/4: Eliminando la carpeta antigua exams/ ==');
rmSync(EXAMS_DIR, { recursive: true, force: true });
if (existsSync(EXAMS_DIR)) fail('No se pudo eliminar ' + EXAMS_DIR);
console.log('  OK: ' + EXAMS_DIR + ' eliminada');

console.log('== 4/4: Actualizando bank.ts ==');
const bankContent =
  'import type { RawQuestion, SeededQuestion } from \'@/quiz/quiz.types\';\n\n/**\n * Eagerly import every exam module across every certification folder at\n * build time. Two on-disk shapes are supported, both matched by the two\n * globs below:\n *\n *  - Legacy, one file per exam: ./<certId>/exams/examN.ts, each exporting a\n *    single array named `examN` (matching its filename), e.g. AWS SAA.\n *  - Consolidated, one file per certification: ./<certId>/exams.ts,\n *    exporting several `examN` arrays side by side (a plain merge/append of\n *    the old per-exam files into one module), e.g. Databricks DEA.\n *\n * Either way, every export matching `examN` is picked up regardless of how\n * many live in the same module, so adding a new exam is just adding (or\n * appending) an `examN` export -- neither shape requires touching this file.\n */\nconst legacyExamModules = import.meta.glob<Record<string, RawQuestion[]>>(\'./*/exams/exam*.ts\', {\n  eager: true,\n});\nconst consolidatedExamModules = import.meta.glob<Record<string, RawQuestion[]>>(\'./*/exams.ts\', {\n  eager: true,\n});\n\nconst LEGACY_PATH_PATTERN = /^\\.\\/([^/]+)\\/exams\\/exam\\d+\\.ts$/;\nconst CONSOLIDATED_PATH_PATTERN = /^\\.\\/([^/]+)\\/exams\\.ts$/;\nconst EXAM_EXPORT_PATTERN = /^exam(\\d+)$/;\n\nfunction extractExams(\n  path: string,\n  certId: string,\n  mod: Record<string, RawQuestion[]>,\n): (readonly [certId: string, examNumber: number, questions: RawQuestion[]])[] {\n  const entries = Object.entries(mod).filter(([exportName]) => EXAM_EXPORT_PATTERN.test(exportName));\n  if (entries.length === 0) {\n    throw new Error(`Expected ${path} to export at least one "examN" array`);\n  }\n  return entries.map(([exportName, questions]) => {\n    const [, examNumberStr] = EXAM_EXPORT_PATTERN.exec(exportName)!;\n    return [certId, Number(examNumberStr), questions] as const;\n  });\n}\n\nconst EXAMS: readonly (readonly [certId: string, examNumber: number, questions: RawQuestion[]])[] = [\n  ...Object.entries(legacyExamModules).flatMap(([path, mod]) => {\n    const match = LEGACY_PATH_PATTERN.exec(path);\n    if (!match) {\n      throw new Error(`Unexpected exam file path, expected "./<certId>/exams/examN.ts": ${path}`);\n    }\n    return extractExams(path, match[1], mod);\n  }),\n  ...Object.entries(consolidatedExamModules).flatMap(([path, mod]) => {\n    const match = CONSOLIDATED_PATH_PATTERN.exec(path);\n    if (!match) {\n      throw new Error(`Unexpected exam file path, expected "./<certId>/exams.ts": ${path}`);\n    }\n    return extractExams(path, match[1], mod);\n  }),\n].sort(([certA, examA], [certB, examB]) => certA.localeCompare(certB) || examA - examB);\n\n/**\n * The full question bank across all certifications, built synchronously at\n * import time from static TypeScript modules. Because there is no async\n * loading or DOM script ordering involved, the bank (and therefore the\n * sidebar stats derived from it) is guaranteed to be available on the very\n * first render.\n *\n * `id` is `{examNumber}{questionNumber}`, with the question number\n * zero-padded to 2 digits (exam 4, question 17 -> "417"). The padding is\n * what keeps it collision-free: without it, exam 1 question 17 ("117")\n * would equal exam 11 question 7 ("11" + "7"). This intentionally replaces\n * the older "E{exam}Q{n}" shape, which means existing `question_progress`\n * rows in Supabase keyed by the old ids will no longer match -- a\n * migration/reset of that table is needed alongside this change.\n */\nexport const QUESTION_BANK: SeededQuestion[] = EXAMS.flatMap(([certId, examNumber, questions]) =>\n  questions.map((question) => ({\n    ...question,\n    exam: examNumber,\n    certId,\n    id: `${examNumber}${String(question.n).padStart(2, \'0\')}`,\n  })),\n);\n\nexport const EXAM_NUMBERS: number[] = [...new Set(EXAMS.map(([, examNumber]) => examNumber))].sort(\n  (a, b) => a - b,\n);\n\nexport const QUESTION_BY_ID: Map<string, SeededQuestion> = new Map(\n  QUESTION_BANK.map((question) => [question.id, question]),\n);\n';
writeFileSync(BANK_FILE, bankContent, 'utf8');
if (!existsSync(BANK_FILE)) fail('No se pudo escribir ' + BANK_FILE);
const writtenBank = readFileSync(BANK_FILE, 'utf8');
if (!writtenBank.includes('padStart(2') || !writtenBank.includes('consolidatedExamModules')) {
  fail('bank.ts se escribio pero no contiene el contenido esperado');
}
console.log('  OK: ' + BANK_FILE + ' actualizado');

console.log('\n=== Fusion completada ===');
console.log('Siguientes pasos recomendados:');
console.log('  1. pnpm typecheck && pnpm lint && pnpm test && pnpm build');
console.log('  2. Revisar el diff con git diff / git status');
console.log('  3. IMPORTANTE: el id de cada pregunta cambia de formato');
console.log('     ("E4Q17" -> "417"), lo que invalida las filas existentes');
console.log('     de question_progress en Supabase para Databricks DEA.');
console.log('     Si quieres conservar el progreso guardado, hay que migrar');
console.log('     esa tabla; si no, se puede limpiar sin mas.');
