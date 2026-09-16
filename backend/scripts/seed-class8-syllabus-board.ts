import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface UnitDef {
  n: number;
  slug: string;
  title: string;
  tamil: string;
  desc: string;
  tip: string;
}

const MATH_UNITS: UnitDef[] = [
  { n: 1, slug: 'numbers', title: 'Numbers', tamil: 'எண்கள்', desc: 'Rational numbers, number line, squares, square roots, cubes, cube roots and exponents.', tip: 'Practice locating rational numbers on a number line daily.' },
  { n: 2, slug: 'measurements', title: 'Measurements', tamil: 'அளவைகள்', desc: 'Area of circles and combined shapes; surface area & volume of 3-D solids like cylinders and cones.', tip: 'Draw the net of a solid before finding its surface area.' },
  { n: 3, slug: 'algebra', title: 'Algebra', tamil: 'இயற்கணிதம்', desc: 'Operations on algebraic expressions, identities, factorisation and graphing linear equations.', tip: 'Always verify a factorisation by expanding it back out.' },
  { n: 4, slug: 'life-mathematics', title: 'Life Mathematics', tamil: 'வாழ்வியல் கணிதம்', desc: 'Real-life applications: percentages, profit/loss, GST, compound interest, and time & work.', tip: 'Convert percentages to decimals first to simplify calculations.' },
  { n: 5, slug: 'geometry', title: 'Geometry', tamil: 'வடிவியல்', desc: 'Congruent & similar shapes, Pythagoras theorem, and constructing quadrilaterals with ruler & compass.', tip: 'Sketch a rough figure before starting any construction.' },
  { n: 6, slug: 'statistics', title: 'Statistics', tamil: 'புள்ளியியல்', desc: 'Organising data into frequency tables and representing it through histograms and graphs.', tip: 'Choose equal class intervals for a clear histogram.' },
  { n: 7, slug: 'information-processing', title: 'Information Processing', tamil: 'தகவல் செயலாக்கம்', desc: 'Counting principles, Fibonacci numbers, HCF, cryptarithms and logical puzzles.', tip: 'Break big counting problems into smaller independent steps.' },
];

const SCIENCE_UNITS: UnitDef[] = [
  { n: 1, slug: 'measurement', title: 'Measurement', tamil: 'அளவீட்டியல்', desc: 'Fundamental & derived physical quantities, SI units, and types of measuring instruments.', tip: 'Always note the unit along with every measured value.' },
  { n: 2, slug: 'force-and-pressure', title: 'Force and Pressure', tamil: 'விசையும் அழுத்தமும்', desc: 'Balanced & unbalanced forces, and how pressure acts in solids, liquids and gases.', tip: 'Pressure = Force / Area -- a smaller area means greater pressure.' },
  { n: 3, slug: 'optics', title: 'Optics', tamil: 'ஒளியியல்', desc: 'Laws of reflection & refraction of light, lenses, and how the human eye works.', tip: 'A convex lens converges light; a concave lens diverges it.' },
  { n: 4, slug: 'heat', title: 'Heat', tamil: 'வெப்பம்', desc: 'Heat vs temperature, thermometers, and the modes of heat transfer.', tip: 'Heat always flows from a hotter body to a colder one.' },
  { n: 5, slug: 'electricity', title: 'Electricity', tamil: 'மின்னியல்', desc: 'Electric current, simple circuits, and the heating & magnetic effects of current.', tip: 'Current flows only in a closed circuit.' },
  { n: 6, slug: 'sound', title: 'Sound', tamil: 'ஒலியியல்', desc: 'How sound is produced and travels, and the difference between noise and music.', tip: 'Sound needs a medium -- it cannot travel through vacuum.' },
  { n: 7, slug: 'magnetism', title: 'Magnetism', tamil: 'காந்தவியல்', desc: 'Properties of magnets, magnetic field lines, and how electromagnets work.', tip: 'Like poles repel, unlike poles attract.' },
  { n: 8, slug: 'universe-and-space-science', title: 'Universe & Space Science', tamil: 'அண்டம் & விண்வெளி அறிவியல்', desc: "The solar system, artificial satellites, and India's space missions.", tip: 'Remember the order of planets from the Sun outward.' },
  { n: 9, slug: 'matter-around-us', title: 'Matter Around Us', tamil: 'பருப்பொருள்கள்', desc: 'States of matter, and classifying substances as elements, compounds or mixtures.', tip: 'A mixture can be separated by physical methods; a compound cannot.' },
  { n: 10, slug: 'changes-around-us', title: 'Changes Around Us', tamil: 'மாற்றங்கள்', desc: 'Distinguishing physical & chemical changes and identifying types of chemical reactions.', tip: 'A chemical change always forms a new substance.' },
  { n: 11, slug: 'air', title: 'Air', tamil: 'காற்று', desc: 'Composition of air, layers of the atmosphere, and causes of air pollution.', tip: 'Nitrogen makes up about 78% of the air we breathe.' },
  { n: 12, slug: 'atomic-structure', title: 'Atomic Structure', tamil: 'அணு அமைப்பு', desc: 'Structure of the atom -- protons, neutrons, electrons -- and valency.', tip: 'Atomic number = number of protons in an atom.' },
  { n: 13, slug: 'water', title: 'Water', tamil: 'நீர்', desc: 'The water cycle, hard & soft water, and ways to conserve water.', tip: 'Boiling temporarily softens hard water caused by bicarbonates.' },
  { n: 14, slug: 'acids-and-bases', title: 'Acids and Bases', tamil: 'அமிலங்கள் & காரங்கள்', desc: 'Properties of acids and bases, indicators, pH scale, and neutralisation reactions.', tip: 'pH below 7 is acidic, above 7 is basic, and 7 is neutral.' },
  { n: 15, slug: 'chemistry-in-daily-life', title: 'Chemistry in Daily Life', tamil: 'அன்றாட வாழ்வில் வேதியியல்', desc: 'How soaps and detergents work, and common chemicals we use every day.', tip: 'Soap works best in soft water; detergents work in hard water too.' },
  { n: 16, slug: 'microorganisms', title: 'Microorganisms', tamil: 'நுண்ணுயிரிகள்', desc: 'Types of microorganisms and their useful and harmful effects on us.', tip: 'Not all microbes are harmful -- many help make curd and bread.' },
  { n: 17, slug: 'plant-world', title: 'Plant World', tamil: 'தாவர உலகம்', desc: 'Classifying plants, the process of photosynthesis, and plant tissue types.', tip: 'Photosynthesis needs sunlight, water, and carbon dioxide.' },
  { n: 18, slug: 'coordination-in-organisms', title: 'Coordination in Organisms', tamil: 'உயிரினங்களின் ஒருங்கிணைவு', desc: 'How the nervous system and hormones coordinate body functions.', tip: 'A reflex action is a rapid, automatic response to a stimulus.' },
  { n: 19, slug: 'locomotion-in-animals', title: 'Locomotion in Animals', tamil: 'விலங்குகளின் இயக்கம்', desc: 'The skeletal system, types of joints, and how different animals move.', tip: "Joints allow movement -- without them bones couldn't bend." },
  { n: 20, slug: 'reaching-the-age-of-adolescence', title: 'Age of Adolescence', tamil: 'வளரிளம் பருவமெடுதல்', desc: 'Physical and hormonal changes during adolescence, and staying healthy.', tip: 'A balanced diet and exercise support healthy growth at this stage.' },
  { n: 21, slug: 'crop-production-and-management', title: 'Crop Production & Management', tamil: 'பயிர்ப் பெருக்கம் & மேலாண்மை', desc: 'Farming practices from sowing to harvesting, irrigation and fertilisers.', tip: 'Crop rotation helps restore soil nutrients naturally.' },
  { n: 22, slug: 'conservation-of-plants-and-animals', title: 'Conservation of Plants & Animals', tamil: 'தாவரங்கள் மற்றும் விலங்குகளைப் பாதுகாப்பு', desc: 'Why forests & wildlife matter, and how we protect endangered species.', tip: 'Biosphere reserves protect entire ecosystems, not just one species.' },
  { n: 23, slug: 'libreoffice-calc', title: 'LibreOffice Calc', tamil: 'லிப்ரா ஆபீஸ் கால்க்', desc: 'Basics of spreadsheets -- entering data, using formulas, and creating charts.', tip: "Start every formula in a spreadsheet cell with the '=' sign." },
];

