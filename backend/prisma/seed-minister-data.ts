/**
 * seed-minister-data.ts
 * Seeds dynamic tables for Minister KPIs, predictions, policy briefs, budgets,
 * district performances, and live alerts.
 *
 * Run: npx ts-node -P prisma/tsconfig.json prisma/seed-minister-data.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("\n🌱 Seeding Minister Portal data...\n");

  // 1. Clear existing records
  await prisma.ministerKPI.deleteMany({});
  await prisma.ministerPrediction.deleteMany({});
  await prisma.ministerPolicyBrief.deleteMany({});
  await prisma.ministerBudget.deleteMany({});
  await prisma.ministerDistrictPerformance.deleteMany({});
  await prisma.ministerLiveAlert.deleteMany({});

  // 2. Seed Minister KPIs
  const kpis = [
    { id: "kpi-1", label: "10th Pass %", value: 87.4, target: 90.0, unit: "%", icon: "📘", trend: "+2.1%", color: "text-green-600", bg: "bg-green-50/50", lowerBetter: false },
    { id: "kpi-2", label: "12th Pass %", value: 81.2, target: 85.0, unit: "%", icon: "📗", trend: "+1.8%", color: "text-green-600", bg: "bg-green-50/50", lowerBetter: false },
    { id: "kpi-3", label: "Teacher Efficiency", value: 82.0, target: 88.0, unit: "%", icon: "👩‍🏫", trend: "+0.5%", color: "text-orange-600", bg: "bg-orange-50/50", lowerBetter: false },
    { id: "kpi-4", label: "Scholarship Delivery", value: 94.2, target: 98.0, unit: "%", icon: "🎓", trend: "+3.2%", color: "text-green-600", bg: "bg-green-50/50", lowerBetter: false },
    { id: "kpi-5", label: "Dropout Rate", value: 1.8, target: 1.5, unit: "%", icon: "⚠️", trend: "-0.2%", color: "text-orange-600", bg: "bg-orange-50/50", lowerBetter: true },
    { id: "kpi-6", label: "Infrastructure Score", value: 78.0, target: 85.0, unit: "/100", icon: "🏗️", trend: "+3pts", color: "text-green-600", bg: "bg-green-50/50", lowerBetter: false },
    { id: "kpi-7", label: "National Sports Ranks", value: 5.0, target: 3.0, unit: "Rank", icon: "🏆", trend: "+2", color: "text-green-600", bg: "bg-green-50/50", lowerBetter: true }
  ];
  for (const kpi of kpis) {
    await prisma.ministerKPI.create({ data: kpi });
  }
  console.log(`  ✅ Seeded ${kpis.length} Minister KPIs`);

  // 3. Seed Minister Predictions
  const predictions = [
    {
      id: "pred-1",
      category: "Dropout",
      title: "Dropout Prediction (Next Year)",
      prediction: "~14,200 students",
      confidence: 88,
      trend: "Increasing",
      detail: "AI models suggest high risk of dropouts in Krishnagiri & Tirunelveli blocks due to agrarian shifts.",
      recommendations: ["Targeted scholarship drives", "Block-level counseling camps"],
      color: "red",
      updatedAt: new Date()
    },
    {
      id: "pred-2",
      category: "Academics",
      title: "10th Board Pass % Prediction",
      prediction: "88.9%",
      confidence: 94,
      trend: "Improving",
      detail: "Based on mid-term model exams, class performance is expected to exceed last year's rate.",
      recommendations: ["Special tutoring for at-risk students", "Mock exam question banks distribution"],
      color: "green",
      updatedAt: new Date()
    },
    {
      id: "pred-3",
      category: "Academics",
      title: "12th Board Pass % Prediction",
      prediction: "83.1%",
      confidence: 91,
      trend: "Improving",
      detail: "Steady growth across Government Higher Secondary Schools in Science stream.",
      recommendations: ["Extend lab hours in rural centers"],
      color: "green",
      updatedAt: new Date()
    },
    {
      id: "pred-4",
      category: "Staffing",
      title: "Teacher Shortage by 2026",
      prediction: "4,200 positions",
      confidence: 85,
      trend: "Increasing",
      detail: "Retirement and new school upgradations will create vacancies primarily in Mathematics & Science subjects.",
      recommendations: ["Accelerate TET recruitment drives", "Consolidate blocks with low enrollment"],
      color: "orange",
      updatedAt: new Date()
    },
    {
      id: "pred-5",
      category: "Infrastructure",
      title: "Infrastructure Investment Needed",
      prediction: "₹820 Crore",
      confidence: 89,
      trend: "Stable",
      detail: "Required budget for digital lab rollouts and restroom renovation across 1,200 rural schools.",
      recommendations: ["Leverage CSR funds", "Utilize Samagra Shiksha grants"],
      color: "orange",
      updatedAt: new Date()
    }
  ];
  for (const pred of predictions) {
    await prisma.ministerPrediction.create({ data: pred });
  }
  console.log(`  ✅ Seeded ${predictions.length} Minister Predictions`);

  // 4. Seed Minister Policy Briefs
  const policyBriefs = [
    {
      id: "policy-1",
      title: "Dropout Hotspots",
      status: "Active Alert",
      priority: "HIGH",
      impact: "5 blocks in Tirunelveli & Krishnagiri districts show dropout risk >3%. Recommend targeted scholarship drives.",
      districts: 2,
      since: "3 months",
      aiScore: 92,
      updatedAt: new Date()
    },
    {
      id: "policy-2",
      title: "Teacher Deployment Gap",
      status: "Active Alert",
      priority: "HIGH",
      impact: "Mathematics and Science teacher shortage is critical in 12 districts. Consider redeployment plan.",
      districts: 12,
      since: "1 month",
      aiScore: 88,
      updatedAt: new Date()
    },
    {
      id: "policy-3",
      title: "Digital Lab Expansion",
      status: "Needs Action",
      priority: "MEDIUM",
      impact: "38% of rural schools lack high-speed internet access. PM-SHRI and EMIS integration recommended.",
      districts: 38,
      since: "6 months",
      aiScore: 74,
      updatedAt: new Date()
    }
  ];
  for (const pb of policyBriefs) {
    await prisma.ministerPolicyBrief.create({ data: pb });
  }
  console.log(`  ✅ Seeded ${policyBriefs.length} Minister Policy Briefs`);

  // 5. Seed Minister Budget items
  const budgets = [
    { id: "bud-1", head: "Samagra Shiksha", category: "Centrally Sponsored Scheme", approved: 2400.0, released: 2100.0, utilized: 1820.0, fy: "2024-25", updatedAt: new Date() },
    { id: "bud-2", head: "Infrastructure Dev.", category: "State Scheme", approved: 1200.0, released: 1050.0, utilized: 980.0, fy: "2024-25", updatedAt: new Date() },
    { id: "bud-3", head: "Mid-Day Meal", category: "Welfare Scheme", approved: 900.0, released: 890.0, utilized: 876.0, fy: "2024-25", updatedAt: new Date() },
    { id: "bud-4", head: "Scholarship Disbursal", category: "Welfare Scheme", approved: 650.0, released: 580.0, utilized: 520.0, fy: "2024-25", updatedAt: new Date() }
  ];
  for (const bud of budgets) {
    await prisma.ministerBudget.create({ data: bud });
  }
  console.log(`  ✅ Seeded ${budgets.length} Minister Budget items`);

  // 6. Seed Minister District Performance reports
  const districtPerformances = [
    { id: "dist-1", name: "Chennai", schools: 210, students: 198000, attendance: 89.0, pass10: 91.0, pass12: 88.0, dropout: 0.8, infra: 90, score: 92, zone: "North", updatedAt: new Date() },
    { id: "dist-2", name: "Coimbatore", schools: 93, students: 84350, attendance: 87.0, pass10: 87.0, pass12: 83.0, dropout: 1.2, infra: 86, score: 88, zone: "West", updatedAt: new Date() },
    { id: "dist-3", name: "Trichy", schools: 115, students: 103000, attendance: 84.0, pass10: 83.0, pass12: 78.0, dropout: 1.5, infra: 83, score: 84, zone: "Central", updatedAt: new Date() },
    { id: "dist-4", name: "Madurai", schools: 125, students: 112000, attendance: 85.0, pass10: 84.0, pass12: 79.0, dropout: 1.3, infra: 80, score: 83, zone: "South", updatedAt: new Date() },
    { id: "dist-5", name: "Salem", schools: 98, students: 87000, attendance: 83.0, pass10: 81.0, pass12: 76.0, dropout: 1.8, infra: 76, score: 80, zone: "Central", updatedAt: new Date() },
    { id: "dist-6", name: "Tirunelveli", schools: 88, students: 78000, attendance: 82.0, pass10: 79.0, pass12: 73.0, dropout: 2.1, infra: 72, score: 77, zone: "South", updatedAt: new Date() },
    { id: "dist-7", name: "Vellore", schools: 76, students: 67000, attendance: 85.0, pass10: 82.0, pass12: 77.0, dropout: 1.4, infra: 78, score: 81, zone: "North", updatedAt: new Date() },
    { id: "dist-8", name: "Thanjavur", schools: 84, students: 74000, attendance: 86.0, pass10: 83.0, pass12: 78.0, dropout: 1.3, infra: 80, score: 82, zone: "Delta", updatedAt: new Date() }
  ];
  for (const dp of districtPerformances) {
    await prisma.ministerDistrictPerformance.create({ data: dp });
  }
  console.log(`  ✅ Seeded ${districtPerformances.length} Minister District Performance reports`);

  // 7. Seed Minister Live Alerts
  const liveAlerts = [
    { id: "alert-1", type: "CRITICAL", msg: "Tirunelveli District: Attendance below 75% threshold — 3 consecutive days", time: "2 min ago" },
    { id: "alert-2", type: "WARNING", msg: "Salem District: 12 teacher vacancies unfilled for Mathematics — affecting 8,400 students", time: "18 min ago" },
    { id: "alert-3", type: "INFO", msg: "Chennai District: 10th Pass Rate reached 91.2% — State record achieved!", time: "1 hr ago" },
    { id: "alert-4", type: "INFO", msg: "Digital Classroom Phase 3 deployment: 4,212 of 8,000 schools completed", time: "3 hr ago" },
    { id: "alert-5", type: "WARNING", msg: "Scholarship disbursement delayed in Dharmapuri — 2,400 students pending", time: "5 hr ago" }
  ];
  for (const alert of liveAlerts) {
    await prisma.ministerLiveAlert.create({ data: alert });
  }
  console.log(`  ✅ Seeded ${liveAlerts.length} Minister Live Alerts`);

  console.log("\n✨ Minister Portal seeding complete!\n");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
