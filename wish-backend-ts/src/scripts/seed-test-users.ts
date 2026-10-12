import { MongoClient, ObjectId } from "mongodb";
import { v4 as uuidv4 } from "uuid";
import { hashSync } from "bcrypt";
import * as dotenv from "dotenv";
import path from "path";
import {
  currencyForCountry,
  DAYS,
  SERVICES,
  SLOTS,
  UserType,
} from "../models/dating/service-catalog";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/";
const MONGO_DB = process.env.MONGO_DB || "maiditt";
const DEFAULT_PASSWORD = "Password123!";

// role, name, profileName, lastname, avatar, birth date, country,
// locationName, location (Meridian lineage), languages
type Person = [
  UserType,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string[],
];

const PEOPLE: Person[] = [
  ["Cleaner", "Inês Santos", "Inês", "Santos", "female-01", "2001-04-12", "PT", "Lisboa", "/295480/2897141/5400890/", ["pt", "en", "es"]],
  ["Cleaner", "Elena Rossi", "Elena", "Rossi", "female-02", "1999-08-20", "IT", "Milano", "/365331/44879/44881/44915/", ["it", "en"]],
  ["Cleaner", "Camille Dupont", "Camille", "Dupont", "female-03", "2002-01-15", "FR", "Paris", "/2202162/1403916/8649/71525/", ["fr", "en"]],
  ["Cleaner", "Lucía Morales", "Lucía", "Morales", "female-04", "2000-11-05", "ES", "Madrid", "/1311341/349055/6426653/5326784/", ["es", "en"]],
  ["Cleaner", "Clara Weber", "Clara", "Weber", "female-05", "1998-06-18", "DE", "Berlin", "/51477/62422/", ["de", "en"]],
  ["Cleaner", "Beatriz Oliveira", "Beatriz", "Oliveira", "female-06", "2001-09-30", "PT", "Porto", "/295480/3459013/3372453/", ["pt", "en", "fr"]],
  ["Cleaner", "Giulia Bianchi", "Giulia", "Bianchi", "female-07", "2003-03-22", "IT", "Roma", "/365331/40784/41313/41485/", ["it", "en"]],
  ["Cleaner", "Chloé Martin", "Chloé", "Martin", "female-08", "1999-12-10", "FR", "Nice", "/2202162/1403916/8654/7385/1670977/170100/", ["fr", "en", "it"]],
  ["Cleaner", "Carmen Vega", "Carmen", "Vega", "female-09", "2000-02-14", "ES", "Barcelona", "/1311341/349053/349035/2417889/347950/", ["es", "en"]],
  ["Cleaner", "Marta Ferreira", "Marta", "Ferreira", "female-10", "2002-07-08", "PT", "Cascais", "/295480/2897141/5400889/", ["pt", "en"]],
  ["Cleaner", "Sophie Laurent", "Sophie", "Laurent", "female-11", "1997-10-19", "FR", "Bordeaux", "/2202162/1403916/3792880/7405/1667452/105270/", ["fr", "en", "es"]],
  ["Cleaner", "Laura Schmidt", "Laura", "Schmidt", "female-12", "2001-05-03", "DE", "München", "/51477/2145268/2145274/62428/", ["de", "en"]],
  ["Cleaner", "Sara Costa", "Sara", "Costa", "female-13", "2003-09-17", "PT", "Faro", "/295480/1278415/5404220/", ["pt", "en"]],
  ["Cleaner", "Valentina Ricci", "Valentina", "Ricci", "female-14", "1999-04-29", "IT", "Firenze", "/365331/41977/42472/42602/", ["it", "en", "fr"]],
  ["Cleaner", "Natalia Cruz", "Natalia", "Cruz", "female-15", "2000-08-11", "ES", "Sevilla", "/1311341/349044/349008/342563/", ["es", "en", "pt"]],
  ["Cleaner", "Mariana Pires", "Mariana", "Pires", "female-16", "2002-10-04", "PT", "Braga", "/295480/3738284/4115866/", ["pt", "en"]],
  ["Cleaner", "Alessia Colombo", "Alessia", "Colombo", "female-17", "2001-07-16", "IT", "Napoli", "/365331/40218/40600/40767/", ["it", "en"]],
  ["Cleaner", "Margaux Bernard", "Margaux", "Bernard", "female-18", "1998-03-27", "FR", "Marseille", "/2202162/1403916/8654/7393/1686370/76469/", ["fr", "en", "es"]],
  ["Cleaner", "Alba Navarro", "Alba", "Navarro", "female-19", "2000-09-02", "ES", "Málaga", "/1311341/349044/5275848/10589436/340746/", ["es", "en"]],
  ["Cleaner", "Hannah Fischer", "Hannah", "Fischer", "female-20", "2001-11-20", "DE", "Hamburg", "/51477/62782/", ["de", "en"]],
  ["Cleaner", "Carolina Ribeiro", "Carolina", "Ribeiro", "female-01", "2003-05-14", "PT", "Aveiro", "/295480/3920249/5325138/", ["pt", "en"]],
  ["Cleaner", "Federica Marini", "Federica", "Marini", "female-02", "1999-01-30", "IT", "Torino", "/365331/44874/44880/43992/", ["it", "en", "fr"]],
  ["Cleaner", "Léa Roussel", "Léa", "Roussel", "female-03", "2002-06-11", "FR", "Paris", "/2202162/1403916/8649/71525/", ["fr", "en"]],
  ["Cleaner", "Paula Iglesias", "Paula", "Iglesias", "female-04", "2000-12-08", "ES", "Madrid", "/1311341/349055/6426653/5326784/", ["es", "en"]],
  ["Cleaner", "Mia Wagner", "Mia", "Wagner", "female-05", "1998-08-25", "DE", "Köln", "/51477/62761/72022/62578/", ["de", "en", "fr"]],
  ["Cleaner", "Joana Matos", "Joana", "Matos", "female-06", "2001-02-17", "PT", "Setúbal", "/295480/5143590/5401851/", ["pt", "en", "es"]],
  ["Cleaner", "Chiara Moretti", "Chiara", "Moretti", "female-07", "2003-10-15", "IT", "Milano", "/365331/44879/44881/44915/", ["it", "en"]],
  ["Cleaner", "Manon Leroy", "Manon", "Leroy", "female-08", "2000-05-19", "FR", "Lyon", "/2202162/1403916/3792877/7378/4850451/1663048/120965/", ["fr", "en"]],
  ["Cleaner", "Isabel Castro", "Isabel", "Castro", "female-09", "1999-07-23", "ES", "Barcelona", "/1311341/349053/349035/2417889/347950/", ["es", "en"]],
  ["Cleaner", "Leonor Faria", "Leonor", "Faria", "female-10", "2002-04-09", "PT", "Lisboa", "/295480/2897141/5400890/", ["pt", "en", "es"]],
  ["Client", "Alexandre Silva", "Alexandre", "Silva", "male-01", "1978-03-14", "PT", "Lisboa", "/295480/2897141/5400890/", ["pt", "en"]],
  ["Client", "Marco Bernardi", "Marco", "Bernardi", "male-02", "1975-09-25", "IT", "Milano", "/365331/44879/44881/44915/", ["it", "en"]],
  ["Client", "Jean-Pierre Moreau", "Jean-Pierre", "Moreau", "male-03", "1972-12-04", "FR", "Paris", "/2202162/1403916/8649/71525/", ["fr", "en"]],
  ["Client", "Javier Fernandez", "Javier", "Fernandez", "male-04", "1980-06-19", "ES", "Madrid", "/1311341/349055/6426653/5326784/", ["es", "en"]],
  ["Client", "Wolfgang Becker", "Wolfgang", "Becker", "male-05", "1970-02-18", "DE", "München", "/51477/2145268/2145274/62428/", ["de", "en"]],
  ["Client", "Rui Mendes", "Rui", "Mendes", "male-06", "1977-11-09", "PT", "Porto", "/295480/3459013/3372453/", ["pt", "en", "fr"]],
  ["Client", "Lorenzo Conti", "Lorenzo", "Conti", "male-07", "1974-05-31", "IT", "Roma", "/365331/40784/41313/41485/", ["it", "en"]],
  ["Client", "Henri Dubois", "Henri", "Dubois", "male-08", "1968-08-14", "FR", "Nice", "/2202162/1403916/8654/7385/1670977/170100/", ["fr", "en", "it"]],
  ["Client", "Carlos Santana", "Carlos", "Santana", "male-09", "1976-04-02", "ES", "Barcelona", "/1311341/349053/349035/2417889/347950/", ["es", "en"]],
  ["Client", "Henrique Ramos", "Henrique", "Ramos", "male-10", "1979-01-27", "PT", "Cascais", "/295480/2897141/5400889/", ["pt", "en"]],
  ["Client", "Stefan Meyer", "Stefan", "Meyer", "male-11", "1973-10-12", "DE", "Frankfurt am Main", "/51477/62650/286590/62400/", ["de", "en"]],
  ["Client", "Matteo Fontana", "Matteo", "Fontana", "male-12", "1981-07-07", "IT", "Torino", "/365331/44874/44880/43992/", ["it", "en"]],
  ["Client", "Pedro Alvares", "Pedro", "Alvares", "male-13", "1982-12-21", "PT", "Coimbra", "/295480/4875183/5379538/", ["pt", "en", "es"]],
  ["Client", "Alvaro Gomez", "Alvaro", "Gomez", "male-14", "1971-06-03", "ES", "Bilbao", "/1311341/349042/349034/339549/", ["es", "en"]],
  ["Client", "François Leroy", "François", "Leroy", "male-15", "1974-03-08", "FR", "Lyon", "/2202162/1403916/3792877/7378/4850451/1663048/120965/", ["fr", "en"]],
  ["Client", "Gonçalo Figueiredo", "Gonçalo", "Figueiredo", "male-16", "1976-08-15", "PT", "Braga", "/295480/3738284/4115866/", ["pt", "en"]],
  ["Client", "Fabrizio Rossi", "Fabrizio", "Rossi", "male-17", "1972-04-18", "IT", "Napoli", "/365331/40218/40600/40767/", ["it", "en"]],
  ["Client", "Julien Girard", "Julien", "Girard", "male-18", "1979-11-23", "FR", "Marseille", "/2202162/1403916/8654/7393/1686370/76469/", ["fr", "en", "es"]],
  ["Client", "Gonzalo Ortiz", "Gonzalo", "Ortiz", "male-19", "1973-07-09", "ES", "Málaga", "/1311341/349044/5275848/10589436/340746/", ["es", "en"]],
  ["Client", "Hans Zimmerman", "Hans", "Zimmerman", "male-20", "1969-02-28", "DE", "Hamburg", "/51477/62782/", ["de", "en"]],
  ["Client", "Vasco Teles", "Vasco", "Teles", "male-01", "1977-09-14", "PT", "Aveiro", "/295480/3920249/5325138/", ["pt", "en", "es"]],
  ["Client", "Andrea Romano", "Andrea", "Romano", "male-02", "1980-05-20", "IT", "Firenze", "/365331/41977/42472/42602/", ["it", "en"]],
  ["Client", "Thierry Bonnet", "Thierry", "Bonnet", "male-03", "1971-10-06", "FR", "Bordeaux", "/2202162/1403916/3792880/7405/1667452/105270/", ["fr", "en"]],
  ["Client", "Eduardo Blanco", "Eduardo", "Blanco", "male-04", "1975-12-19", "ES", "Madrid", "/1311341/349055/6426653/5326784/", ["es", "en"]],
  ["Client", "Christian Krause", "Christian", "Krause", "male-05", "1974-01-16", "DE", "Köln", "/51477/62761/72022/62578/", ["de", "en"]],
  ["Client", "Luís Barreto", "Luís", "Barreto", "male-06", "1978-06-28", "PT", "Setúbal", "/295480/5143590/5401851/", ["pt", "en"]],
  ["Client", "Roberto Galli", "Roberto", "Galli", "male-07", "1970-11-04", "IT", "Milano", "/365331/44879/44881/44915/", ["it", "en"]],
  ["Client", "Nicolas Mercier", "Nicolas", "Mercier", "male-08", "1973-03-24", "FR", "Paris", "/2202162/1403916/8649/71525/", ["fr", "en"]],
  ["Client", "Ignacio Soto", "Ignacio", "Soto", "male-09", "1976-10-31", "ES", "Sevilla", "/1311341/349044/349008/342563/", ["es", "en"]],
  ["Client", "António Carvalho", "António", "Carvalho", "male-10", "1975-08-01", "PT", "Lisboa", "/295480/2897141/5400890/", ["pt", "en"]]
];