async function seedSubject(name: string, icon: string, color: string, subjectPrefix: string, units: UnitDef[]) {
  const subject = await prisma.centralSubject.upsert({
    where: { class_name: { class: '8', name } },
    update: { icon, color },
    create: { class: '8', name, icon, color },
  });
  console.log(`Subject: ${name} (class 8) -> ${subject.id}`);

  for (const u of units) {
    const unit = await prisma.centralUnit.upsert({
      where: { subjectId_unitNumber: { subjectId: subject.id, unitNumber: u.n } },
      update: { name: u.title },
      create: { subjectId: subject.id, unitNumber: u.n, name: u.title },
    });

    // Single topic per unit so the infographic attaches directly under the unit.
    const topic = await prisma.centralTopic.upsert({
      where: { unitId_topicNumber: { unitId: unit.id, topicNumber: 1 } },
      update: { name: 'Unit Overview' },
      create: { unitId: unit.id, topicNumber: 1, name: 'Unit Overview' },
    });

    const fileUrl = `/images/syllabus/${subjectPrefix}-unit-${String(u.n).padStart(2, '0')}-${u.slug}.svg`;
    const existing = await prisma.centralContent.findFirst({
      where: { topicId: topic.id, contentType: 'INFOGRAPHIC' },
    });
    if (existing) {
      await prisma.centralContent.update({
        where: { id: existing.id },
        data: { title: `Unit ${u.n}: ${u.title}`, fileUrl, fileContent: `${u.title} (${u.tamil})\n${u.desc}\nTip: ${u.tip}` },
      });
    } else {
      await prisma.centralContent.create({
        data: {
          topicId: topic.id,
          contentType: 'INFOGRAPHIC',
          title: `Unit ${u.n}: ${u.title}`,
          fileUrl,
          fileContent: `${u.title} (${u.tamil})\n${u.desc}\nTip: ${u.tip}`,
        },
      });
    }
    console.log(`  Unit ${u.n}: ${u.title} -> content seeded`);
  }
}

async function run() {
  await seedSubject('Mathematics', '📐', '#6366f1', 'math', MATH_UNITS);
  await seedSubject('Science', '🔬', '#10b981', 'science', SCIENCE_UNITS);
  await prisma.$disconnect();
  console.log('\nDone seeding class 8 syllabus board content.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
