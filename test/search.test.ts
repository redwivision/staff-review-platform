// Unit tests for the shared search helpers. Run with: npx tsx test/search.test.ts
import assert from "node:assert/strict";
import {
  normalizeForSearch,
  personMatches,
  searchPeople,
  SEARCH_RESULT_CAP,
} from "../src/utils/search";
import { UserProfile } from "../src/types";

let failures = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
  } catch (e) {
    failures += 1;
    console.error(`  FAIL  ${name}\n        ${(e as Error).message.split("\n")[0]}`);
  }
}

const person = (uid: string, name: string, extra: Partial<UserProfile> = {}): UserProfile => ({
  uid,
  name,
  email: `${uid}@example.com`,
  role: "Staff",
  isLeader: false,
  isAdmin: false,
  createdAt: 0,
  ...extra,
});

console.log("\nnormalizeForSearch");
check("lowercases", () => assert.equal(normalizeForSearch("Bogale"), "bogale"));
check("trims and collapses inner whitespace", () =>
  assert.equal(normalizeForSearch("  Bogale   Mekonnen  "), "bogale mekonnen"));
check("strips combining accents so 'Mésfin' matches 'Mesfin'", () =>
  assert.equal(normalizeForSearch("Mésfin"), "mesfin"));
check("leaves Ethiopic script intact", () =>
  assert.equal(normalizeForSearch("እባክዎ"), "እባክዎ"));

console.log("\npersonMatches");
const abebe = person("u1", "Abebe Bekele");
check("matches on name", () => assert.ok(personMatches(abebe, "abebe")));
check("matches on surname", () => assert.ok(personMatches(abebe, "bekele")));
check("does not match unrelated text", () => assert.ok(!personMatches(abebe, "kalkidan")));
check("empty needle matches everyone", () => assert.ok(personMatches(abebe, "")));
check("matches on email", () => assert.ok(personMatches(abebe, "u1@")));
check("all terms must match, not just one", () =>
  assert.ok(!personMatches(abebe, "abebe zzzzz")));
check("terms may appear in any order", () =>
  assert.ok(personMatches(abebe, "bekele abebe")));
check("extra fields are searched when opted in", () =>
  assert.ok(personMatches(person("u2", "Chaltu", { role: "Finance" }), "finance", { extraFields: ["Finance"] })));
check("accent-insensitive: 'Bogalé' needle finds 'Bogale'", () =>
  assert.ok(personMatches(person("u3", "Bogale"), "bogalé")));
check("Amharic name matches its own script", () =>
  assert.ok(personMatches(person("u4", "እባክዎ ተስፋዬ"), "እባክዎ")));

console.log("\nsearchPeople result cap");
const many = Array.from({ length: 5000 }, (_, i) => person(`u${i}`, `Staff Member ${i}`));
const capped = searchPeople(many, "staff member", SEARCH_RESULT_CAP);
check("caps results at the render limit", () => assert.equal(capped.results.length, SEARCH_RESULT_CAP));
check("still reports the true total", () => assert.equal(capped.total, 5000));
check("flags that results were truncated", () => assert.ok(capped.truncated));
check("unfiltered list is reported as truncated when over the cap", () =>
  assert.ok(searchPeople(many, "").truncated));
check("unfiltered list returns the cap, not 5000", () =>
  assert.equal(searchPeople(many, "").results.length, SEARCH_RESULT_CAP));
check("a narrow search is not marked truncated", () =>
  assert.ok(!searchPeople(many, "member 4321").truncated));
check("empty roster is safe", () => {
  const r = searchPeople([], "anything");
  assert.deepEqual(r.results, []);
  assert.equal(r.total, 0);
  assert.ok(!r.truncated);
});
check("finds one person among 5000 by exact-ish name", () => {
  const r = searchPeople(many, "member 4321", SEARCH_RESULT_CAP);
  assert.equal(r.results.length, 1);
  assert.equal(r.results[0].uid, "u4321");
});

console.log(failures === 0 ? "\nAll search tests passed.\n" : `\n${failures} test(s) FAILED.\n`);
process.exit(failures === 0 ? 0 : 1);
