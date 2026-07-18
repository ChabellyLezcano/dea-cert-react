// add-aws-saa.mjs
// One-off script: adds AWS Certified Solutions Architect - Associate as a
// second certification (minimal viable content), to validate the
// multi-cert model end to end. Also runs the full verification suite.
//
// Usage: node add-aws-saa.mjs

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

const ROOT = process.cwd();

function write(relPath, lines) {
  const full = path.join(ROOT, relPath);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, lines.join('\n'), 'utf8');
  console.log('Written: ' + relPath + ' (exists: ' + existsSync(full) + ')');
}

// --- 1. registry.ts: add the aws-saa entry -----------------------------

const registryPath = path.join(ROOT, 'src', 'certifications', 'registry.ts');
if (!existsSync(registryPath)) {
  console.error('ERROR: ' + registryPath + ' not found. Aborting.');
  process.exit(1);
}
let registryContent = readFileSync(registryPath, 'utf8');
if (registryContent.includes("id: 'aws-saa'")) {
  console.log('registry.ts already has aws-saa, skipping.');
} else {
  const oldBlock =
    'export const CERTIFICATIONS: readonly CertificationMeta[] = [\n' +
    '  {\n' +
    "    id: 'databricks-dea',\n" +
    "    name: 'Data Engineer Associate',\n" +
    "    provider: 'Databricks',\n" +
    "    examGuideVersion: '2026-05-04',\n" +
    '  },\n' +
    '];';
  const newBlock =
    'export const CERTIFICATIONS: readonly CertificationMeta[] = [\n' +
    '  {\n' +
    "    id: 'databricks-dea',\n" +
    "    name: 'Data Engineer Associate',\n" +
    "    provider: 'Databricks',\n" +
    "    examGuideVersion: '2026-05-04',\n" +
    '  },\n' +
    '  {\n' +
    "    id: 'aws-saa',\n" +
    "    name: 'Solutions Architect Associate',\n" +
    "    provider: 'AWS',\n" +
    "    examGuideVersion: 'SAA-C03',\n" +
    '  },\n' +
    '];';
  if (!registryContent.includes(oldBlock)) {
    console.error(
      'ERROR: registry.ts does not match the expected CERTIFICATIONS block exactly.\n' +
        'Add the aws-saa entry to it by hand -- see the chat message for the exact block.',
    );
  } else {
    registryContent = registryContent.replace(oldBlock, newBlock);
    writeFileSync(registryPath, registryContent, 'utf8');
    console.log('Updated: src/certifications/registry.ts (added aws-saa)');
  }
}

// --- 2. src/quiz/data/aws-saa/domains.ts --------------------------------

write('src/quiz/data/aws-saa/domains.ts', [
  "import type { RawDomain } from '@/quiz/quiz.types';",
  '',
  '/**',
  ' * Official domains from the AWS Certified Solutions Architect - Associate',
  ' * exam guide (SAA-C03). Only Domain 1 is loaded for now (minimal viable',
  ' * content to validate the multi-cert model) -- the other 3 official',
  ' * domains (Design Resilient Architectures 26%, Design High-Performing',
  ' * Architectures 24%, Design Cost-Optimized Architectures 20%) are not',
  ' * loaded yet.',
  ' */',
  'export const DOMAINS: RawDomain[] = [',
  "  { id: 'SEC', order: 1, name: 'Design Secure Architectures', weight: 30 },",
  '];',
  '',
]);

// --- 3. src/quiz/data/aws-saa/exams/exam101.ts --------------------------

