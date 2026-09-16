import { prisma } from '../config/prisma';

export async function sendMockSMS(to: string, message: string): Promise<boolean> {
  console.log(`\n======================================================`);
  console.log(`📱 [SMS GATEWAY DISPATCH]`);
  console.log(`Recipient Mobile : ${to}`);
  console.log(`Message Content  : "${message}"`);
  console.log(`Timestamp        : ${new Date().toLocaleString()}`);
  console.log(`Status           : SUCCESS (Simulated)`);
  console.log(`======================================================\n`);
  return true;
}

// Helper to resolve parent details for a given student ID
export async function getStudentParents(studentId: string): Promise<{ id: string; phone: string; name: string; userId?: string | null }[]> {
  const parentsList: { id: string; phone: string; name: string; userId?: string | null }[] = [];

  try {
    // 1. Resolve via ParentStudentLink
    const links = await prisma.parentStudentLink.findMany({
      where: { studentId },
      include: { parent: true },
    });

    for (const link of links) {
      if (link.parent && link.parent.phone) {
        parentsList.push({
          id: link.parent.id,
          phone: link.parent.phone,
          name: link.parent.name,
          userId: link.parent.userId,
        });
      }
    }

    // 2. Fallback to student's direct parent details if no link exists
    if (parentsList.length === 0) {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
      });
      if (student && student.parentMobile) {
        // Attempt to find a parent record with this mobile
        const parent = await prisma.headmasterParent.findFirst({
          where: { phone: student.parentMobile },
        });
        if (parent) {
          parentsList.push({
            id: parent.id,
            phone: parent.phone,
            name: parent.name,
            userId: parent.userId,
          });
        } else {
          // If no parent profile exists, create a stub entry or mock using student's values
          parentsList.push({
            id: '', // Empty parent ID if no profile exists
            phone: student.parentMobile,
            name: student.parentName || 'Parent/Guardian',
            userId: null,
          });
        }
      }
    }
  } catch (err) {
    console.error(`[getStudentParents] Error resolving parents for student ${studentId}:`, err);
  }

  return parentsList;
}
