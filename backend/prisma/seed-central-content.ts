/// <reference types="node" />
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Centralized Content for TN Schools...");

  // 1. Clear existing centralized content to avoid duplicates (optional, safe clean)
  try {
    await prisma.centralContent.deleteMany();
    await prisma.centralTopic.deleteMany();
    await prisma.centralUnit.deleteMany();
    await prisma.centralSubject.deleteMany();
    console.log("🧹 Cleaned existing centralized content tables.");
  } catch (err) {
    console.log("⚠️ Failed to clear tables (might not exist yet):", String(err));
  }

  // 2. Class 10 subjects seed data
  const subjectsData = [
    {
      class: "10",
      name: "Mathematics",
      icon: "📐",
      color: "#6366f1", // Indigo
      applicableGroups: [],
      units: [
        {
          unitNumber: 1,
          name: "Relations and Functions",
          topics: [
            {
              topicNumber: 1,
              name: "Cartesian Product",
              contents: [
                {
                  contentType: "SUMMARY",
                  title: "AI Concept Summary: Cartesian Product",
                  fileContent: "The Cartesian product of two non-empty sets A and B is the set of all ordered pairs (a, b) such that a belongs to A and b belongs to B. It is denoted by A × B. Conceptually, it represents all possible pairings between two categories, akin to coordinates on a grid or matrix. The number of elements in A × B is the product of the number of elements in A and B (i.e., n(A × B) = n(A) × n(B))."
                },
                {
                  contentType: "NOTES",
                  title: "Revision Notes: Cartesian Product Rules",
                  fileContent: "✏️ Key Formulas & Properties:\n\n1. Definition: A × B = { (a, b) | a ∈ A, b ∈ B }\n2. Non-Commutativity: In general, A × B ≠ B × A. They are equal if and only if A = B.\n3. Empty Set: If either A or B is empty (Ø), then A × B = Ø.\n4. Cardinality: If n(A) = p and n(B) = q, then n(A × B) = pq.\n5. Graphical representation: Can be plotted on a Cartesian coordinate plane as discrete points."
                },
                {
                  contentType: "PDF",
                  title: "Official TN Board Chapter Extract - Relations & Functions",
                  fileUrl: "https://www.textbookcorp.tn.gov.in/pdf/10th-Maths-EM.pdf"
                },
                {
                  contentType: "PPT",
                  title: "Visual Guide: Interactive Cartesian Pairs",
                  fileUrl: "https://www.slideshare.net/placeholder-tn-maths-cartesian"
                },
                {
                  contentType: "MCQ",
                  title: "Mastery Quiz: Cartesian Products",
                  mcqs: [
                    {
                      question: "If A = {1, 2} and B = {a, b}, what is the set A × B?",
                      options: [
                        "A) {(1, a), (1, b), (2, a), (2, b)}",
                        "B) {(a, 1), (b, 1), (a, 2), (b, 2)}",
                        "C) {(1, 2), (a, b)}",
                        "D) {(1, a), (2, b)}"
                      ],
                      answer: "A) {(1, a), (1, b), (2, a), (2, b)}",
                      rationale: "By definition, A × B contains ordered pairs where the first element is from A and the second element is from B. Pairing 1 with a and b gives (1,a), (1,b). Pairing 2 with a and b gives (2,a), (2,b)."
                    },
                    {
                      question: "If n(A × B) = 15 and n(A) = 3, then what is n(B)?",
                      options: [
                        "A) 3",
                        "B) 5",
                        "C) 12",
                        "D) 45"
                      ],
                      answer: "B) 5",
                      rationale: "We know that n(A × B) = n(A) × n(B). Given 15 = 3 × n(B), dividing both sides by 3 yields n(B) = 5."
                    },
                    {
                      question: "If A × B = Ø, which of the following is true?",
                      options: [
                        "A) Both A and B must be non-empty",
                        "B) Either A = Ø or B = Ø (or both)",
                        "C) A = B",
                        "D) A and B are equal to {0}"
                      ],
                      answer: "B) Either A = Ø or B = Ø (or both)",
                      rationale: "The Cartesian product is empty if and only if there are no elements to pair. This happens if at least one of the sets is empty."
                    }
                  ]
                }
              ]
            },
            {
              topicNumber: 2,
              name: "Relations & Domain",
              contents: [
                {
                  contentType: "SUMMARY",
                  title: "AI Concept Summary: Relations & Functions",
                  fileContent: "A relation R from a non-empty set A to a non-empty set B is a subset of the Cartesian product A × B. The relation is established by specifying a connection between the first element and the second element of the ordered pairs in A × B. The set of all first elements in the ordered pairs of R is called the Domain, and the set of all second elements is called the Range. The entire set B is called the Codomain. The Range is always a subset of the Codomain."
                },
                {
                  contentType: "MCQ",
                  title: "Mastery Quiz: Domain and Range",
                  mcqs: [
                    {
                      question: "Let A = {1, 2, 3} and B = {4, 5}. If R = {(1, 4), (2, 5)}, what is the Domain of R?",
                      options: [
                        "A) {4, 5}",
                        "B) {1, 2}",
                        "C) {1, 2, 3}",
                        "D) {1, 4}"
                      ],
                      answer: "B) {1, 2}",
                      rationale: "The domain of a relation R is the set of all first components of the ordered pairs. Here, the first components are 1 and 2, so Domain(R) = {1, 2}."
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          unitNumber: 2,
          name: "Algebra",
          topics: [
            {
              topicNumber: 1,
              name: "Quadratic Equations",
              contents: [
                {
                  contentType: "SUMMARY",
                  title: "AI Concept Summary: Quadratic Equations",
                  fileContent: "A quadratic equation is a second-degree polynomial equation in a single variable, written in the standard form: ax² + bx + c = 0, where a, b, and c are real constants and a ≠ 0. The solutions to a quadratic equation are called roots or zeros, and they can be found using factorization, completing the square, or the quadratic formula: x = [-b ± √(b² - 4ac)] / (2a). The nature of the roots is determined by the discriminant, Δ = b² - 4ac."
                },
                {
                  contentType: "NOTES",
                  title: "Revision Notes: Nature of Roots",
                  fileContent: "🔍 Nature of Roots rules based on Discriminant Δ = b² - 4ac:\n\n1. If Δ > 0 and a perfect square: Roots are real, rational, and unequal.\n2. If Δ > 0 and not a perfect square: Roots are real, irrational, and unequal.\n3. If Δ = 0: Roots are real, rational, and equal (x = -b/2a).\n4. If Δ < 0: Roots are non-real/imaginary (no real roots exist)."
                },
                {
                  contentType: "MCQ",
                  title: "Mastery Quiz: Quadratic Equations",
                  mcqs: [
                    {
                      question: "What is the discriminant of the quadratic equation 2x² - 5x + 3 = 0?",
                      options: [
                        "A) 1",
                        "B) 49",
                        "C) -1",
                        "D) 25"
                      ],
                      answer: "A) 1",
                      rationale: "Here, a=2, b=-5, c=3. The discriminant Δ = b² - 4ac = (-5)² - 4(2)(3) = 25 - 24 = 1."
                    },
                    {
                      question: "If the discriminant Δ = 0, the roots of the quadratic equation are:",
                      options: [
                        "A) Real and unequal",
                        "B) Real and equal",
                        "C) Imaginary",
                        "D) Undefined"
                      ],
                      answer: "B) Real and equal",
                      rationale: "When Δ = b² - 4ac = 0, the square root term in the quadratic formula disappears, leaving a single repeating root x = -b / 2a."
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    {
      class: "10",
      name: "Science",
      icon: "🔬",
      color: "#10b981", // Emerald
      applicableGroups: [],
      units: [
        {
          unitNumber: 1,
          name: "Laws of Motion",
          topics: [
            {
              topicNumber: 1,
              name: "Newton's First Law and Inertia",
              contents: [
                {
                  contentType: "SUMMARY",
                  title: "AI Concept Summary: Newton's First Law",
                  fileContent: "Newton's First Law of Motion, also known as the Law of Inertia, states that every body continues in its state of rest or of uniform motion in a straight line unless it is compelled to change that state by forces impressed upon it. Inertia is the inherent property of a body to resist any change in its state of rest or state of uniform motion."
                },
                {
                  contentType: "NOTES",
                  title: "Revision Notes: Types of Inertia",
                  fileContent: "🏃‍♂️ Inertia can be classified into three types:\n\n1. Inertia of Rest: The resistance of a body to change its state of rest (e.g., when a bus starts suddenly, passengers fall backward).\n2. Inertia of Motion: The resistance of a body to change its state of uniform motion (e.g., an athlete runs some distance before jumping).\n3. Inertia of Direction: The resistance of a body to change its direction of motion (e.g., when a car makes a sharp turn, passengers are thrown outwards)."
                },
                {
                  contentType: "MCQ",
                  title: "Mastery Quiz: Inertia and Motion",
                  mcqs: [
                    {
                      question: "Which physical quantity is a measure of inertia?",
                      options: [
                        "A) Velocity",
                        "B) Acceleration",
                        "C) Mass",
                        "D) Force"
                      ],
                      answer: "C) Mass",
                      rationale: "Mass is the quantitative measure of inertia. A heavier body has more inertia (requires more force to accelerate) compared to a lighter body."
                    },
                    {
                      question: "A passenger in a moving bus leans forward when the bus brakes suddenly. This is due to:",
                      options: [
                        "A) Inertia of rest",
                        "B) Inertia of motion",
                        "C) Inertia of direction",
                        "D) Gravitational pull"
                      ],
                      answer: "B) Inertia of motion",
                      rationale: "The passenger's lower body stops with the bus, but their upper body tends to continue in motion due to inertia of motion, causing them to lean forward."
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    {
      class: "10",
      name: "Social Science",
      icon: "🌍",
      color: "#ec4899", // Pink
      applicableGroups: [],
      units: [
        {
          unitNumber: 1,
          name: "History: Outbreak of World War I",
          topics: [
            {
              topicNumber: 1,
              name: "Causes of World War I",
              contents: [
                {
                  contentType: "SUMMARY",
                  title: "AI Concept Summary: World War I Origins",
                  fileContent: "World War I (1914–1918) was a global conflict triggered by a complex network of alliances, imperial rivalry, militarism, and nationalism in Europe. The immediate cause of the war was the assassination of Archduke Franz Ferdinand of Austria in Sarajevo on June 28, 1914, which led to a diplomatic crisis and a series of mobilizations culminating in war."
                },
                {
                  contentType: "MCQ",
                  title: "Mastery Quiz: World War I",
                  mcqs: [
                    {
                      question: "What was the immediate spark that triggered World War I?",
                      options: [
                        "A) The sinking of the Lusitania",
                        "B) The assassination of Archduke Franz Ferdinand",
                        "C) The signing of the Treaty of Versailles",
                        "D) Germany's invasion of Belgium"
                      ],
                      answer: "B) The assassination of Archduke Franz Ferdinand",
                      rationale: "The assassination of Archduke Franz Ferdinand of Austria-Hungary by a Serbian nationalist on June 28, 1914 set off a chain reaction of alliances leading to war."
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    {
      class: "11",
      name: "Physics",
      icon: "🔬",
      color: "#8b5cf6",
      applicableGroups: ["Biology", "Computer Science"],
      units: [
        {
          unitNumber: 1,
          name: "Nature of Physical World and Measurement",
          topics: [
            {
              topicNumber: 1,
              name: "Errors in Measurement",
              contents: [
                {
                  contentType: "SUMMARY",
                  title: "AI Concept Summary: Errors in Measurement",
                  fileContent: "Error in measurement is the difference between the true value and the measured value of a physical quantity. Errors are broadly classified into:\n\n1. Systematic Errors: Instrumental, personal, external, or procedural errors which are reproducible and have a definite pattern.\n2. Random Errors: Irregular errors caused by unpredictable fluctuations in experimental conditions.\n3. Gross Errors: Caused by sheer carelessness of the observer.\n\nTo minimize errors, measurements should be repeated multiple times and the arithmetic mean should be calculated."
                },
                {
                  contentType: "NOTES",
                  title: "Revision Notes: Errors Calculations",
                  fileContent: "📐 Key Mathematical Formulas for Errors:\n\n1. Absolute Error: Δa_i = |a_mean - a_i|\n2. Mean Absolute Error: Δa_mean = (Σ|Δa_i|) / n\n3. Relative Error: (Δa_mean) / a_mean\n4. Percentage Error: (Δa_mean / a_mean) * 100%\n\n💡 Tip: Systemic errors are constant and can be eliminated by standardizing instruments, whereas random errors can only be minimized by taking a large number of readings and computing their average."
                },
                {
                  contentType: "PDF",
                  title: "TN 11th Physics Book Extract - Measurement Chapter",
                  fileUrl: "https://www.textbookcorp.tn.gov.in/pdf/11th-Physics-Vol1-EM.pdf"
                },
                {
                  contentType: "MCQ",
                  title: "Mastery Quiz: Errors in Measurement",
                  mcqs: [
                    {
                      question: "Which of the following errors can be eliminated by modifying instruments or calibration?",
                      options: [
                        "A) Random Error",
                        "B) Systematic Error",
                        "C) Gross Error",
                        "D) Absolute Error"
                      ],
                      answer: "B) Systematic Error",
                      rationale: "Systematic errors are reproducible and constant, occurring due to faults in instruments or experimental methods. Hence, recalibrating the instruments can completely eliminate them."
                    },
                    {
                      question: "If a measurement is repeated multiple times, the average of all measurements helps minimize:",
                      options: [
                        "A) Systematic Error",
                        "B) Random Error",
                        "C) Personal Error",
                        "D) Instrumental Error"
                      ],
                      answer: "B) Random Error",
                      rationale: "Random errors are irregular and follow normal distribution. Taking the arithmetic mean of a large number of readings reduces the net random error."
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    {
      class: "11",
      name: "Computer Science",
      icon: "💻",
      color: "#3b82f6",
      applicableGroups: ["Computer Science"],
      units: [
        {
          unitNumber: 1,
          name: "Introduction to Computers",
          topics: [
            {
              topicNumber: 1,
              name: "Generations of Computers",
              contents: [
                {
                  contentType: "SUMMARY",
                  title: "AI Concept Summary: Generations of Computers",
                  fileContent: "Computer history is divided into five generations, each marked by a key technological leap in component size, processing power, and software interfaces:\n\n- First Generation (1940-1956): Vacuum Tubes (ENIAC, UNIVAC)\n- Second Generation (1956-1963): Transistors (IBM 1401, COBOL/FORTRAN)\n- Third Generation (1963-1971): Integrated Circuits (ICs)\n- Fourth Generation (1971-Present): Microprocessors (VLSI/ULSI, Personal Computers)\n- Fifth Generation (Now/Future): Artificial Intelligence & Parallel Processing"
                },
                {
                  contentType: "NOTES",
                  title: "Revision Notes: Computer Components Timeline",
                  fileContent: "💻 Quick Tech Reference Map:\n\n- Vacuum Tubes (1st Gen): Generates intense heat, requires massive space.\n- Transistors (2nd Gen): Replaced vacuum tubes; smaller, faster, and more energy-efficient.\n- Integrated Circuits (3rd Gen): Placed multiple transistors on silicon chips, introducing keyboards, monitors, and OS.\n- Microprocessors (4th Gen): Placed millions of circuits on a single chip; birth of the Internet and PCs.\n- AI / ULSI (5th Gen): Voice activation, robotics, neural networks."
                },
                {
                  contentType: "MCQ",
                  title: "Mastery Quiz: Computer Generations",
                  mcqs: [
                    {
                      question: "Which electronic component characterizes the third generation of computers?",
                      options: [
                        "A) Vacuum Tubes",
                        "B) Transistors",
                        "C) Integrated Circuits",
                        "D) Microprocessors"
                      ],
                      answer: "C) Integrated Circuits",
                      rationale: "Integrated Circuits (ICs) were introduced in the third generation, placing multiple electrical components onto small silicon chips."
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    {
      class: "10",
      name: "English",
      icon: "📖",
      color: "#f59e0b",
      applicableGroups: [],
      units: [
        {
          unitNumber: 1,
          name: "Prose: His First Flight",
          topics: [
            {
              topicNumber: 1,
              name: "Story Overview & Vocabulary",
              contents: [
                {
                  contentType: "SUMMARY",
                  title: "AI Concept Summary: His First Flight",
                  fileContent: "His First Flight by Liam O'Flaherty is a symbolic story about a young seagull who is afraid to fly. His family tries to encourage and threaten him to take his first flight, but his fear overcomes him. Eventually, driven by extreme hunger, he dives for the fish his mother holds and successfully spreads his wings to fly, discovering his innate potential and conquering his fear."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      class: "10",
      name: "Tamil",
      icon: "🗣️",
      color: "#d97706",
      applicableGroups: [],
      units: [
        {
          unitNumber: 1,
          name: "அன்னை மொழியே",
          topics: [
            {
              topicNumber: 1,
              name: "செய்யுள் விளக்கம்",
              contents: [
                {
                  contentType: "SUMMARY",
                  title: "AI Concept Summary: அன்னை மொழியே",
                  fileContent: "பாவலரேறு பெருஞ்சித்திரனாரின் 'அன்னை மொழியே' கவிதை தமிழ் மொழியின் தொன்மை, சிறப்பு, மற்றும் அதன் இலக்கிய வளம் ஆகியவற்றை விளக்குகிறது. அன்னைத் தமிழ் எழில் நிறைந்ததாகவும், பழமைக்கு பழமையாய்த் தோன்றிய நறுங்கனியாகவும் திகழ்கிறது என்று போற்றுகிறார்."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      class: "10",
      name: "Chemistry",
      icon: "🧪",
      color: "#db2777",
      applicableGroups: ["Biology", "Computer Science"],
      units: [
        {
          unitNumber: 1,
          name: "Atoms and Molecules",
          topics: [
            {
              topicNumber: 1,
              name: "Relative Atomic Mass (RAM)",
              contents: [
                {
                  contentType: "SUMMARY",
                  title: "AI Concept Summary: Relative Atomic Mass",
                  fileContent: "Relative Atomic Mass (RAM) of an element is the ratio of the average mass of its atoms to 1/12th of the mass of a carbon-12 atom. It is denoted as Ar. Carbon-12 is taken as the standard reference scale since 1961."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      class: "10",
      name: "Biology",
      icon: "🧬",
      color: "#22c55e",
      applicableGroups: ["Biology"],
      units: [
        {
          unitNumber: 1,
          name: "Plant Anatomy and Plant Physiology",
          topics: [
            {
              topicNumber: 1,
              name: "Tissue Systems",
              contents: [
                {
                  contentType: "SUMMARY",
                  title: "AI Concept Summary: Tissue Systems",
                  fileContent: "Sachs classified tissue systems in plants into three major types: Epidermal tissue system, Ground/Fundamental tissue system, and Vascular tissue system. Epidermal tissue provides protection, ground tissue forms the bulk of the plant body, and vascular tissue (xylem and phloem) is responsible for transport of water and nutrients."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      class: "10",
      name: "History",
      icon: "📜",
      color: "#b45309",
      applicableGroups: [],
      units: [
        {
          unitNumber: 1,
          name: "Outbreak of World War I and its Aftermath",
          topics: [
            {
              topicNumber: 1,
              name: "Imperialist Rivalries",
              contents: [
                {
                  contentType: "SUMMARY",
                  title: "AI Concept Summary: Imperialist Rivalries",
                  fileContent: "In the late 19th and early 20th centuries, European powers competed fiercely for colonies in Africa and Asia to secure raw materials and markets. This scramble led to conflicts and mutual suspicion among major powers like Britain, Germany, France, and Russia, setting the stage for global conflict."
                }
              ]
            }
          ]
        }
      ]
    }
  ];

  // 3. Insert subjects, units, topics, and contents in transaction to preserve order and links
  for (const sub of subjectsData) {
    const createdSubject = await prisma.centralSubject.create({
      data: {
        class: sub.class,
        name: sub.name,
        icon: sub.icon,
        color: sub.color,
        applicableGroups: (sub as any).applicableGroups || []
      }
    });

    console.log(`✅ Created Subject: ${createdSubject.name} (Class ${createdSubject.class})`);

    for (const unit of sub.units) {
      const createdUnit = await prisma.centralUnit.create({
        data: {
          subjectId: createdSubject.id,
          unitNumber: unit.unitNumber,
          name: unit.name
        }
      });

      console.log(`  └─ Created Unit: Unit ${createdUnit.unitNumber}: ${createdUnit.name}`);

      for (const topic of unit.topics) {
        const createdTopic = await prisma.centralTopic.create({
          data: {
            unitId: createdUnit.id,
            topicNumber: topic.topicNumber,
            name: topic.name
          }
        });

        console.log(`      └─ Created Topic: Topic ${createdTopic.topicNumber}: ${createdTopic.name}`);

        for (const content of topic.contents) {
          const createdContent = await prisma.centralContent.create({
            data: {
              topicId: createdTopic.id,
              contentType: content.contentType,
              title: content.title,
              fileUrl: content.fileUrl || null,
              fileContent: content.fileContent || null,
              mcqs: content.mcqs ? (content.mcqs as any) : null
            }
          });

          console.log(`          └─ Created Content [${createdContent.contentType}]: ${createdContent.title}`);
        }
      }
    }
  }

  console.log("🎉 Seeding Centralized Content completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding Error:", e);
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