const CLEANER_ABOUT = [
  "Reliable and detail-minded. I bring my own supplies on request and leave every room the way I would want my own home.",
  "Over the years I have cleaned flats, family houses and small offices. Punctual, discreet and happy to follow your checklist.",
  "I love turning a busy home into a calm one. Pets are welcome, and I am careful with delicate surfaces.",
];

const CLIENT_ABOUT = [
  "Busy household looking for regular, reliable help. We have a friendly cat.",
  "Two-bedroom flat, looking for someone trustworthy who can come at a fixed time each week.",
  "Family home with a small garden. We need help keeping on top of cleaning and ironing.",
];

const CLEANER_POSTS = [
  "Free on Friday mornings",
  "Eco products on request",
  "Available for move-out cleans this month",
  "Ironing included in weekly cleans",
];

const CLIENT_POSTS = [
  "Weekly 3-hour clean, 2-bedroom flat",
  "Deep clean before moving out",
  "Windows and balcony before the holidays",
  "Ironing every two weeks",
];

// Deterministic picks so re-seeding gives the same profiles.
// The step is coprime with the list length, so the picks never repeat and
// every value shows up across the seeded users.
const pick = <T>(list: readonly T[], seed: number, count: number): T[] => {
  const step = [3, 2, 5, 7].find((n) => list.length % n !== 0) ?? 1;
  return Array.from(
    { length: Math.min(count, list.length) },
    (_, n) => list[(seed * 4 + n * step) % list.length]
  );
};

