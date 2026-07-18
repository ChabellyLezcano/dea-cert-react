import type { RawStudyTopic } from '@/types/guide.types';

export const secTopics: RawStudyTopic[] = [
  {
    id: 'SEC-iam-fundamentals',
    domain: 'SEC',
    order: 1,
    title: 'IAM fundamentals',
    summary: 'Users, groups, roles, and policies -- the building blocks of access control in AWS.',
    contentMd: `## IAM fundamentals

**IAM (Identity and Access Management)** is how you control *who* can do *what* in an AWS account.

- **Users**: an identity for a person or application, with long-term credentials.
- **Groups**: a collection of users that share the same permissions.
- **Roles**: a temporary identity that can be assumed by users, applications, or AWS services -- no long-term credentials involved.
- **Policies**: JSON documents that define permissions (allow/deny) attached to users, groups, or roles.

### Key principle: least privilege

Grant only the permissions required to perform a task, nothing more. Start restrictive and add permissions as needed, rather than starting broad and trying to restrict later.
`,
  },
];
