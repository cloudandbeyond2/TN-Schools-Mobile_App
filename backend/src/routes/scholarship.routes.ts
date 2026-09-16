import { Router, Request, Response } from 'express';

const router = Router();

// ── SCHOLARSHIP MASTER DATA ────────────────────────────────────────────────────
// All Tamil Nadu + Central Government scholarships relevant to school students

const SCHOLARSHIPS = [
  // ── Central Government ────────────────────────────────────────────────────────
  {
    id: "nmms",
    name: "National Means-cum-Merit Scholarship (NMMS)",
    nameTA: "தேசிய திறனுக்கு இணையான தகுதி உதவித்தொகை (NMMS)",
    category: "Central Government",
    categoryTA: "மத்திய அரசு",
    amount: "₹12,000 / year",
    amountTA: "₹12,000 / ஆண்டு",
    type: "Merit + Means",
    classes: [8, 9, 10, 11, 12],
    emoji: "🇮🇳",
    color: "from-orange-500 to-amber-600",
    softColor: "bg-orange-50 dark:bg-orange-950/30",
    textColor: "text-orange-600 dark:text-orange-400",
    borderColor: "border-orange-100 dark:border-orange-900/30",
    description: "Awarded to meritorious students from economically weaker sections studying in state government schools. Disbursed directly to student bank accounts.",
    descriptionTA: "அரசு பள்ளிகளில் படிக்கும் ஏழை குடும்ப மாணவர்களுக்கு தகுதி மற்றும் தேவையின் அடிப்படையில் வழங்கப்படும் உதவித்தொகை.",
    eligibility: "Students of Class 8 in government schools; parental income ≤ ₹3.5 lakh/year; 55%+ in Class 7",
    eligibilityTA: "8ஆம் வகுப்பு அரசு பள்ளி மாணவர்; பெற்றோர் வருமானம் ₹3.5 லட்சம்/ஆண்டிற்குள்; 7ஆம் வகுப்பில் 55%+",
    deadline: "2025-12-31",
    applicationLink: "https://scholarships.gov.in",
    applicationMode: "Online via NSP Portal",
    applicationModeTA: "NSP போர்ட்டல் வழியாக ஆன்லைன்",
    authority: "Department of School Education & Literacy, Govt of India",
    authorityTA: "மத்திய பள்ளி கல்வித் துறை",
    documents: [
      "Aadhaar Card (Student & Parent)",
      "Parent Income Certificate (from Tahsildar)",
      "Class 7 Marksheet (Certified copy)",
      "School Enrollment Certificate",
      "Bank Passbook (Student account)",
      "Community Certificate",
      "Recent Passport Photograph"
    ],
    documentsTA: [
      "ஆதார் அட்டை (மாணவர் & பெற்றோர்)",
      "பெற்றோர் வருமான சான்றிதழ் (தாசில்தாரிடம்)",
      "7ஆம் வகுப்பு மதிப்பெண் சான்றிதழ் (சான்றளிக்கப்பட்ட நகல்)",
      "பள்ளி சேர்க்கை சான்றிதழ்",
      "வங்கி பாஸ்புக் (மாணவர் கணக்கு)",
      "சாதிச் சான்றிதழ்",
      "சமீபத்திய புகைப்படம்"
    ],
    priority: "high",
    renewable: true,
    renewalCondition: "Maintain 55%+ in each class",
    renewalConditionTA: "ஒவ்வொரு வகுப்பிலும் 55%+ தேர்ச்சி",
  },
  {
    id: "inspire",
    name: "INSPIRE Scholarship for Higher Education (SHE)",
    nameTA: "INSPIRE உயர் கல்வி உதவித்தொகை (SHE)",
    category: "Central Government",
    categoryTA: "மத்திய அரசு",
    amount: "₹80,000 / year",
    amountTA: "₹80,000 / ஆண்டு",
    type: "Merit — Science",
    classes: [11, 12],
    emoji: "🔬",
    color: "from-blue-500 to-indigo-600",
    softColor: "bg-blue-50 dark:bg-blue-950/30",
    textColor: "text-blue-600 dark:text-blue-400",
    borderColor: "border-blue-100 dark:border-blue-900/30",
    description: "For students pursuing Natural Sciences at B.Sc/M.Sc level. Top 1% in Class 12 Board exams are eligible.",
    descriptionTA: "இயற்கை அறிவியல் படிக்கும் மாணவர்களுக்கு. 12ஆம் வகுப்பு பொதுத் தேர்வில் முதல் 1% பெற்றவர்களுக்கு.",
    eligibility: "Top 1% in Class 12 Board; pursuing B.Sc/Int.M.Sc in Natural Sciences",
    eligibilityTA: "12ஆம் வகுப்பில் முதல் 1%; இயற்கை அறிவியல் பட்டப்படிப்பு",
    deadline: "2025-11-30",
    applicationLink: "https://online-inspire.gov.in",
    applicationMode: "Online via INSPIRE Portal",
    applicationModeTA: "INSPIRE போர்ட்டல் வழியாக ஆன்லைன்",
    authority: "Department of Science & Technology (DST), Govt of India",
    authorityTA: "அறிவியல் & தொழில்நுட்ப துறை, மத்திய அரசு",
    documents: [
      "Class 12 Marksheet (Original + Photocopy)",
      "Aadhaar Card",
      "College Admission Letter / Bonafide Certificate",
      "Bank Passbook (IFS Code mandatory)",
      "Passport Photograph (latest)"
    ],
    documentsTA: [
      "12ஆம் வகுப்பு மதிப்பெண் சான்றிதழ்",
      "ஆதார் அட்டை",
      "கல்லூரி சேர்க்கை கடிதம்",
      "வங்கி பாஸ்புக் (IFS குறியீடு கட்டாயம்)",
      "புகைப்படம் (சமீபத்தியது)"
    ],
    priority: "high",
    renewable: true,
    renewalCondition: "60%+ in B.Sc 1st and 2nd year",
    renewalConditionTA: "B.Sc முதல் & இரண்டாம் ஆண்டில் 60%+",
  },

  // ── Tamil Nadu State Government ───────────────────────────────────────────────
  {
    id: "trusts",
    name: "TRUSTS — TN Rural Students Talent Search",
    nameTA: "TRUSTS — தமிழ்நாடு ஊரக மாணவர் திறன் தேடல் தேர்வு",
    category: "State Government",
    categoryTA: "மாநில அரசு",
    amount: "₹1,000 / month",
    amountTA: "₹1,000 / மாதம்",
    type: "Merit + Means",
    classes: [9, 10],
    emoji: "🏅",
    color: "from-violet-500 to-purple-600",
    softColor: "bg-violet-50 dark:bg-violet-950/30",
    textColor: "text-violet-600 dark:text-violet-400",
    borderColor: "border-violet-100 dark:border-violet-900/30",
    description: "Tamil Nadu government exam to identify and support talented rural students from economically backward families.",
    descriptionTA: "பொருளாதாரத்தில் பின்தங்கிய குடும்பங்களில் இருந்து திறமையான ஊரக மாணவர்களைக் கண்டறிந்து ஆதரிக்கும் தேர்வு.",
    eligibility: "Class 9 students; Rural area school; Parental income ≤ ₹2.5 lakh/year; 75%+ in Class 8",
    eligibilityTA: "9ஆம் வகுப்பு மாணவர்; கிராமப்புற பள்ளி; பெற்றோர் வருமானம் ₹2.5 லட்சம்/ஆண்டிற்குள்; 8ஆம் வகுப்பில் 75%+",
    deadline: "2025-10-15",
    applicationLink: "https://www.tnschools.gov.in",
    applicationMode: "Through School Headmaster",
    applicationModeTA: "பள்ளி தலைமையாசிரியர் மூலம்",
    authority: "Tamil Nadu School Education Department",
    authorityTA: "தமிழ்நாடு பள்ளிக் கல்வித் துறை",
    documents: [
      "Class 8 Marksheet",
      "Community Certificate (BC/MBC/SC/ST)",
      "Income Certificate from Tahsildar",
      "Residence Proof (Rural area)",
      "School Certificate from Headmaster",
      "Aadhaar Card",
      "Bank Account Details"
    ],
    documentsTA: [
      "8ஆம் வகுப்பு மதிப்பெண் சான்றிதழ்",
      "சாதிச் சான்றிதழ் (BC/MBC/SC/ST)",
      "தாசில்தார் வருமான சான்றிதழ்",
      "வசிப்பிட சான்று (கிராமப்புறம்)",
      "தலைமையாசிரியரிடம் பள்ளிச் சான்றிதழ்",
      "ஆதார் அட்டை",
      "வங்கி கணக்கு விவரங்கள்"
    ],
    priority: "high",
    renewable: true,
    renewalCondition: "Pass all subjects each year; attend school",
    renewalConditionTA: "ஒவ்வொரு ஆண்டும் அனைத்து பாடங்களிலும் தேர்ச்சி",
  },
  {
    id: "pudhumai-penn",
    name: "Pudhumai Penn / Tamil Pudhalvan Scheme",
    nameTA: "புதுமை பெண் / தமிழ் புதல்வன் திட்டம்",
    category: "State Government",
    categoryTA: "மாநில அரசு",
    amount: "₹1,000 / month (after joining college)",
    amountTA: "₹1,000 / மாதம் (கல்லூரியில் சேர்ந்த பின்)",
    type: "Post-School",
    classes: [12],
    emoji: "👩‍🎓",
    color: "from-pink-500 to-rose-600",
    softColor: "bg-pink-50 dark:bg-pink-950/30",
    textColor: "text-pink-600 dark:text-pink-400",
    borderColor: "border-pink-100 dark:border-pink-900/30",
    description: "TN Government scheme providing monthly financial assistance to girls/boys who studied from Class 6–12 in government schools and pursue college education.",
    descriptionTA: "6 முதல் 12ஆம் வகுப்பு வரை அரசுப் பள்ளியில் படித்து கல்லூரியில் சேரும் மாணவி/மாணவர்களுக்கு மாதாந்திர உதவித்தொகை.",
    eligibility: "Studied Class 6–12 in TN Govt school; pursuing degree/diploma in govt college",
    eligibilityTA: "6–12ஆம் வகுப்பு வரை தமிழக அரசுப் பள்ளியில் படித்திருக்க வேண்டும்; அரசு கல்லூரியில் பட்டம்/டிப்ளோமா",
    deadline: "After college admission",
    applicationLink: "https://penkalvi.tn.gov.in",
    applicationMode: "Online via Penkalvi Portal",
    applicationModeTA: "Penkalvi போர்ட்டல் வழியாக ஆன்லைன்",
    authority: "Tamil Nadu Government (CM's Office)",
    authorityTA: "தமிழ்நாடு அரசு (முதலமைச்சர் அலுவலகம்)",
    documents: [
      "12th Marksheet",
      "Transfer Certificate from School",
      "Community Certificate",
      "Aadhaar Card",
      "College Admission Letter",
      "Bank Account Details (in student's name)",
      "Study Certificate from College Principal"
    ],
    documentsTA: [
      "12ஆம் வகுப்பு மதிப்பெண் சான்றிதழ்",
      "பள்ளியிலிருந்து இடமாற்றுச் சான்றிதழ்",
      "சாதிச் சான்றிதழ்",
      "ஆதார் அட்டை",
      "கல்லூரி சேர்க்கை கடிதம்",
      "வங்கி கணக்கு விவரங்கள் (மாணவர் பெயரில்)",
      "கல்லூரி முதல்வரிடம் படிப்புச் சான்றிதழ்"
    ],
    priority: "high",
    renewable: true,
    renewalCondition: "Annual renewal via Penkalvi portal; maintain attendance",
    renewalConditionTA: "Penkalvi போர்ட்டல் மூலம் ஆண்டு புதுப்பிப்பு",
  },
  {
    id: "sc-st-prepost",
    name: "Pre/Post-Matric Scholarship (SC/ST Students)",
    nameTA: "Pre/Post-Matric உதவித்தொகை (SC/ST மாணவர்கள்)",
    category: "Central Government",
    categoryTA: "மத்திய அரசு",
    amount: "₹3,500–₹11,000 / year",
    amountTA: "₹3,500–₹11,000 / ஆண்டு",
    type: "Category Based",
    classes: [9, 10, 11, 12],
    emoji: "🤝",
    color: "from-emerald-500 to-teal-600",
    softColor: "bg-emerald-50 dark:bg-emerald-950/30",
    textColor: "text-emerald-600 dark:text-emerald-400",
    borderColor: "border-emerald-100 dark:border-emerald-900/30",
    description: "Central government scholarship for SC/ST students to cover tuition, hostel fees, and maintenance allowance.",
    descriptionTA: "SC/ST மாணவர்களுக்கு கல்விக் கட்டணம், விடுதி கட்டணம் மற்றும் பராமரிப்பு கொடுப்பனவை உள்ளடக்கிய உதவித்தொகை.",
    eligibility: "SC/ST community; parental income ≤ ₹2.5 lakh/year (SC) or ₹2 lakh/year (ST)",
    eligibilityTA: "SC/ST சமூகம்; பெற்றோர் வருமானம் ₹2.5 லட்சம்/ஆண்டிற்குள் (SC) அல்லது ₹2 லட்சம் (ST)",
    deadline: "2025-11-30",
    applicationLink: "https://scholarships.gov.in",
    applicationMode: "Online via NSP Portal",
    applicationModeTA: "NSP போர்ட்டல் வழியாக ஆன்லைன்",
    authority: "Ministry of Social Justice & Empowerment / Ministry of Tribal Affairs",
    authorityTA: "சமூக நீதி & திரையாண்மை அமைச்சகம்",
    documents: [
      "Community Certificate (Caste Certificate)",
      "Income Certificate from Tahsildar",
      "Previous year Marksheet",
      "Aadhaar Card (Bank linked)",
      "Bank Passbook",
      "School Enrollment Bonafide",
      "Hostel Certificate (if applicable)"
    ],
    documentsTA: [
      "சாதிச் சான்றிதழ் (Caste Certificate)",
      "தாசில்தார் வருமான சான்றிதழ்",
      "கடந்த ஆண்டு மதிப்பெண் சான்றிதழ்",
      "ஆதார் அட்டை (வங்கி இணைக்கப்பட்டது)",
      "வங்கி பாஸ்புக்",
      "பள்ளி சேர்க்கை உறுதிச் சான்றிதழ்",
      "விடுதி சான்றிதழ் (பொருந்துமெனில்)"
    ],
    priority: "medium",
    renewable: true,
    renewalCondition: "Annual renewal on NSP portal; pass all exams",
    renewalConditionTA: "NSP போர்ட்டலில் ஆண்டு புதுப்பிப்பு",
  },
  {
    id: "minority",
    name: "Pre-Matric Scholarship for Minorities",
    nameTA: "சிறுபான்மையினர் Pre-Matric உதவித்தொகை",
    category: "Central Government",
    categoryTA: "மத்திய அரசு",
    amount: "₹10,000 / year",
    amountTA: "₹10,000 / ஆண்டு",
    type: "Minority Community",
    classes: [9, 10],
    emoji: "☪️",
    color: "from-sky-500 to-blue-600",
    softColor: "bg-sky-50 dark:bg-sky-950/30",
    textColor: "text-sky-600 dark:text-sky-400",
    borderColor: "border-sky-100 dark:border-sky-900/30",
    description: "For students belonging to minority communities (Muslim, Christian, Sikh, Buddhist, Parsi, Jain) with income below ₹1 lakh/year.",
    descriptionTA: "சிறுபான்மை சமூகங்களைச் சேர்ந்த மாணவர்களுக்கு (முஸ்லிம், கிரிஸ்தவர், சீக்கியர், பவுத்தர், பார்சி, ஜைன) வருமானம் ₹1 லட்சத்திற்கும் குறைவாக இருந்தால்.",
    eligibility: "Minority community; parental income ≤ ₹1 lakh/year; 50%+ in previous class",
    eligibilityTA: "சிறுபான்மை சமூகம்; பெற்றோர் வருமானம் ₹1 லட்சத்திற்குள்; கடந்த வகுப்பில் 50%+",
    deadline: "2025-10-31",
    applicationLink: "https://scholarships.gov.in",
    applicationMode: "Online via NSP Portal",
    applicationModeTA: "NSP போர்ட்டல் வழியாக ஆன்லைன்",
    authority: "Ministry of Minority Affairs, Govt of India",
    authorityTA: "சிறுபான்மை விவகார அமைச்சகம், மத்திய அரசு",
    documents: [
      "Minority Community Certificate (from Gazetted Officer)",
      "Income Certificate",
      "Previous Class Marksheet",
      "Aadhaar Card",
      "Bank Passbook",
      "School Enrollment Certificate"
    ],
    documentsTA: [
      "சிறுபான்மை சமூக சான்றிதழ் (அரசு அலுவலரிடம்)",
      "வருமான சான்றிதழ்",
      "கடந்த வகுப்பு மதிப்பெண் சான்றிதழ்",
      "ஆதார் அட்டை",
      "வங்கி பாஸ்புக்",
      "பள்ளி சேர்க்கை சான்றிதழ்"
    ],
    priority: "medium",
    renewable: true,
    renewalCondition: "Annual renewal on NSP; 50%+ attendance and marks",
    renewalConditionTA: "NSP போர்ட்டலில் ஆண்டு புதுப்பிப்பு",
  },
  {
    id: "tngovt-merit",
    name: "TN State Merit Scholarship",
    nameTA: "தமிழ்நாடு மாநில திறன் உதவித்தொகை",
    category: "State Government",
    categoryTA: "மாநில அரசு",
    amount: "₹5,000 / year",
    amountTA: "₹5,000 / ஆண்டு",
    type: "Merit Based",
    classes: [9, 10, 11, 12],
    emoji: "🏛️",
    color: "from-amber-500 to-orange-600",
    softColor: "bg-amber-50 dark:bg-amber-950/30",
    textColor: "text-amber-600 dark:text-amber-400",
    borderColor: "border-amber-100 dark:border-amber-900/30",
    description: "Tamil Nadu government merit scholarship for students scoring above 80% in the previous academic year in government schools.",
    descriptionTA: "அரசுப் பள்ளிகளில் கடந்த கல்வியாண்டில் 80%-க்கும் அதிகமாக மதிப்பெண் பெற்ற மாணவர்களுக்கு மாநில தகுதி உதவித்தொகை.",
    eligibility: "Government school student; 80%+ in previous class exams; any community",
    eligibilityTA: "அரசுப் பள்ளி மாணவர்; கடந்த வகுப்பில் 80%+; எந்தச் சமூகமும்",
    deadline: "2025-09-30",
    applicationLink: "https://www.tnschools.gov.in",
    applicationMode: "Through School Headmaster",
    applicationModeTA: "பள்ளி தலைமையாசிரியர் மூலம்",
    authority: "Tamil Nadu School Education Department",
    authorityTA: "தமிழ்நாடு பள்ளிக் கல்வித் துறை",
    documents: [
      "Previous Year Marksheet (Original)",
      "Community Certificate",
      "School Certificate signed by Headmaster",
      "Aadhaar Card",
      "Bank Passbook (student's name)",
      "Parent Income Certificate"
    ],
    documentsTA: [
      "கடந்த ஆண்டு மதிப்பெண் சான்றிதழ் (மூலம்)",
      "சாதிச் சான்றிதழ்",
      "தலைமையாசிரியர் கையொப்பமிட்ட சான்றிதழ்",
      "ஆதார் அட்டை",
      "வங்கி பாஸ்புக் (மாணவர் பெயரில்)",
      "பெற்றோர் வருமான சான்றிதழ்"
    ],
    priority: "medium",
    renewable: false,
    renewalCondition: "",
    renewalConditionTA: "",
  },
  {
    id: "obc-scholarship",
    name: "OBC Pre-Matric Scholarship",
    nameTA: "OBC Pre-Matric உதவித்தொகை",
    category: "Central Government",
    categoryTA: "மத்திய அரசு",
    amount: "₹1,000 / year (day scholars) | ₹3,500 (hostellers)",
    amountTA: "₹1,000 / ஆண்டு (தினசரி) | ₹3,500 (விடுதி மாணவர்)",
    type: "OBC Category",
    classes: [9, 10],
    emoji: "🤲",
    color: "from-lime-500 to-green-600",
    softColor: "bg-lime-50 dark:bg-lime-950/30",
    textColor: "text-lime-600 dark:text-lime-400",
    borderColor: "border-lime-100 dark:border-lime-900/30",
    description: "Scholarship for Other Backward Class (OBC) students studying in Classes 9 and 10, to meet educational expenses.",
    descriptionTA: "9 மற்றும் 10ஆம் வகுப்பில் படிக்கும் OBC மாணவர்களுக்கு கல்விச் செலவுகளை ஏற்க உதவும் உதவித்தொகை.",
    eligibility: "OBC community; parental income ≤ ₹1.5 lakh/year; studying in recognized school",
    eligibilityTA: "OBC சமூகம்; பெற்றோர் வருமானம் ₹1.5 லட்சத்திற்குள்; அங்கீகரிக்கப்பட்ட பள்ளியில் படிக்கும்",
    deadline: "2025-10-31",
    applicationLink: "https://scholarships.gov.in",
    applicationMode: "Online via NSP Portal",
    applicationModeTA: "NSP போர்ட்டல் வழியாக ஆன்லைன்",
    authority: "Ministry of Social Justice & Empowerment",
    authorityTA: "சமூக நீதி & திரையாண்மை அமைச்சகம்",
    documents: [
      "OBC Certificate (Non-Creamy Layer)",
      "Income Certificate",
      "Previous Class Marksheet",
      "Aadhaar Card",
      "Bank Passbook",
      "School Enrollment Certificate"
    ],
    documentsTA: [
      "OBC சான்றிதழ் (Non-Creamy Layer)",
      "வருமான சான்றிதழ்",
      "கடந்த வகுப்பு மதிப்பெண் சான்றிதழ்",
      "ஆதார் அட்டை",
      "வங்கி பாஸ்புக்",
      "பள்ளி சேர்க்கை சான்றிதழ்"
    ],
    priority: "medium",
    renewable: true,
    renewalCondition: "Annual renewal; maintain 50%+ marks",
    renewalConditionTA: "ஆண்டு புதுப்பிப்பு; 50%+ மதிப்பெண்கள்",
  },
];

