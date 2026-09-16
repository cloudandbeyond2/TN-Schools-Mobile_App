import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding initial real data for library, guide, neet prep, and competitive exams...");

  // Clear existing entries to allow clean re-runs
  await prisma.digitalLibraryResource.deleteMany({});
  await prisma.personalGuide.deleteMany({});
  await prisma.nEETChapter.deleteMany({});
  await prisma.nEETMockTest.deleteMany({});
  await prisma.competitiveExam.deleteMany({});
  console.log("🧹 Cleared existing records from library, guide, neet prep, and competitive exams.");

  const school = await prisma.school.findFirst();
  const schoolId = school ? school.id : null;

  const teacher = await prisma.user.findFirst({ where: { role: 'TEACHER' } });
  const teacherId = teacher ? teacher.id : null;

  // 1. Digital Library Resources
  const existingResources = await prisma.digitalLibraryResource.count();
  if (existingResources === 0) {
    await prisma.digitalLibraryResource.createMany({
      data: [
        {
          title: "Class 12 Physics – Wave Optics Notes",
          type: "PDF",
          subject: "Physics",
          class: "12",
          size: "2.4 MB",
          description: "Comprehensive notes covering interference, diffraction, polarization with solved examples.",
          tags: ["NEET", "Board Exam", "Optics"],
          schoolId,
          teacherId,
        },
        {
          title: "Organic Chemistry Reaction Mechanism",
          type: "Video",
          subject: "Chemistry",
          class: "11",
          size: "145 MB",
          description: "Step-by-step video explanation of all major organic reaction mechanisms for NEET & JEE.",
          tags: ["NEET", "JEE", "Organic"],
          schoolId,
          teacherId,
        },
        {
          title: "Genetics & Evolution Practice Worksheet",
          type: "Worksheet",
          subject: "Biology",
          class: "12",
          size: "1.1 MB",
          description: "Practice problems on Mendelian genetics, molecular biology and evolution theories.",
          tags: ["Biology", "NEET", "Genetics"],
          schoolId,
          teacherId,
        },
        {
          title: "Trigonometry Formulas Revision Sheet",
          type: "PDF",
          subject: "Mathematics",
          class: "10",
          size: "0.8 MB",
          description: "All key trigonometry formulas, identities and standard values compiled for quick revision.",
          tags: ["Board Exam", "Maths", "Revision"],
          schoolId,
          teacherId,
        },
      ]
    });
    console.log("✅ Seeded Digital Library Resources.");
  }

  // 2. Personal Guide Profiles
  const existingGuides = await prisma.personalGuide.count();
  if (existingGuides === 0) {
    const dbStudents = await prisma.student.findMany({
      include: { user: true },
      take: 6
    });

    const goals = [
      "NEET – Medical College",
      "JEE – Engineering",
      "UPSC / Civil Services",
      "Chartered Accountant (CA)",
      "Defence Services (NDA)",
      "Sports/Aptitude Career"
    ];

    const strengthsList = [
      ["Biology", "Chemistry"],
      ["Mathematics", "Physics"],
      ["English", "Social Science"],
      ["Tamil", "Accountancy"],
      ["Physics", "Chemistry"],
      ["Drawing", "Sports"]
    ];

    const weaknessesList = [
      ["Physics", "Mathematics"],
      ["English", "Chemistry"],
      ["Mathematics", "Science"],
      ["English", "Maths"],
      ["Biology", "Tamil"],
      ["Mathematics", "Science"]
    ];

    const guideStatus = ["On Track", "Needs Attention", "At Risk", "On Track", "Needs Attention", "On Track"];
    const notesList = [
      "Strong in science. Needs extra coaching in Physics. Attends all mock tests regularly.",
      "Good at quantitative subjects. Language skills need improvement. Parent meeting scheduled.",
      "Excellent in humanities. Interested in civil services. Referred to scholarship programs.",
      "Very dedicated to commerce stream. Needs guidance on foundation exams.",
      "Highly motivated for military career. Physical training is excellent, academic score needs improvement.",
      "Top talent in sports. Balancing academics and athletic career well."
    ];

    if (dbStudents.length > 0) {
      const guideData = dbStudents.map((s, idx) => ({
        studentName: s.user.name,
        studentId: s.id,
        class: s.class,
        section: s.section,
        academicScore: 60 + Math.floor(Math.random() * 35),
        attendance: 75 + Math.floor(Math.random() * 23),
        strengths: strengthsList[idx % strengthsList.length],
        weaknesses: weaknessesList[idx % weaknessesList.length],
        goal: goals[idx % goals.length],
        parentContact: s.parentMobile || "+91 98765 4321" + idx,
        guidanceStatus: guideStatus[idx % guideStatus.length],
        notes: notesList[idx % notesList.length],
        lastMeeting: new Date(Date.now() - (idx * 2 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
        schoolId: s.schoolId || schoolId,
        teacherId,
      }));

      await prisma.personalGuide.createMany({
        data: guideData
      });
      console.log(`✅ Seeded ${guideData.length} Personal Guide Profiles using real students.`);
    } else {
      console.log("⚠️ No students found in the database to link guidance profiles.");
    }
  }

  // 3. NEET Prep Chapters
  await prisma.nEETChapter.createMany({
    data: [
      {
        subject: "Biology",
        chapter: "Cell Structure and Function",
        difficulty: "Hard",
        totalQuestions: 120,
        attempted: 120,
        correct: 97,
        status: "Completed",
        schoolId,
        teacherId,
      },
      {
        subject: "Biology",
        chapter: "Human Physiology",
        difficulty: "Medium",
        totalQuestions: 98,
        attempted: 72,
        correct: 54,
        status: "In Progress",
        schoolId,
        teacherId,
      },
      {
        subject: "Chemistry",
        chapter: "Some Basic Principles of Organic Chemistry",
        difficulty: "Hard",
        totalQuestions: 145,
        attempted: 90,
        correct: 60,
        status: "In Progress",
        schoolId,
        teacherId,
      },
      {
        subject: "Physics",
        chapter: "Physics and Measurement",
        difficulty: "Hard",
        totalQuestions: 110,
        attempted: 110,
        correct: 82,
        status: "Completed",
        schoolId,
        teacherId,
      },
    ]
  });
  console.log("✅ Seeded NEET Chapters.");

  // 4. NEET Mock Tests
  await prisma.nEETMockTest.createMany({
    data: [
      {
        title: "NEET Grand Mock #4",
        subject: "Full Syllabus",
        examDate: "2025-07-05",
        duration: "3 hrs 20 min",
        totalStudents: 48,
        avgScore: 512,
        topScore: 680,
        maxScore: 720,
        schoolId,
        teacherId,
      },
      {
        title: "Biology Booster Test",
        subject: "Biology",
        examDate: "2025-06-28",
        duration: "1 hr",
        totalStudents: 52,
        avgScore: 145,
        topScore: 180,
        maxScore: 180,
        schoolId,
        teacherId,
      },
    ]
  });
  console.log("✅ Seeded NEET Mock Tests.");

  // 5. Competitive Exams
  await prisma.competitiveExam.createMany({
    data: [
      {
        examName: "NEET UG 2026",
        category: "Medical",
        conductedBy: "NTA",
        registrationDeadline: "2026-02-15",
        examDate: "2026-05-03",
        status: "Registration Open",
        eligibility: "Class 12 with PCB (45%+)",
        website: "neet.nta.nic.in",
        studentsEnrolled: 48,
        studentsCleared: 12,
        schoolId,
        teacherId,
        syllabus: [
          {
            name: "Biology",
            icon: "🧬",
            color: "text-pink-500 bg-pink-500/10",
            chapters: [
              { id: "b1", name: "Diversity in Living World", concepts: ["What is living", "Biodiversity", "Need for classification", "Taxonomy and systematics", "Concept of species and hierarchy", "Binomial nomenclature", "Five kingdom classification", "Monera, Protista and Fungi", "Lichens, Viruses and Viroids", "Plant kingdom (Algae, Bryophytes, Pteridophytes, Gymnosperms)", "Animal kingdom (non-chordate up to phyla, chordate up to class)"] },
              { id: "b2", name: "Structural Organisation in Animals and Plants", concepts: ["Morphology and modifications of flowering plants", "Anatomy of root, stem, leaf, inflorescence, flower, fruit and seed", "Plant families (Malvaceae, Cruciferae, Leguminosae, Compositae, Gramineae)", "Animal tissues", "Anatomy and functions of frog systems (digestive, circulatory, respiratory, nervous, reproductive)"] },
              { id: "b3", name: "Cell Structure and Function", concepts: ["Cell theory", "Prokaryotic and eukaryotic cells", "Plant and animal cells", "Cell envelope, membrane and wall", "Cell organelles structure and function", "Endomembrane system (ER, Golgi, lysosomes, vacuoles)", "Mitochondria, ribosomes, plastids, microbodies", "Cytoskeleton, cilia, flagella, centrioles", "Nucleus structure", "Biomolecules (proteins, carbohydrates, lipids, nucleic acids)", "Enzymes classification, action and factors", "Cell cycle, mitosis, meiosis"] },
              { id: "b4", name: "Plant Physiology", concepts: ["Photosynthesis as autotrophic nutrition", "Site of photosynthesis", "photosynthetic pigments", "light and dark reactions", "C3 and C4 pathways", "Factors affecting photosynthesis", "Respiration gaseous exchange", "cellular respiration (glycolysis, fermentation, TCA cycle, ETS)", "Energy relations and RQ", "Plant growth and development", "Phases of growth", "differentiation, dedifferentiation and redifferentiation", "Plant growth regulators (auxin, gibberellin, cytokinin, ethylene, ABA)"] },
              { id: "b5", name: "Human Physiology", concepts: ["Breathing and respiration", "Respiratory organs and system", "Mechanics of breathing", "respiratory volumes and disorders", "Body fluids and circulation", "blood and lymph", "human heart and blood vessels", "Cardiac cycle, cardiac output, ECG", "double circulation", "blood pressure disorders", "Excretory products and elimination", "urine formation and kidney function", "renal disorders and dialysis", "Locomotion and movement", "skeletal muscle contraction", "Joints and skeletal disorders", "Neural control and coordination", "neuron structure and nerve impulse", "central and peripheral nervous system", "Chemical coordination and regulation", "endocrine glands and hormones", "mechanism of hormone action", "hormonal disorders"] },
              { id: "b6", name: "Reproduction", concepts: ["Sexual reproduction in flowering plants", "flower structure", "pollination and fertilization", "seed and fruit formation", "apomixis and polyembryony", "Human reproduction system", "gametogenesis (spermatogenesis, oogenesis)", "menstrual cycle", "fertilization and pregnancy", "parturition and lactation", "Reproductive health and STDs", "contraception", "infertility and assisted technologies (IVF, ZIFT, GIFT)"] },
              { id: "b7", name: "Genetics and Evolution", concepts: ["Mendelian Inheritance", "Deviations from Mendelism", "pleiotropy", "chromosome theory", "linkage and crossing over", "sex determination", "genetic disorders (Thalassemia)", "chromosomal disorders (Down's, Turner's, Klinefelter's)", "Molecular basis of inheritance", "DNA and RNA structure", "DNA replication", "transcription, translation and genetic code", "gene expression regulation (Lac Operon)", "Human Genome Project", "DNA fingerprinting", "Evolution origin of life", "evidence of evolution", "Darwin's contribution", "Modern Synthetic theory", "natural selection types", "gene flow and genetic drift", "Hardy-Weinberg principle", "human evolution"] },
              { id: "b8", name: "Biology and Human Welfare", concepts: ["Health and Disease", "human pathogens (Malaria, Typhoid, etc.)", "immunology and vaccines", "cancer and AIDS", "adolescence and substance abuse", "Microbes in human welfare (food processing, industrial, sewage, energy, biocontrol)"] },
              { id: "b9", name: "Biotechnology and Its Applications", concepts: ["Principles and process of Biotechnology", "recombinant DNA technology", "Biotech applications in health and agriculture", "human insulin and vaccine production", "gene therapy", "GMOs (Bt crops)", "transgenic animals", "biosafety, biopiracy and patents"] },
              { id: "b10", name: "Ecology and Environment", concepts: ["Organisms and environment", "population interactions (mutualism, competition, etc.)", "Ecosystem patterns and components", "productivity, decomposition and energy flow", "ecological pyramids", "Biodiversity and conservation", "Red Data Book", "biosphere reserves, national parks and sanctuaries"] }
            ]
          },
          {
            name: "Chemistry",
            icon: "🧪",
            color: "text-emerald-500 bg-emerald-500/10",
            chapters: [
              { id: "c1", name: "Some Basic Concepts in Chemistry", concepts: ["Matter and its nature", "Dalton's atomic theory", "Laws of chemical combination", "Atomic and molecular masses", "mole concept", "molar mass", "percentage composition", "empirical and molecular formulae", "Chemical equations and stoichiometry"] },
              { id: "c2", name: "Atomic Structure", concepts: ["Nature of electromagnetic radiation", "photoelectric effect", "Spectrum of hydrogen atom", "Bohr model of hydrogen atom", "dual nature of matter", "de Broglie's relationship", "Heisenberg uncertainty principle", "quantum mechanics", "atomic orbitals as one-electron wave functions", "quantum numbers", "shapes of s, p, and d orbitals", "rules for filling electrons (Aufbau, Pauli, Hund)", "electronic configuration of elements"] },
              { id: "c3", name: "Chemical Bonding and Molecular Structure", concepts: ["Kossel - Lewis approach", "ionic and covalent bonds", "Ionic Bonding factors", "lattice enthalpy", "Covalent Bonding electronegativity", "Fajan's rule", "dipole moment", "VSEPR theory and shapes", "Valence bond theory", "hybridization (sp, sp2, sp3, dsp2)", "Resonance", "Molecular Orbital Theory", "LCAOs", "sigma and pi bonds", "configurations of homonuclear diatomic molecules", "bond order", "bond length", "bond energy", "metallic bonding", "Hydrogen bonding"] },
              { id: "c4", name: "Chemical Thermodynamics", concepts: ["System and surroundings", "extensive and intensive properties", "state functions", "types of thermodynamic processes", "First law of thermodynamics", "Concept of work, heat, internal energy and enthalpy", "heat capacity", "Hess's law", "Enthalpies of reactions", "Second law of thermodynamics", "entropy and spontaneity", "Gibbs energy change and equilibrium constant"] },
              { id: "c5", name: "Solutions", concepts: ["Molality", "molarity", "mole fraction", "percentage concentration", "vapour pressure of solutions", "Raoult's Law", "Ideal and non-ideal solutions", "Colligative properties", "elevation of boiling point", "depression of freezing point", "osmotic pressure", "molecular mass determination", "van't Hoff factor"] },
              { id: "c6", name: "Equilibrium", concepts: ["Dynamic equilibrium", "Equilibria involving physical processes (solid-liquid, liquid-gas)", "Henry's law", "Chemical equilibrium law", "equilibrium constants (Kp and Kc)", "Le Chatelier's principle", "Ionic equilibrium", "weak and strong electrolytes", "ionization", "Arrhenius, Bronsted-Lowry and Lewis acids/bases", "pH scale", "common ion effect", "hydrolysis of salts", "solubility product", "buffer solutions"] },
              { id: "c7", name: "Redox Reactions and Electrochemistry", concepts: ["Concept of oxidation and reduction", "oxidation number", "balancing of redox reactions", "Electrolytic and metallic conduction", "molar conductivities", "Kohlrausch's law", "Electrochemical cells (Electrolytic and Galvanic)", "electrode potentials", "Nernst equation", "relationship between cell potential and Gibbs energy", "Dry cell and lead accumulator", "Fuel cells"] },
              { id: "c8", name: "Chemical Kinetics", concepts: ["Rate of chemical reaction", "factors affecting rate", "order and molecularity of reactions", "rate law", "rate constant", "differential and integral rate forms", "half-life of reactions", "effect of temperature on rate", "Arrhenius theory", "activation energy", "collision theory"] },
              { id: "c9", name: "Classification of Elements and Periodicity in Properties", concepts: ["Modern periodic law", "s, p, d and f block elements", "periodic trends in atomic/ionic radii", "ionization enthalpy", "electron gain enthalpy", "valence", "oxidation states", "chemical reactivity"] },
              { id: "c10", name: "P- Block Elements", concepts: ["Group 13 to Group 18 Elements configurations", "physical and chemical property trends", "unique behaviour of the first element in each group"] },
              { id: "c11", name: "d- and f- Block Elements", concepts: ["Transition Elements general introduction", "configurations", "first-row transition elements trends", "interstitial compounds", "alloy formation", "Preparation and properties of K2Cr2O7 and KMnO4", "Lanthanoids configuration and contraction", "Actinoids configuration and oxidation states"] },
              { id: "c12", name: "Co-ordination Compounds", concepts: ["Werner's theory", "ligands", "coordination number", "denticity", "chelation", "IUPAC nomenclature", "isomerism", "Valence bond approach", "Crystal field theory", "colour and magnetic properties", "Importance of coordination compounds"] },
              { id: "c13", name: "Purification and Characterisation of Organic Compounds", concepts: ["Crystallization", "sublimation", "distillation", "differential extraction", "chromatography", "Qualitative analysis (Nitrogen, Sulphur, halogens)", "Quantitative analysis (carbon, hydrogen, nitrogen, halogens, sulphur, phosphorus)", "Empirical and molecular formula calculations"] },
              { id: "c14", name: "Some Basic Principles of Organic Chemistry", concepts: ["Tetravalency of carbon", "shapes of simple molecules", "hybridization", "functional group classification", "Homologous series", "Isomerism", "IUPAC Nomenclature", "Homolytic and heterolytic fission", "free radicals, carbocations and carbanions stability", "electrophiles and nucleophiles", "Inductive, electromeric, resonance and hyperconjugation effects", "Substitution, addition, elimination and rearrangement reactions"] },
              { id: "c15", name: "Hydrocarbons", concepts: ["Alkanes Sawhorse and Newman projections", "halogenation mechanism", "Alkenes geometrical isomerism", "electrophilic addition mechanism", "Ozonolysis and polymerization", "Alkynes acidic character", "polymerization", "Aromatic hydrocarbons nomenclature", "benzene structure and aromaticity", "electrophilic substitution (halogenation, nitration)", "Friedel-Crafts alkylation and acylation"] },
              { id: "c16", name: "Organic Compounds Containing Halogens", concepts: ["Methods of preparation", "Nature of C-X bond", "substitution mechanisms", "Environmental effects of chloroform, iodoform, freons, and DDT"] },
              { id: "c17", name: "Organic Compounds Containing Oxygen", concepts: ["Alcohols, Phenols, and Ethers preparation and reactions", "mechanism of dehydration of alcohols", "Reimer-Tiemann reaction", "Aldehydes and Ketones carbonyl properties", "nucleophilic addition (HCN, NH3, Grignard)", "oxidation and reduction (Wolf-Kishner, Clemmensen)", "Aldol condensation", "Cannizzaro reaction", "Haloform reaction", "Carboxylic Acids strength"] },
              { id: "c18", name: "Organic Compounds Containing Nitrogen", concepts: ["Amines preparation, properties and nomenclature", "identification of primary, secondary and tertiary amines", "Diazonium Salts importance"] },
              { id: "c19", name: "Biomolecules", concepts: ["Carbohydrates classification", "monosaccharides (glucose, fructose)", "disaccharides", "Proteins alpha-amino acids", "peptide bond", "protein structure (primary, secondary, tertiary)", "denaturation", "enzymes", "Vitamins classification", "Nucleic Acids DNA and RNA", "Hormones introduction"] },
              { id: "c20", name: "Principles Related to Practical Chemistry", concepts: ["Detection of functional groups (hydroxyl, carbonyl, carboxyl, amino)", "Preparation of Mohr's salt, potash alum", "Preparation of Acetanilide, p-nitroacetanilide, aniline yellow, iodoform", "Titrimetric exercises (oxalic acid vs KMnO4, Mohr's salt vs KMnO4)", "Qualitative salt analysis (Cations, Anions)", "Experiments (Enthalpy of solution, neutralization, lyophilic sols, reaction kinetics)"] }
            ]
          },
          {
            name: "Physics",
            icon: "⚛️",
            color: "text-blue-500 bg-blue-500/10",
            chapters: [
              { id: "p1", name: "Physics and Measurement", concepts: ["Units of measurements", "System of Units", "S I Units", "fundamental and derived units", "least count", "significant figures", "Errors in measurements", "Dimensions of Physics quantities", "dimensional analysis and its applications"] },
              { id: "p2", name: "Kinematics", concepts: ["Frame of reference", "motion in a straight line", "Position-time graph", "speed and velocity", "Uniform and non-uniform motion", "average speed and instantaneous velocity", "uniformly accelerated motion", "velocity-time graph", "position-time graph", "relations for uniformly accelerated motion", "Scalars and Vectors", "Vector addition and subtraction", "scalar and vector products", "Unit Vector", "Resolution of a Vector", "Relative Velocity", "Motion in a plane", "Projectile Motion", "Uniform Circular Motion"] },
              { id: "p3", name: "Laws of Motion", concepts: ["Force and inertia", "Newton's First law of motion", "Momentum", "Newton's Second law of motion", "Impulses", "Newton's Third law of motion", "Law of conservation of linear momentum and its applications", "Equilibrium of concurrent forces", "Static and Kinetic friction", "laws of friction", "rolling friction", "Dynamics of uniform circular motion", "centripetal force and its applications"] },
              { id: "p4", name: "Work, Energy, and Power", concepts: ["Work done by a constant force and a variable force", "kinetic and potential energies", "work-energy theorem", "power", "Potential energy of spring", "conservation of mechanical energy", "conservative and non-conservative forces", "motion in a vertical circle", "Elastic and inelastic collisions in one and two dimensions"] },
              { id: "p5", name: "Rotational Motion", concepts: ["Centre of mass of a two-particle system", "Centre of mass of a rigid body", "Basic concepts of rotational motion", "moment of a force", "torque", "angular momentum", "conservation of angular momentum and its applications", "Moment of inertia", "radius of gyration", "values of moments of inertia for simple geometrical objects", "parallel and perpendicular axes theorems", "Equilibrium of rigid bodies", "rigid body rotation", "equations of rotational motion", "comparison of linear and rotational motions"] },
              { id: "p6", name: "Gravitation", concepts: ["Universal law of gravitation", "Acceleration due to gravity and its variation with altitude and depth", "Kepler's law of planetary motion", "Gravitational potential energy", "gravitational potential", "Escape velocity", "Motion of a satellite", "orbital velocity", "time period and energy of satellite"] },
              { id: "p7", name: "Properties of Solids and Liquids", concepts: ["Elastic behaviour", "Stress-strain relationship", "Hooke's Law", "Young's modulus", "bulk modulus", "modulus of rigidity", "Pressure due to a fluid column", "Pascal's law and its applications", "Effect of gravity on fluid pressure", "Viscosity", "Stokes' law", "terminal velocity", "streamline and turbulent flow", "critical velocity", "Bernoulli's principle and its applications", "Surface energy and surface tension", "angle of contact", "excess of pressure across a curved surface", "application of surface tension (drops, bubbles)", "capillary rise", "Heat", "temperature", "thermal expansion", "specific heat capacity", "calorimetry", "change of state", "latent heat", "Heat transfer (conduction, convection, radiation)"] },
              { id: "p8", name: "Thermodynamics", concepts: ["Thermal equilibrium", "zeroth law of thermodynamics", "concept of temperature", "Heat, work and internal energy", "First law of thermodynamics", "isothermal and adiabatic processes", "Second law of thermodynamics", "reversible and irreversible processes"] },
              { id: "p9", name: "Kinetic Theory of Gases", concepts: ["Equation of state of a perfect gas", "work done on compressing a gas", "Kinetic theory of gases assumptions", "concept of pressure", "Kinetic interpretation of temperature", "RMS speed of gas molecules", "Degrees of freedom", "Law of equipartition of energy", "specific heat capacities of gases", "Mean free path", "Avogadro's number"] },
              { id: "p10", name: "Oscillations and Waves", concepts: ["Oscillations and periodic motion", "time period", "frequency", "displacement as a function of time", "Periodic functions", "Simple harmonic motion (SHM) and its equation", "phase", "oscillations of a spring", "restoring force and force constant", "energy in SHM (Kinetic and potential)", "Simple pendulum derivation for time period", "Wave motion", "Longitudinal and transverse waves", "speed of travelling wave", "Displacement relation for progressive wave", "Principle of superposition of waves", "reflection of waves", "Standing waves in strings and organ pipes", "fundamental mode and harmonics", "Beats"] },
              { id: "p11", name: "Electrostatics", concepts: ["Electric charges", "Conservation of charge", "Coulomb's law", "superposition principle", "continuous charge distribution", "Electric field due to a point charge", "Electric field lines", "Electric dipole and field", "Torque on a dipole", "Electric flux", "Gauss's law and applications", "Electric potential", "potential difference", "Equipotential surfaces", "Electrical potential energy", "Conductors and insulators", "Dielectrics and electric polarization", "Capacitors and capacitances", "Capacitors in series and parallel", "Parallel plate capacitor", "Energy stored in a capacitor"] },
              { id: "p12", name: "Current Electricity", concepts: ["Electric current", "Drift velocity", "mobility", "Ohm's law", "Electrical resistance", "V-I characteristics", "Electrical energy and power", "Electrical resistivity and conductivity", "Resistors in series and parallel", "Temperature dependence of resistance", "Internal resistance of a cell", "potential difference and emf", "Kirchhoff's laws and applications", "Wheatstone bridge", "Metre Bridge"] },
              { id: "p13", name: "Magnetic Effects of Current and Magnetism", concepts: ["Biot-Savart law and application", "Ampere's law and applications", "Force on a moving charge", "Force on a current-carrying conductor", "Force between two parallel currents", "Torque on a current loop", "Moving coil galvanometer", "magnetic dipole moment", "Bar magnet as equivalent solenoid", "magnetic field lines", "Magnetic field of a dipole", "Torque on a magnetic dipole", "Para-, dia- and ferromagnetic substances", "effect of temperature on magnetic properties"] },
              { id: "p14", name: "Electromagnetic Induction and Alternating Currents", concepts: ["Electromagnetic induction", "Faraday's law", "Induced emf and current", "Lenz's Law", "Eddy currents", "Self and mutual inductance", "Alternating currents", "peak and RMS values", "reactance and impedance", "LCR series circuit", "resonance", "power in AC circuits", "wattless current", "AC generator and transformer"] },
              { id: "p15", name: "Electromagnetic Waves", concepts: ["Displacement current", "Electromagnetic waves characteristics", "Transverse nature of EM waves", "Electromagnetic spectrum (radio, micro, IR, visible, UV, X-ray, gamma)", "Applications of e.m. waves"] },
              { id: "p16", name: "Optics", concepts: ["Reflection of light", "spherical mirrors", "mirror formula", "Refraction of light", "thin lens formula", "lens maker formula", "Total internal reflection and applications", "Magnification", "Power of a Lens", "Combination of thin lenses", "Refraction through a prism", "Microscope and Astronomical Telescope", "Wave optics wavefront", "Huygens' principle", "Laws of reflection and refraction", "Interference", "Young's double-slit experiment", "Diffraction due to a single slit", "Polarization", "Brewster's law", "uses of polarized light"] },
              { id: "p17", name: "Dual Nature of Matter and Radiation", concepts: ["Dual nature of radiation", "Photoelectric effect", "Hertz and Lenard's observations", "Einstein's photoelectric equation", "particle nature of light", "Matter waves", "de Broglie relation"] },
              { id: "p18", name: "Atoms and Nuclei", concepts: ["Alpha-particle scattering", "Rutherford's model of atom", "Bohr model", "energy levels", "hydrogen spectrum", "Composition and size of nucleus", "atomic masses", "Mass-energy relation", "mass defect", "binding energy per nucleon", "nuclear fission and fusion"] },
              { id: "p19", name: "Electronic Devices", concepts: ["Semiconductors", "semiconductor diode", "I-V characteristics", "diode as a rectifier", "I-V of LED", "photodiode", "solar cell", "Zener diode as voltage regulator", "Logic gates (OR, AND, NOT, NAND, NOR)"] },
              { id: "p20", name: "Experimental Skills", concepts: ["Vernier calipers", "Screw gauge", "Simple Pendulum energy graph", "Metre Scale moments", "Young's modulus of metallic wire", "Surface tension by capillary rise", "Viscosity by terminal velocity", "Speed of sound using resonance tube", "Specific heat capacity of solid/liquid", "Resistivity of wire using metre bridge", "Resistance using Ohm's law", "Resistance/figure of merit of galvanometer", "Focal length of mirrors/lens", "Plot of angle of deviation for prism", "Refractive index of glass slab", "Characteristic curves of p-n junction", "Zener diode curves", "Identification of Diode, LED, Resistor, Capacitor"] }
            ]
          }
        ]
      },
      {
        examName: "JEE Main 2026",
        category: "Engineering",
        conductedBy: "NTA",
        registrationDeadline: "2025-11-30",
        examDate: "2026-01-22",
        status: "Registration Open",
        eligibility: "Class 12 with PCM (75%+)",
        website: "jeemain.nta.nic.in",
        studentsEnrolled: 32,
        studentsCleared: 8,
        schoolId,
        teacherId,
        syllabus: [
          {
            name: "Mathematics",
            icon: "📐",
            color: "text-purple-500 bg-purple-500/10",
            chapters: [
              { id: "jm1", name: "Calculus", concepts: ["Limits, Continuity & Differentiability", "Integral Calculus", "Differential Equations"] },
              { id: "jm2", name: "Algebra", concepts: ["Matrices & Determinants", "Quadratic Equations", "Probability", "Complex Numbers"] }
            ]
          },
          {
            name: "Physics",
            icon: "⚛️",
            color: "text-blue-500 bg-blue-500/10",
            chapters: [
              { id: "jp1", name: "Mechanics", concepts: ["Kinematics", "Laws of Motion & Work", "Rotational Dynamics"] }
            ]
          }
        ]
      },
      {
        examName: "TNPSC Group IV",
        category: "Civil Services",
        conductedBy: "TNPSC",
        registrationDeadline: "2025-08-20",
        examDate: "2025-10-12",
        status: "Upcoming",
        eligibility: "Class 10 / +2 pass",
        website: "tnpsc.gov.in",
        studentsEnrolled: 18,
        studentsCleared: 0,
        schoolId,
        teacherId,
      },
    ]
  });
  console.log("✅ Seeded Competitive Exams.");

  // 6. Exam Schedules (Real PostgreSQL class-based date sheets)
  await prisma.examSchedule.deleteMany({});
  
  if (school) {
    const targetSchools = Array.from(new Set([school.id, school.dise].filter(Boolean)));
    const scheduleItems: any[] = [];

    for (const sId of targetSchools) {
      scheduleItems.push(
        // Class 11 Schedules
        {
          schoolId: sId,
          title: "Quarterly Examination - Mathematics",
          examType: "Unit Test",
          class: "11",
          section: "All",
          subject: "Mathematics",
          examDate: new Date("2026-08-10T09:30:00Z"),
          startTime: "09:30 AM",
          endTime: "12:30 PM",
          maxMarks: 100,
          passMark: 35,
          venue: "Block A - Hall 1",
          invigilator: "Diya Nair",
          academicYear: "2026-27",
          status: "Scheduled",
          examMode: "Theory",
          theoryMaxMarks: 100,
          practicalMaxMarks: 0,
          published: true,
        },
        {
          schoolId: sId,
          title: "Quarterly Examination - Physics",
          examType: "Quarterly",
          class: "11",
          section: "All",
          subject: "Physics",
          examDate: new Date("2026-08-12T09:30:00Z"),
          startTime: "09:30 AM",
          endTime: "12:30 PM",
          maxMarks: 100,
          passMark: 35,
          venue: "Block B - Hall 3",
          invigilator: "Kavitha R",
          academicYear: "2026-27",
          status: "Scheduled",
          examMode: "Both",
          theoryMaxMarks: 70,
          practicalMaxMarks: 30,
          published: true,
        },
        {
          schoolId: sId,
          title: "Quarterly Examination - Chemistry",
          examType: "Quarterly",
          class: "11",
          section: "All",
          subject: "Chemistry",
          examDate: new Date("2026-08-14T09:30:00Z"),
          startTime: "09:30 AM",
          endTime: "12:30 PM",
          maxMarks: 100,
          passMark: 35,
          venue: "Block B - Hall 3",
          invigilator: "Suresh M",
          academicYear: "2026-27",
          status: "Scheduled",
          examMode: "Both",
          theoryMaxMarks: 70,
          practicalMaxMarks: 30,
          published: true,
        },
        {
          schoolId: sId,
          title: "Quarterly Examination - Accountancy",
          examType: "Quarterly",
          class: "11",
          section: "All",
          subject: "Accountancy",
          examDate: new Date("2026-08-16T09:30:00Z"),
          startTime: "09:30 AM",
          endTime: "12:30 PM",
          maxMarks: 100,
          passMark: 35,
          venue: "Block C - Hall 2",
          invigilator: "Ramesh K",
          academicYear: "2026-27",
          status: "Scheduled",
          examMode: "Theory",
          theoryMaxMarks: 100,
          practicalMaxMarks: 0,
          published: true,
        },

        // Class 10 Schedules
        {
          schoolId: sId,
          title: "SSLC Model Exam - Mathematics",
          examType: "Model",
          class: "10",
          section: "All",
          subject: "Mathematics",
          examDate: new Date("2026-08-10T09:30:00Z"),
          startTime: "09:30 AM",
          endTime: "12:30 PM",
          maxMarks: 100,
          passMark: 35,
          venue: "Hall 1",
          invigilator: "Anitha S",
          academicYear: "2026-27",
          status: "Scheduled",
          examMode: "Theory",
          theoryMaxMarks: 100,
          practicalMaxMarks: 0,
          published: true,
        },
        {
          schoolId: sId,
          title: "SSLC Model Exam - Science",
          examType: "Model",
          class: "10",
          section: "All",
          subject: "Science",
          examDate: new Date("2026-08-12T09:30:00Z"),
          startTime: "09:30 AM",
          endTime: "12:30 PM",
          maxMarks: 100,
          passMark: 35,
          venue: "Hall 2",
          invigilator: "Ramesh K",
          academicYear: "2026-27",
          status: "Scheduled",
          examMode: "Theory",
          theoryMaxMarks: 100,
          practicalMaxMarks: 0,
          published: true,
        },

        // Class 12 Schedules
        {
          schoolId: sId,
          title: "HSC Board Model Exam - Physics",
          examType: "Model",
          class: "12",
          section: "All",
          subject: "Physics",
          examDate: new Date("2026-08-11T09:30:00Z"),
          startTime: "09:30 AM",
          endTime: "12:30 PM",
          maxMarks: 100,
          passMark: 35,
          venue: "Hall A",
          invigilator: "Rajesh Kumar",
          academicYear: "2026-27",
          status: "Scheduled",
          examMode: "Both",
          theoryMaxMarks: 70,
          practicalMaxMarks: 30,
          published: true,
        },

        // Class 9 Schedules
        {
          schoolId: sId,
          title: "First Mid-Term Exam - Science",
          examType: "Unit Test",
          class: "9",
          section: "All",
          subject: "Science",
          examDate: new Date("2026-08-10T09:30:00Z"),
          startTime: "09:30 AM",
          endTime: "12:00 PM",
          maxMarks: 100,
          passMark: 35,
          venue: "Classroom 9A",
          invigilator: "Staff",
          academicYear: "2026-27",
          status: "Scheduled",
          examMode: "Theory",
          theoryMaxMarks: 100,
          practicalMaxMarks: 0,
          published: true,
        }
      );
    }

    await prisma.examSchedule.createMany({ data: scheduleItems, skipDuplicates: true });
    console.log(`✅ Seeded ${scheduleItems.length} real PostgreSQL Exam Schedules.`);
  }

  console.log("🌱 Seeding finished successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