write('src/quiz/data/aws-saa/exams/exam101.ts', [
  "import type { RawQuestion } from '@/quiz/quiz.types';",
  '',
  '/**',
  ' * Minimal viable question set for AWS SAA, used to validate the multi-cert',
  ' * model end to end. Numbered 101 (not 1) to avoid colliding with',
  ' * Databricks DEA exam 1-11 question ids (E{exam}Q{n} is not yet prefixed',
  ' * by certId -- see the note in src/quiz/data/bank.ts).',
  ' */',
  'export const exam101: RawQuestion[] = [',
  '  {',
  '    n: 1,',
  "    d: 'SEC',",
  '    m: 0,',
  "    q: 'A company wants to ensure that data stored in an Amazon S3 bucket is encrypted at rest without managing encryption keys themselves. Which S3 encryption option should they use?',",
  '    o: [',
  "      'Server-Side Encryption with Amazon S3 managed keys (SSE-S3)',",
  "      'Client-side encryption with a custom key management application',",
  "      'No encryption, relying on bucket policies alone',",
  "      'Server-Side Encryption with customer-provided keys (SSE-C)',",
  '    ],',
  '    a: [0],',
  "    x: 'SSE-S3 cifra los objetos con claves gestionadas por el propio S3, sin que el cliente tenga que crear ni administrar claves. SSE-C requeriria que el cliente aporte y gestione sus propias claves, y el cifrado del lado del cliente exige gestionar claves fuera de AWS.',",
  '  },',
  '  {',
  '    n: 2,',
  "    d: 'SEC',",
  '    m: 0,',
  "    q: 'Which AWS service is used to centrally manage fine-grained permissions for IAM users, groups, and roles across AWS services?',",
  "    o: ['AWS IAM', 'Amazon GuardDuty', 'AWS Shield', 'Amazon Macie'],",
  '    a: [0],',
  "    x: 'IAM (Identity and Access Management) es el servicio para definir y gestionar permisos granulares sobre quien puede hacer que en la cuenta de AWS. GuardDuty es deteccion de amenazas, Shield es proteccion DDoS, y Macie es descubrimiento de datos sensibles.',",
  '  },',
  '];',
  '',
]);

// --- 4. src/study/data/aws-saa/glossary.ts ------------------------------

write('src/study/data/aws-saa/glossary.ts', [
  "import type { RawGlossaryTerm } from '@/study/data/glossary.types';",
  '',
  '/**',
  ' * Minimal viable glossary for AWS SAA, used to validate the multi-cert',
  ' * model end to end.',
  ' */',
  'export const glossary: RawGlossaryTerm[] = [',
  '  {',
  "    t: 'IAM (Identity and Access Management)',",
  "    c: 'SEC',",
  "    d: 'Servicio de AWS para gestionar de forma centralizada usuarios, grupos, roles y sus permisos sobre recursos de la cuenta, siguiendo el principio de minimo privilegio.',",
  '  },',
  '  {',
  "    t: 'S3 Server-Side Encryption (SSE-S3)',",
  "    c: 'SEC',",
  "    d: 'Cifrado en reposo de objetos en Amazon S3 usando claves gestionadas por el propio servicio S3, sin que el cliente tenga que administrar las claves.',",
  '  },',
  '  {',
  "    t: 'Security Group',",
  "    c: 'SEC',",
  "    d: 'Firewall virtual a nivel de instancia en AWS que controla el trafico entrante y saliente mediante reglas con estado (stateful), a diferencia de las Network ACLs, que son sin estado.',",
  '  },',
  '];',
  '',
]);

// --- 5. src/study/data/aws-saa/examMeta.ts ------------------------------

write('src/study/data/aws-saa/examMeta.ts', [
  "import type { ExamMeta } from '@/study/data/glossary.types';",
  '',
  'export const examMeta: ExamMeta = {',
  "  cert: 'AWS Certified Solutions Architect - Associate',",
  "  version: 'SAA-C03',",
  '  facts: [',
  "    ['Duration', '130 minutes'],",
  "    ['Questions', '65 (scored + unscored)'],",
  "    ['Format', 'Multiple choice / multiple response'],",
  "    ['Passing score', '720 / 1000'],",
  '  ],',
  '  resources: [',
  '    [',
  "      'AWS Certification page',",
  "      'https://aws.amazon.com/certification/certified-solutions-architect-associate/',",
  '    ],',
  "    ['AWS Well-Architected Framework', 'https://aws.amazon.com/architecture/well-architected/'],",
  '  ],',
  '};',
  '',
]);

// --- 6. src/guide/data/aws-saa/topics/sec.ts ----------------------------

