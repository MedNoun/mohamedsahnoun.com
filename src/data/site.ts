export const site = {
  name: 'Mohamed Sahnoun',
  title: 'Data Engineer',
  tagline:
    'I build data platforms on GCP: BigQuery lakehouses, dimensional models, and the data quality testing that makes them trustworthy.',
  location: 'Tunisia, working remotely',
  email: 'mohammed.sahnounn@gmail.com',
  links: {
    linkedin: 'https://www.linkedin.com/in/mohamedsahnoun/',
    github: 'https://github.com/MedNoun',
    gitlab: 'https://gitlab.com/linguacustodia/edgedb-dto',
    article:
      'https://www.launchpad.ai/blog/an-ai-based-method-for-student-piano-performance-assessment',
  },
  cv: '/mohamed-sahnoun-cv-en.pdf',
  bio: [
    'I am a data engineer working in the modern GCP stack: event-driven ingestion, BigQuery lakehouses, dimensional models, and data quality testing for a production environment people can actually trust.',
    'Since January 2025 I have built and owned the customer data platform for a US fashion house, through a consultancy. Nine source systems in, one star schema out, plus the Terraform that provisions it. The piece I am proudest of is a deterministic master data management engine: 7 million fragmented customer records clustered into golden IDs by a Union-Find graph algorithm written entirely in SQL. The hard part was not the volume, it was expressing graph connectivity in set-based SQL and keeping it deterministic across runs.',
    'Before that I spent five months at OVHai LLM in Paris building a message-driven microservice architecture for neural machine translation training data, and published edgedb-dto to PyPI, a code generation library that turns EdgeQL queries into typed, validated Python models. Earlier still, as one of three fellows at Fellowship.ai, I co-authored a published method for scoring student piano performances that reached a 95.8% F-score against a 92.9% published baseline.',
    'I implement protocols from scratch to understand them, which is where the BitTorrent and Kerberos projects below come from. Outside the terminal: Arabic, French and English, learning German, a pianist and a tennis player.',
  ],
  description:
    'Data engineer building BigQuery lakehouses, Dataform pipelines and Terraform infrastructure on Google Cloud, with master data management across 7 million customer records.',
};

export type Site = typeof site;