const buildUser = (person: Person, index: number) => {
  const [role, name, profileName, lastname, avatar, birth, country, locationName, location, languages] =
    person;
  const cleaner = role === "Cleaner";
  const sameCountry = PEOPLE.filter(
    (other) => other[6] === country && other[8] !== location
  );
  const areasCovered = cleaner
    ? [{ country, location, locationName }].concat(
        pick(sameCountry, index, 2).map((other) => ({
          country,
          location: other[8],
          locationName: other[7],
        }))
      )
    : [];
  const baseRate = country === "CH" ? 35 : 14;

  return {
    role,
    email: `test.${role.toLowerCase()}${String(index + 1).padStart(2, "0")}@example.com`,
    name,
    profileName,
    lastname,
    avatar,
    birthDateStr: `${birth}T00:00:00.000Z`,
    country,
    location,
    locationName,
    languages,
    services: pick(SERVICES, index, cleaner ? 4 : 2),
    hourlyRate: baseRate + ((index * 3) % 12) + (cleaner ? 2 : 0),
    currency: currencyForCountry(country),
    availability: {
      days: pick(DAYS, index, cleaner ? 4 : 2),
      slots: pick(SLOTS, index, cleaner ? 2 : 1),
    },
    areasCovered,
    experienceYears: cleaner ? 1 + (index % 15) : undefined,
    description: (cleaner ? CLEANER_ABOUT : CLIENT_ABOUT)[index % 3],
    offers: pick(cleaner ? CLEANER_POSTS : CLIENT_POSTS, index, 2),
  };
};

