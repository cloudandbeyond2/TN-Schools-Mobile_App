import { prisma } from './config/prisma';

async function test() {
  try {
    const subjectCount = await prisma.centralSubject.count();
    const unitCount = await prisma.centralUnit.count();
    const topicCount = await prisma.centralTopic.count();
    const contentCount = await prisma.centralContent.count();
    
    console.log({
      success: true,
      subjectCount,
      unitCount,
      topicCount,
      contentCount
    });
  } catch (error: any) {
    console.error({
      success: false,
      error: error.message || error
    });
  } finally {
    await prisma.$disconnect();
  }
}

test();