// ── GOVERNMENT NOTIFICATIONS ───────────────────────────────────────────────────
const NOTIFICATIONS = [
  {
    id: "notif-1",
    title: "NMMS 2025-26 Applications Open",
    titleTA: "NMMS 2025-26 விண்ணப்பங்கள் திறக்கப்பட்டன",
    type: "New Opening",
    priority: "urgent",
    date: "2025-09-01",
    description: "National Means-cum-Merit Scholarship 2025-26 applications are now open on the NSP portal. Last date: 31 Dec 2025.",
    descriptionTA: "NSP போர்ட்டலில் NMMS 2025-26 விண்ணப்பங்கள் திறக்கப்பட்டுள்ளன. கடைசி தேதி: 31 டிசம்பர் 2025.",
    link: "https://scholarships.gov.in",
    emoji: "🇮🇳",
  },
  {
    id: "notif-2",
    title: "TRUSTS Exam Registration 2025",
    titleTA: "TRUSTS தேர்வு பதிவு 2025",
    type: "Exam",
    priority: "high",
    date: "2025-09-05",
    description: "TN Rural Students Talent Search examination registration is open until 15 Oct 2025. Apply through your school headmaster.",
    descriptionTA: "TRUSTS தேர்வு பதிவு அக்டோபர் 15, 2025 வரை திறந்திருக்கும். பள்ளி தலைமையாசிரியர் மூலம் விண்ணப்பிக்கவும்.",
    link: "https://www.tnschools.gov.in",
    emoji: "🏅",
  },
  {
    id: "notif-3",
    title: "SC/ST Pre-Matric Renewal Reminder",
    titleTA: "SC/ST Pre-Matric புதுப்பிப்பு நினைவூட்டல்",
    type: "Renewal",
    priority: "medium",
    date: "2025-09-10",
    description: "Existing SC/ST Pre-Matric scholarship holders must renew their applications on NSP portal before 30 Nov 2025.",
    descriptionTA: "தற்போதைய SC/ST Pre-Matric உதவித்தொகை பெறுவோர் NSP போர்ட்டலில் நவம்பர் 30, 2025 முன் புதுப்பிக்க வேண்டும்.",
    link: "https://scholarships.gov.in",
    emoji: "🤝",
  },
  {
    id: "notif-4",
    title: "Pudhumai Penn — College Students Apply Now",
    titleTA: "புதுமை பெண் — கல்லூரி மாணவர்கள் இப்போதே விண்ணப்பிக்கவும்",
    type: "Announcement",
    priority: "high",
    date: "2025-09-12",
    description: "Class 12 students who have recently joined college can now apply for the Pudhumai Penn / Tamil Pudhalvan scheme via Penkalvi Portal.",
    descriptionTA: "கல்லூரியில் சேர்ந்த 12ஆம் வகுப்பு மாணவர்கள் Penkalvi போர்ட்டல் மூலம் இப்போது விண்ணப்பிக்கலாம்.",
    link: "https://penkalvi.tn.gov.in",
    emoji: "👩‍🎓",
  },
  {
    id: "notif-5",
    title: "OBC & Minority NSP Applications — Deadline Approaching",
    titleTA: "OBC & சிறுபான்மை NSP விண்ணப்பங்கள் — காலக்கெடு நெருங்குகிறது",
    type: "Deadline Alert",
    priority: "urgent",
    date: "2025-10-01",
    description: "Last date for OBC and Minority Pre-Matric scholarship applications on NSP portal is 31 Oct 2025. Do not miss it!",
    descriptionTA: "NSP போர்ட்டலில் OBC மற்றும் சிறுபான்மை Pre-Matric உதவித்தொகை விண்ணப்பங்களுக்கான கடைசி தேதி அக்டோபர் 31, 2025. தவறவிடாதீர்கள்!",
    link: "https://scholarships.gov.in",
    emoji: "⚠️",
  },
  {
    id: "notif-6",
    title: "TN Govt Merit Scholarship — School Submissions Open",
    titleTA: "TN அரசு தகுதி உதவித்தொகை — பள்ளி சமர்ப்பிப்பு திறந்திருக்கிறது",
    type: "New Opening",
    priority: "medium",
    date: "2025-09-08",
    description: "Schools must submit lists of eligible students for TN State Merit Scholarship before 30 Sep 2025. Inform your headmaster.",
    descriptionTA: "பள்ளிகள் செப்டம்பர் 30, 2025 முன் தகுதி மாணவர்களின் பட்டியலை சமர்ப்பிக்க வேண்டும். உங்கள் தலைமையாசிரியரிடம் தெரிவிக்கவும்.",
    link: "https://www.tnschools.gov.in",
    emoji: "🏛️",
  },
];

