import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc } from "firebase/firestore";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ingredients = JSON.parse(
  readFileSync(join(root, "src/data/ingredients.json"), "utf8")
).ingredients as Array<Record<string, unknown> & { id: string }>;
const pairings = JSON.parse(
  readFileSync(join(root, "src/data/pairings.json"), "utf8")
).pairings as Array<Record<string, unknown> & { id: string }>;

async function main() {
  for (const k of ["NEXT_PUBLIC_FIREBASE_API_KEY", "NEXT_PUBLIC_FIREBASE_PROJECT_ID"]) {
    if (!process.env[k]) throw new Error(`Missing env ${k} — copy .env.example to .env.local`);
  }
  const app = initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  });
  const db = getFirestore(app);
  for (const ing of ingredients) {
    const { id, ...data } = ing;
    await setDoc(doc(collection(db, "ingredients"), id), data, { merge: true });
  }
  for (const p of pairings) {
    const { id, ...data } = p;
    await setDoc(doc(collection(db, "pairings"), id), data, { merge: true });
  }
  console.log(`Seeded ${ingredients.length} ingredients + ${pairings.length} pairings`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