write('src/guide/data/aws-saa/topics/sec.ts', [
  "import type { RawStudyTopic } from '@/types/guide.types';",
  '',
  'export const secTopics: RawStudyTopic[] = [',
  '  {',
  "    id: 'SEC-iam-fundamentals',",
  "    domain: 'SEC',",
  '    order: 1,',
  "    title: 'IAM fundamentals',",
  "    summary: 'Users, groups, roles, and policies -- the building blocks of access control in AWS.',",
  '    contentMd: `## IAM fundamentals',
  '',
  '**IAM (Identity and Access Management)** is how you control *who* can do *what* in an AWS account.',
  '',
  '- **Users**: an identity for a person or application, with long-term credentials.',
  '- **Groups**: a collection of users that share the same permissions.',
  '- **Roles**: a temporary identity that can be assumed by users, applications, or AWS services -- no long-term credentials involved.',
  '- **Policies**: JSON documents that define permissions (allow/deny) attached to users, groups, or roles.',
  '',
  '### Key principle: least privilege',
  '',
  'Grant only the permissions required to perform a task, nothing more. Start restrictive and add permissions as needed, rather than starting broad and trying to restrict later.',
  '`,',
  '  },',
  '];',
  '',
]);

// --- 7. supabase/migrations/0005_aws_saa.sql ----------------------------

write('supabase/migrations/0005_aws_saa.sql', [
  '-- supabase/migrations/0005_aws_saa.sql',
  '-- Second certification: AWS Certified Solutions Architect - Associate',
  '-- (SAA-C03). Minimal viable content, added to validate the multi-cert',
  '-- model end to end (see src/quiz/data/aws-saa, src/study/data/aws-saa,',
  '-- src/guide/data/aws-saa).',
  '',
  'insert into public.certifications (id, name, provider, exam_guide_version)',
  "values ('aws-saa', 'Solutions Architect Associate', 'AWS', 'SAA-C03')",
  'on conflict (id) do nothing;',
  '',
  'insert into public.domains (cert_id, code, name, weight, domain_order)',
  "values ('aws-saa', 'SEC', 'Design Secure Architectures', 30, 1)",
  'on conflict (cert_id, code) do nothing;',
  '',
]);

// --- 8. tests/bank.test.ts: update the exam-numbers assertion ----------

const testPath = path.join(ROOT, 'tests', 'bank.test.ts');
if (!existsSync(testPath)) {
  console.error('ERROR: ' + testPath + ' not found. Skipping test update.');
} else {
  let testContent = readFileSync(testPath, 'utf8');
  if (testContent.includes('across every loaded certification')) {
    console.log('tests/bank.test.ts already updated, skipping.');
  } else {
    const oldTest =
      "  it('lists all 11 exam numbers', () => {\n" +
      '    expect(EXAM_NUMBERS).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);\n' +
      '  });';
    const newTest =
      "  it('lists exam numbers across every loaded certification, sorted and deduplicated', () => {\n" +
      '    // Databricks DEA uses 1-11; AWS SAA uses 101 (see the note in\n' +
      "    // src/quiz/data/aws-saa/exams/exam101.ts about why it's not 1).\n" +
      '    expect(EXAM_NUMBERS).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 101]);\n' +
      '  });';
    if (!testContent.includes(oldTest)) {
      console.error(
        'ERROR: tests/bank.test.ts does not match the expected block exactly.\n' +
          'Update it by hand -- see the chat message for the exact replacement.',
      );
    } else {
      testContent = testContent.replace(oldTest, newTest);
      writeFileSync(testPath, testContent, 'utf8');
      console.log('Updated: tests/bank.test.ts');
    }
  }
}

console.log('\nAll files written/updated.\n');

// --- 9. Run the verification suite automatically ------------------------

const steps = [
  ['Format', 'npm run format'],
  ['Typecheck', 'npm run typecheck'],
  ['Lint', 'npm run lint'],
  ['Tests', 'npm test'],
  ['Build', 'npm run build'],
];

let allPassed = true;

for (const [label, cmd] of steps) {
  console.log('=== ' + label + ' (' + cmd + ') ===');
  try {
    const output = execSync(cmd, { cwd: ROOT, stdio: 'pipe' }).toString();
    console.log(output);
    console.log(label + ': OK\n');
  } catch (err) {
    allPassed = false;
    console.log((err.stdout ? err.stdout.toString() : '') + (err.stderr ? err.stderr.toString() : ''));
    console.log(label + ': FAILED\n');
    break;
  }
}

console.log('==============================================');
if (allPassed) {
  console.log('ALL CHECKS PASSED.');
  console.log('Next (manual, needs your Supabase credentials):');
  console.log('  npm run db:migrate');
  console.log('  npm run db:seed');
} else {
  console.log('SOMETHING FAILED -- see the output above, paste it back for help.');
}
console.log('==============================================');