const TEST_USERS = PEOPLE.map(buildUser);

export async function seedTestUsers() {
  const client = new MongoClient(MONGO_URL);
  try {
    await client.connect();
    console.log(`Connected to MongoDB at ${MONGO_URL}`);
    const db = client.db(MONGO_DB);
    const usersCollection = db.collection("users");

    const passwordHashed = hashSync(DEFAULT_PASSWORD, 12);
    const now = new Date();

    console.log(`Preparing to seed ${TEST_USERS.length} test users...`);

    let insertedCount = 0;
    let updatedCount = 0;

    for (let i = 0; i < TEST_USERS.length; i++) {
      const data = TEST_USERS[i];
      // Stagger creation dates slightly so sorting looks natural
      const creationDate = new Date(now.getTime() - (TEST_USERS.length - i) * 3600 * 1000 * 12);
      const birthDate = new Date(data.birthDateStr);

      const offersObjects = data.offers.map((offerText) => ({
        _id: new ObjectId(),
        offer: offerText,
        date: creationDate,
      }));

      const existing = await usersCollection.findOne({ email: data.email });
      const uid = existing?.uid || uuidv4();

      const userDoc = {
        email: data.email,
        name: data.name,
        profileName: data.profileName,
        lastname: data.lastname,
        userType: data.role,
        claims: {
          user: data.role,
        },
        avatar: data.avatar,
        emailVerified: true,
        password: passwordHashed,
        uid: uid,
        birthDate: birthDate,
        birthDateStr: data.birthDateStr,
        country: data.country,
        location: data.location,
        locationName: data.locationName,
        languages: data.languages,
        services: data.services,
        hourlyRate: data.hourlyRate,
        currency: data.currency,
        availability: data.availability,
        areasCovered: data.areasCovered,
        ...(data.experienceYears !== undefined && {
          experienceYears: data.experienceYears,
        }),
        description: data.description,
        offers: offersObjects,
        images: [],
        additionalUserInfo: [],
        deleted: false,
        phoneNumber: null,
        blocked: [],
        updateDate: now,
      };

      const result = await usersCollection.updateOne(
        { email: data.email },
        {
          $set: userDoc,
          $setOnInsert: {
            creationDate: creationDate,
          },
        },
        { upsert: true }
      );

      if (result.upsertedCount > 0) {
        insertedCount++;
      } else {
        updatedCount++;
      }
    }

    console.log(
      `Finished seeding test users: ${insertedCount} inserted, ${updatedCount} updated.`
    );
    console.log(`Default password for all test users: "${DEFAULT_PASSWORD}"`);
  } catch (error) {
    console.error("Error seeding test users:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  seedTestUsers();
}
