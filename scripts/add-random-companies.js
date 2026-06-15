#!/usr/bin/env node
/**
 * Appends randomly generated companies to companies.json.
 *
 * Usage:
 *   node scripts/add-random-companies.js          # adds 1000 (default)
 *   node scripts/add-random-companies.js 500      # custom count
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_FILE = path.join(ROOT, 'companies.json');
const DEFAULT_COUNT = 1000;

const LOCATIONS = [
  'San Francisco', 'New York', 'Austin', 'Boston', 'Seattle', 'Chicago',
  'Denver', 'Miami', 'Atlanta', 'Portland', 'Los Angeles', 'Dallas',
  'Phoenix', 'Minneapolis', 'Detroit', 'Philadelphia', 'San Diego',
  'Nashville', 'Raleigh', 'Salt Lake City', 'Toronto', 'London', 'Berlin',
];

const DEPARTMENTS = [
  'Engineering', 'Marketing', 'Sales', 'Research', 'Operations', 'Legal',
  'Clinical', 'IT', 'HR', 'E-commerce', 'Logistics', 'Customer Support',
  'Trading', 'Risk', 'Compliance', 'Finance', 'Product', 'Design',
  'Data Science', 'Security', 'Support', 'Procurement',
];

const ROLES = [
  'Developer', 'Designer', 'Product Manager', 'Data Analyst', 'Engineer',
  'Research Scientist', 'Operations Manager', 'Legal Counsel', 'Analyst',
  'Support Specialist', 'Marketing Lead', 'Sales Representative',
  'DevOps Engineer', 'QA Engineer', 'HR Manager', 'Financial Analyst',
  'Project Manager', 'Consultant', 'Architect', 'Team Lead',
];

const SKILLS = [
  'JavaScript', 'Python', 'SQL', 'TypeScript', 'React', 'Node.js',
  'Figma', 'UI/UX', 'Agile', 'Excel', 'Machine Learning', 'Statistics',
  'Project Management', 'Leadership', 'CRM', 'Data Analysis', 'R',
  'AWS', 'Docker', 'Kubernetes', 'Communication', 'Negotiation',
  'Compliance', 'Regulatory Reporting', 'Supply Chain', 'Roadmapping',
  'User Research', 'Zendesk', 'Conflict Resolution', 'Go', 'Rust',
  'Java', 'C#', 'PostgreSQL', 'MongoDB', 'Tableau', 'Power BI',
];

const FIRST_NAMES = [
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Jamie', 'Quinn',
  'Avery', 'Blake', 'Cameron', 'Dakota', 'Elliot', 'Finley', 'Harper', 'Jesse',
  'Kai', 'Logan', 'Noah', 'Parker', 'Reese', 'Sage', 'Skyler', 'Tatum',
  'Maria', 'David', 'Emily', 'Michael', 'Anna', 'Sarah', 'James', 'Lisa',
  'Robert', 'Jennifer', 'William', 'Elizabeth', 'Chen', 'Patel', 'Kim', 'Garcia',
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Wilson', 'Anderson', 'Taylor', 'Thomas', 'Moore',
  'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris', 'Clark', 'Lewis',
  'Walker', 'Hall', 'Allen', 'Young', 'King', 'Wright', 'Lopez', 'Hill', 'Nguyen',
  'Brooks', 'Turner', 'Watson', 'Chen', 'Kowalski', 'Patel', 'Kim', 'Cohen',
];

const COMPANY_PREFIXES = [
  'Tech', 'Nova', 'Alpha', 'Blue', 'Green', 'Smart', 'Global', 'Prime',
  'Next', 'Core', 'Apex', 'Vertex', 'Pulse', 'Swift', 'Bright', 'Cloud',
  'Data', 'Cyber', 'Meta', 'Hyper', 'Omni', 'Ultra', 'Neo', 'Quantum',
];

const COMPANY_SUFFIXES = [
  'Corp', 'Labs', 'Systems', 'Solutions', 'Group', 'Industries', 'Partners',
  'Dynamics', 'Works', 'Digital', 'Analytics', 'Networks', 'Ventures', 'Ltd',
  'Co', 'Global', 'Tech', 'Services', 'Holdings', 'Innovations',
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickMany(arr, min, max) {
  const count = min + Math.floor(Math.random() * (max - min + 1));
  const copy = [...arr];
  const out = [];
  while (out.length < count && copy.length > 0) {
    const i = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(i, 1)[0]);
  }
  return out;
}

function randomCompany(index) {
  const company =
    `${pick(COMPANY_PREFIXES)}${pick(COMPANY_SUFFIXES)} ${index + 1}`.replace(/\s+/g, ' ');

  const departments = pickMany(DEPARTMENTS, 2, 4);
  const employeeCount = 1 + Math.floor(Math.random() * 5);
  const employees = [];

  for (let e = 0; e < employeeCount; e++) {
    employees.push({
      name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
      role: pick(ROLES),
      skills: pickMany(SKILLS, 2, 4),
    });
  }

  return {
    company,
    location: pick(LOCATIONS),
    departments,
    employees,
  };
}

function parseCount(argv) {
  const arg = argv[2];
  if (arg === undefined) return DEFAULT_COUNT;
  const n = Number.parseInt(arg, 10);
  if (!Number.isFinite(n) || n < 1) {
    console.error('Count must be a positive integer.');
    process.exit(1);
  }
  return n;
}

function main() {
  const count = parseCount(process.argv);

  if (!fs.existsSync(DATA_FILE)) {
    console.error(`File not found: ${DATA_FILE}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  let companies;
  try {
    companies = JSON.parse(raw);
  } catch (err) {
    console.error('Invalid JSON in companies.json:', err.message);
    process.exit(1);
  }

  if (!Array.isArray(companies)) {
    console.error('companies.json must contain a JSON array.');
    process.exit(1);
  }

  const before = companies.length;
  const startIndex = before;

  for (let i = 0; i < count; i++) {
    companies.push(randomCompany(startIndex + i));
  }

  fs.writeFileSync(DATA_FILE, JSON.stringify(companies, null, 2) + '\n', 'utf8');

  console.log(`Added ${count} companies to ${DATA_FILE}`);
  console.log(`Total: ${before} → ${companies.length}`);
}

main();
