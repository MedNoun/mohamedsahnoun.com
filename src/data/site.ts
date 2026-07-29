export const site = {
  name: 'Mohamed Sahnoun',
  title: 'Data Engineer',
  domain: 'mohamedsahnoun.com',
  url: 'https://mohamedsahnoun.com',
  tagline:
    'I build data pipelines end to end: batch and event-driven ingestion, SQL modelling at scale, orchestration, and the tests that make the output trustworthy.',
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
    'I am a data engineer. I take fragmented source systems and turn them into modelled, tested data that people can query without second-guessing it: ingestion (batch and event-driven), transformation in SQL and Python, orchestration, and the infrastructure as code underneath. Mostly on Google Cloud so far, though the parts that matter, modelling, idempotency, testing and cost, travel between warehouses.',
    'Since January 2025 I have built and owned the customer data pipeline for a US fashion house, through a consultancy. Nine source systems in, one star schema out, plus the Terraform that provisions it and the assertions that stop bad data reaching it. The piece I am proudest of is a deterministic master data management engine: 7 million fragmented customer records clustered into golden IDs by a Union-Find graph algorithm written entirely in SQL. The hard part was not the volume, it was expressing graph connectivity in set-based SQL and keeping it deterministic across runs.',
    'Before that I spent six months at OVHai LLM in Paris rebuilding a training-data pipeline as a message-driven microservice architecture in Python, and published edgedb-dto to PyPI, a code generation library that turns EdgeQL queries into typed, validated Python models. Earlier still, as one of three fellows at Fellowship.ai, I co-authored a published method for scoring student piano performances that reached a 95.8% F-score against a 92.9% published baseline.',
    'I implement protocols from scratch to understand them, which is where the BitTorrent and Kerberos projects below come from. Outside the terminal: Arabic, French and English, learning German, a pianist and a tennis player.',
  ],
  description:
    'Data engineer: batch and event-driven ingestion, SQL and Python transformation, dimensional modelling, orchestration and infrastructure as code, including entity resolution across 7 million customer records.',
};

export type Site = typeof site;