// ── GET /api/scholarships ─────────────────────────────────────────────────────
// Query: ?class=10&community=SC
router.get('/', async (req: Request, res: Response) => {
  try {
    const cls = parseInt(String(req.query.class || '10'));
    const community = String(req.query.community || '').toUpperCase();

    let results = SCHOLARSHIPS.filter(s => s.classes.includes(cls));

    // If community filter is provided, sort community-specific ones to top
    if (community && ['SC', 'ST', 'OBC', 'MINORITY'].includes(community)) {
      results = results.sort((a, b) => {
        const communityTypes: Record<string, string[]> = {
          'SC': ['Category Based', 'OBC Category'],
          'ST': ['Category Based'],
          'OBC': ['OBC Category'],
          'MINORITY': ['Minority Community'],
        };
        const relevantTypes = communityTypes[community] || [];
        const aMatch = relevantTypes.includes(a.type) ? -1 : 0;
        const bMatch = relevantTypes.includes(b.type) ? -1 : 0;
        return aMatch - bMatch;
      });
    }

    // Add days-until-deadline
    const now = new Date();
    const enriched = results.map(s => {
      const deadlineDate = new Date(s.deadline);
      const daysLeft = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        ...s,
        daysLeft: isNaN(daysLeft) ? null : daysLeft,
        isExpired: isNaN(daysLeft) ? false : daysLeft < 0,
        isUrgent: !isNaN(daysLeft) && daysLeft >= 0 && daysLeft <= 30,
      };
    });

    res.json({ success: true, data: enriched, total: enriched.length });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ── GET /api/scholarships/notifications ──────────────────────────────────────
router.get('/notifications', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(String(req.query.limit || '10'));
    const sorted = [...NOTIFICATIONS].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    res.json({ success: true, data: sorted.slice(0, limit) });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ── GET /api/scholarships/:id ─────────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const scholarship = SCHOLARSHIPS.find(s => s.id === req.params.id);
    if (!scholarship) {
      return res.status(404).json({ success: false, error: 'Scholarship not found' });
    }
    const now = new Date();
    const deadlineDate = new Date(scholarship.deadline);
    const daysLeft = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    res.json({
      success: true,
      data: {
        ...scholarship,
        daysLeft: isNaN(daysLeft) ? null : daysLeft,
        isExpired: isNaN(daysLeft) ? false : daysLeft < 0,
        isUrgent: !isNaN(daysLeft) && daysLeft >= 0 && daysLeft <= 30,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;
