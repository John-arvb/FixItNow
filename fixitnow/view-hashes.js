//made to see the hashes if it really worked.
const { DatabaseSync } = require('node:sqlite');

const db = new DatabaseSync('fixitnow.db');
const users = db.prepare('SELECT id, email, role, password_hash FROM users').all();

for (const u of users) {
  console.log(`${u.id} | ${u.email} | ${u.role}`);
  console.log(`   ${u.password_hash}  (length ${u.password_hash.length})\n`);
}