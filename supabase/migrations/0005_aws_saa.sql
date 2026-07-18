-- supabase/migrations/0005_aws_saa.sql
-- Second certification: AWS Certified Solutions Architect - Associate
-- (SAA-C03). Minimal viable content, added to validate the multi-cert
-- model end to end (see src/quiz/data/aws-saa, src/study/data/aws-saa,
-- src/guide/data/aws-saa).

insert into public.certifications (id, name, provider, exam_guide_version)
values ('aws-saa', 'Solutions Architect Associate', 'AWS', 'SAA-C03')
on conflict (id) do nothing;

insert into public.domains (cert_id, code, name, weight, domain_order)
values ('aws-saa', 'SEC', 'Design Secure Architectures', 30, 1)
on conflict (cert_id, code) do nothing;
