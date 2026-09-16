import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  try {
    const originalClass = "10";
    const testClass = "11";

    // Find our test student
    const student = await prisma.student.findFirst({
      where: { class: originalClass },
      include: { user: true }
    });

    if (!student) {
      console.log(`No student found for class ${originalClass} standard.`);
      return;
    }

    console.log(`\n--- Verification for student: ${student.rollNumber} (${student.user.name}) ---`);
    console.log(`Current Group in DB: '${student.group}'`);

    // Temporarily set student class to "11" for verification
    await prisma.student.update({
      where: { id: student.id },
      data: { class: testClass }
    });


    const apiUrl = "http://localhost:5000/api/centralized-content/subjects";

    // Helper to fetch subjects from the api
    const fetchFromApi = async (qs: string) => {
      const res = await fetch(`${apiUrl}?${qs}`);
      const json: any = await res.json();
      return json.success ? json.data.map((s: any) => `${s.name} (${s.class})`) : ["Error: " + json.error];
    };

    // Test 1: No studentId, no group (shows all class 11 subjects: both common and group-specific since no filter group is given)
    // Wait, if no group is specified and no studentId is specified, does it return all subjects?
    // Let's check our logic: if studentGroup is blank/empty, it filters out group-specific ones. So it should only return common ones!
    const allCommon = await fetchFromApi(`class=${testClass}`);
    console.log(`\nTest 1 (No group/studentId specified, only class=${testClass}):`);
    console.log(allCommon);

    // Test 2: Passing group=Biology
    const biologyGroup = await fetchFromApi(`class=${testClass}&group=Biology`);
    console.log(`\nTest 2 (group=Biology):`);
    console.log(biologyGroup);

    // Test 3: Passing group=Computer Science
    const csGroup = await fetchFromApi(`class=${testClass}&group=Computer%20Science`);
    console.log(`\nTest 3 (group=Computer Science):`);
    console.log(csGroup);

    // Test 7: Passing group=2503
    const group2503 = await fetchFromApi(`class=${testClass}&group=2503`);
    console.log(`\nTest 7 (group=2503):`);
    console.log(group2503);

    // Test 4: Passing studentId (Currently blank group)
    const studentIdBlank = await fetchFromApi(`class=${testClass}&studentId=${student.id}`);
    console.log(`\nTest 4 (studentId=${student.id} with group='${student.group}'):`);
    console.log(studentIdBlank);

    // Test 5: Temporarily update student group to Biology and test
    console.log(`\nUpdating student group to 'Biology'...`);
    await prisma.student.update({
      where: { id: student.id },
      data: { group: "Biology" }
    });

    const studentIdBio = await fetchFromApi(`class=${testClass}&studentId=${student.id}`);
    console.log(`Test 5 (studentId=${student.id} with group='Biology'):`);
    console.log(studentIdBio);

    // Test 6: Temporarily update student group to Computer Science and test
    console.log(`\nUpdating student group to 'Computer Science'...`);
    await prisma.student.update({
      where: { id: student.id },
      data: { group: "Computer Science" }
    });

    const studentIdCS = await fetchFromApi(`class=${testClass}&studentId=${student.id}`);
    console.log(`Test 6 (studentId=${student.id} with group='Computer Science'):`);
    console.log(studentIdCS);

    // Restore original class and group
    console.log(`\nRestoring student class and group...`);
    await prisma.student.update({
      where: { id: student.id },
      data: { class: originalClass, group: student.group }
    });
    console.log("Restored.");

  } catch (err) {
    console.error("Verification failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

run().catch(console.error);
