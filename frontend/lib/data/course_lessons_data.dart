import '../models/lesson_content.dart';
import '../models/course.dart';

class CourseLessonsData {
  static final Map<String, List<LessonContent>> _customLessonsByCourseId = {};

  static void setCustomLessons(String courseId, List<LessonContent> lessons) {
    _customLessonsByCourseId[courseId] = lessons;
  }

  static bool hasCustomLessons(String courseId) {
    return _customLessonsByCourseId.containsKey(courseId) &&
        _customLessonsByCourseId[courseId]!.isNotEmpty;
  }

  static List<LessonContent> getLessonsForCourse(Course course) {
    if (_customLessonsByCourseId.containsKey(course.id) &&
        _customLessonsByCourseId[course.id]!.isNotEmpty) {
      return _customLessonsByCourseId[course.id]!;
    }
    final s = '${course.subject} ${course.title}'.toLowerCase();
    if (s.contains('tamil') || s.contains('தமிழ்')) {
      return tamilLessons;
    } else if (s.contains('science') || s.contains('அறிவியல்') || s.contains('safari') || s.contains('space')) {
      return scienceLessons;
    } else if (s.contains('english') || s.contains('ஆங்கிலம்')) {
      return englishLessons;
    } else if (s.contains('social') || s.contains('freedom') || s.contains('history') || s.contains('சமூக')) {
      return socialLessons;
    } else if (s.contains('computer') || s.contains('python') || s.contains('ai') || s.contains('கணினி')) {
      return computerLessons;
    } else if (s.contains('gk') || s.contains('general') || s.contains('knowledge') || s.contains('பொது')) {
      return gkLessons;
    }
    return mathLessons;
  }

  // ================= MATHEMATICS LESSONS (12 TOPICS) =================
  static const List<LessonContent> mathLessons = [
    // 1. Numbers and Place Values
    LessonContent(
      lessonNumber: 1,
      title: 'Numbers and Place Values',
      introPrefix: 'Every number is composed of digits with specific positional values. Understanding place value helps us grasp ',
      highlightTerm1: 'ones & tens',
      highlightTerm2: 'thousands',
      introSuffix: ' to solve real-world problems accurately.',
      leftBadge: 'Place Value',
      leftDescription: 'The numerical value that a digit holds based strictly on its position within a number.',
      rightBadge: 'Face Value',
      rightDescription: 'The actual inherent value of the digit itself, irrespective of where it is positioned.',
      exampleTitle: 'Place & Face Value Examples',
      examples: [
        ExampleBullet(label: 'Place value of 5 in 542', content: '5 × 100 = 500 (5 hundreds)', isPrimary: true),
        ExampleBullet(label: 'Face value of 5 in 542', content: 'Value is simply 5', isPrimary: false),
        ExampleBullet(label: 'Place value of 4 in 542', content: '4 × 10 = 40 (4 tens)', isPrimary: true),
        ExampleBullet(label: 'Expanded form of 542', content: '500 + 40 + 2', isPrimary: false),
      ],
      rememberTitle: 'Key Takeaways',
      rememberPoints: [
        'Place value increases by 10 times with each step to the left.',
        'Zero acts as a vital placeholder; without it 502 would be read as 52.',
        'Face value of a digit always stays constant across all number systems.',
      ],
      thinkQuestion: 'In the number 7,872, what is the difference between the place values of the two 7s?',
      thinkHint: '💡 First 7 is in thousands place (7,000) and second 7 is in tens place (70). Difference = 7,000 - 70 = 6,930.',
      keyFormulas: [
        'Place Value = Face Value × Value of the Place Position',
        'Expanded Form: 3,456 = (3 × 1000) + (4 × 100) + (5 × 10) + (6 × 1)',
        'Indian System: Ones, Tens, Hundreds, Thousands, Ten Thousands, Lakhs, Ten Lakhs, Crores',
        'International System: Ones, Tens, Hundreds, Thousands, Ten Thousands, Hundred Thousands, Millions',
      ],
      quizQuestions: [
        LessonQuizQuestion(
          question: 'In the number 8,492, what is the PLACE VALUE of the digit 4?',
          options: ['4', '40', '400', '4,000'],
          correctAnswerIndex: 2,
          explanation: '4 is in the hundreds position, so its place value is 4 × 100 = 400.',
        ),
        LessonQuizQuestion(
          question: 'What is the difference between the place value and face value of 7 in 752?',
          options: ['700', '693', '7', '0'],
          correctAnswerIndex: 1,
          explanation: 'Place value is 700, face value is 7. Difference = 700 - 7 = 693.',
        ),
      ],
      theorySections: [
        TheorySection(
          heading: '1. Foundational Concept of the Base-10 Decimal System',
          lines: [
            'Our standard mathematical numbering system is a positional base-10 system (decimal system).',
            'It employs ten distinct foundational symbols known as digits: 0, 1, 2, 3, 4, 5, 6, 7, 8, and 9.',
            'The total magnitude of any number is determined entirely by the digits used and their exact positions.',
            'As we move from right to left, each positional place represents a successive power of 10 (1, 10, 100, 1000).',
          ],
        ),
        TheorySection(
          heading: '2. Place Value vs. Face Value Distinction',
          lines: [
            'Face Value represents the absolute, unchangeable value of the digit itself (Face value of 9 is always 9).',
            'Place Value depends entirely on the column or position that the digit occupies in the numeral.',
            'For example, in 9,450: The face value of 9 is 9, but its place value is 9 × 1,000 = 9,000.',
            'In contrast, in 529: The face value of 9 is still 9, but its place value is 9 × 1 = 9 (Ones place).',
          ],
        ),
        TheorySection(
          heading: '3. Comparative Number Systems: Indian vs. International',
          lines: [
            'In the Indian Numeration System, periods are grouped as: Ones (3 digits), Thousands (2 digits), Lakhs (2 digits), Crores (2 digits).',
            'For instance: 4,52,83,190 is read as "Four crore fifty-two lakh eighty-three thousand one hundred ninety".',
            'In the International System, commas group digits in sets of three: Ones (3 digits), Thousands (3 digits), Millions (3 digits).',
            'The same number 45,283,190 is read as "Forty-five million two hundred eighty-three thousand one hundred ninety".',
          ],
        ),
        TheorySection(
          heading: '4. Expanded Form & Decomposition Technique',
          lines: [
            'Expanded notation displays a multi-digit number as the sum of the place values of each of its constituent digits.',
            'Decomposition formula: Number = (d_n × 10ⁿ) + (d_{n-1} × 10ⁿ⁻¹) + ... + (d₁ × 10¹) + (d₀ × 10⁰).',
            'Example: 84,305 = (8 × 10,000) + (4 × 1,000) + (3 × 100) + (0 × 10) + (5 × 1).',
            'This expansion is fundamental for performing mental arithmetic, long addition, and column subtraction.',
          ],
        ),
        TheorySection(
          heading: '5. Practical Applications & Real-World Significance',
          lines: [
            'Currency & Banking: Cheque writing and financial transactions require exact translation between numerals and written words.',
            'Scientific Measurements: Understanding metric prefixes (kilo = 10³, mega = 10⁶, milli = 10⁻³) relies on place value.',
            'Computing & Digital Data: Binary (base-2) and hexadecimal (base-16) systems utilize identical positional value principles.',
            'Rounding & Estimation: Knowing place values is essential to round figures to the nearest tens, hundreds, or thousands.',
          ],
        ),
      ],
    ),

    // 2. Prime and Composite Numbers
    LessonContent(
      lessonNumber: 2,
      title: 'Prime and Composite Numbers',
      introPrefix: 'Whole numbers greater than 1 can be categorized based on their divisibility into ',
      highlightTerm1: 'prime numbers',
      highlightTerm2: 'composite numbers',
      introSuffix: '.',
      leftBadge: 'Prime Numbers',
      leftDescription: 'Positive integers greater than 1 that have exactly two distinct factors: 1 and the number itself.',
      rightBadge: 'Composite Numbers',
      rightDescription: 'Positive integers greater than 1 that have more than two distinct positive factors.',
      exampleTitle: 'Classification Examples',
      examples: [
        ExampleBullet(label: 'Prime examples', content: '2, 3, 5, 7, 11, 13, 17, 19, 23, 29', isPrimary: true),
        ExampleBullet(label: 'Composite examples', content: '4 (factors: 1, 2, 4), 6, 8, 9, 10, 12', isPrimary: false),
        ExampleBullet(label: 'Special case of 2', content: 'The only even prime number in mathematics', isPrimary: true),
        ExampleBullet(label: 'Special case of 1', content: 'Neither prime nor composite (only 1 factor)', isPrimary: false),
      ],
      rememberTitle: 'Essential Rules',
      rememberPoints: [
        'Every natural number greater than 1 can be uniquely factorized into primes (Fundamental Theorem).',
        'All prime numbers except 2 are odd numbers.',
        'Co-prime numbers are any two numbers whose only common factor is 1 (e.g. 8 and 15).',
      ],
      thinkQuestion: 'Is 91 a prime number or a composite number?',
      thinkHint: '💡 91 is divisible by 7 and 13 (7 × 13 = 91). Since it has factors 1, 7, 13, 91, it is a COMPOSITE number.',
      keyFormulas: [
        'Fundamental Theorem: Every composite integer n > 1 can be expressed as n = p₁ᵃ¹ × p₂ᵃ² ... × p_kᵃᵏ',
        'Prime Factorization of 60 = 2² × 3¹ × 5¹',
        'Number of Factors formula: For n = pᵃ × qᵇ, total factors = (a + 1)(b + 1)',
        'Sieve of Eratosthenes: Systematic ancient algorithm to find all primes up to any given limit N',
      ],
      quizQuestions: [
        LessonQuizQuestion(
          question: 'Which of the following is the only EVEN prime number?',
          options: ['0', '1', '2', '4'],
          correctAnswerIndex: 2,
          explanation: '2 has exactly two factors (1 and 2). All other even numbers are divisible by 2 and are composite.',
        ),
        LessonQuizQuestion(
          question: 'Why is the number 1 classified as NEITHER prime nor composite?',
          options: ['It is an odd number', 'It has only one factor (itself)', 'It is negative', 'It cannot be multiplied'],
          correctAnswerIndex: 1,
          explanation: 'By definition, a prime has exactly two distinct factors. 1 has only one positive factor.',
        ),
      ],
      theorySections: [
        TheorySection(
          heading: '1. Definition & Classification of Natural Numbers',
          lines: [
            'A Prime Number is a natural number strictly greater than 1 that cannot be formed by multiplying two smaller natural numbers.',
            'A Composite Number has at least one divisor other than 1 and itself, meaning it can be factored into smaller integers.',
            'The number 1 is a special unit: it has only one positive divisor (1), so by universal definition, 1 is neither prime nor composite.',
            'The sequence of prime numbers starts as: 2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97...',
          ],
        ),
        TheorySection(
          heading: '2. The Fundamental Theorem of Arithmetic',
          lines: [
            'Also known as the Unique Factorization Theorem, this theorem is the cornerstone of number theory.',
            'It states that every integer greater than 1 is either a prime itself or can be represented as the product of prime numbers uniquely.',
            'The prime factorization is unique up to the order of the prime factors.',
            'For example: 360 = 2 × 2 × 2 × 3 × 3 × 5 = 2³ × 3² × 5¹. No other set of prime factors can multiply to produce 360.',
          ],
        ),
        TheorySection(
          heading: '3. Divisibility Tests for Rapid Prime Identification',
          lines: [
            'Divisibility by 2: If the last digit is even (0, 2, 4, 6, 8).',
            'Divisibility by 3: If the sum of all individual digits is divisible by 3 (e.g. 111: 1+1+1=3, divisible by 3).',
            'Divisibility by 5: If the last digit is either 0 or 5.',
            'Divisibility by 7: Double the last digit and subtract it from the remaining truncated number; check if result is divisible by 7.',
            'Divisibility by 11: Difference between sum of odd-place digits and even-place digits is either 0 or a multiple of 11.',
          ],
        ),
        TheorySection(
          heading: '4. Prime Testing Method up to Square Root √N',
          lines: [
            'To test if a positive integer N is prime, you only need to test for divisibility by prime numbers up to √N.',
            'If N has a factor greater than √N, it must also have a corresponding factor smaller than √N.',
            'Example: To check if 101 is prime: √101 ≈ 10.04. Test primes ≤ 10, which are 2, 3, 5, 7.',
            'Since 101 is not divisible by 2, 3, 5, or 7, we conclude with 100% mathematical certainty that 101 is prime.',
          ],
        ),
        TheorySection(
          heading: '5. Modern Applications in Cryptography & Cybersecurity',
          lines: [
            'RSA Encryption: Modern internet security and banking rely directly on the computational difficulty of factoring large prime products.',
            'Public key algorithms generate keys using two massive prime numbers (each hundreds of digits long).',
            'Multiplying two large primes is instant, but factoring their product back into primes takes classical computers thousands of years.',
            'Hash functions and pseudorandom number generators in computer science also leverage prime modular arithmetic.',
          ],
        ),
      ],
    ),

    // 3. Factors and Multiples
    LessonContent(
      lessonNumber: 3,
      title: 'Factors and Multiples',
      introPrefix: 'In mathematics, numbers can be grouped in different ways. Two fundamental building blocks are ',
      highlightTerm1: 'factors',
      highlightTerm2: 'multiples',
      introSuffix: '.',
      leftBadge: 'Factors',
      leftDescription: 'Exact divisors that divide a given number without leaving any remainder.',
      rightBadge: 'Multiples',
      rightDescription: 'Products obtained by multiplying a given number by positive integers (1, 2, 3...).',
      exampleTitle: 'Factors vs. Multiples Demonstration',
      examples: [
        ExampleBullet(label: 'Factors of 12', content: '1, 2, 3, 4, 6, 12 (Finite list)', isPrimary: true),
        ExampleBullet(label: 'Multiples of 4', content: '4, 8, 12, 16, 20, 24, 28... (Infinite list)', isPrimary: false),
        ExampleBullet(label: 'Common factor of 12 & 18', content: '1, 2, 3, 6', isPrimary: true),
        ExampleBullet(label: 'Common multiple of 4 & 6', content: '12, 24, 36, 48...', isPrimary: false),
      ],
      rememberTitle: 'Golden Rules',
      rememberPoints: [
        '1 is a universal factor of every integer.',
        'Every number is a factor of itself and also a multiple of itself.',
        'The number of factors of a finite number is always finite, while the number of multiples is infinite.',
      ],
      thinkQuestion: 'Can a number be both a factor and a multiple of another number at the same time?',
      thinkHint: '💡 Yes, only if the two numbers are identical (e.g. 6 is both a factor of 6 and a multiple of 6).',
      keyFormulas: [
        'Dividend = (Divisor × Quotient) + Remainder (Remainder = 0 for factors)',
        'If a divides b, then b = a × k for some integer k',
        'Total Factors for N = pᵃ × qᵇ is given by (a + 1) × (b + 1)',
        'Sum of Factors formula: σ(N) = (pᵃ⁺¹ - 1)/(p - 1) × (qᵇ⁺¹ - 1)/(q - 1)',
      ],
      quizQuestions: [
        LessonQuizQuestion(
          question: 'How many total factors does the number 12 have?',
          options: ['4 factors', '6 factors (1, 2, 3, 4, 6, 12)', '8 factors', 'Infinite factors'],
          correctAnswerIndex: 1,
          explanation: 'The complete set of factors of 12 is {1, 2, 3, 4, 6, 12}, which is 6 factors.',
        ),
        LessonQuizQuestion(
          question: 'Which of the following is a MULTIPLE of 9?',
          options: ['3', '18', '24', '1'],
          correctAnswerIndex: 1,
          explanation: '9 × 2 = 18. Multiples are generated by multiplying 9 by integers.',
        ),
      ],
      theorySections: [
        TheorySection(
          heading: '1. Theoretical Definition of Factors & Divisibility',
          lines: [
            'A factor of a number is an exact divisor of that number that leaves a remainder of exactly zero.',
            'If an integer a divides another integer b without a remainder, we say "a is a factor of b" or "b is divisible by a".',
            'Every number N > 1 has at least two factors: 1 and N itself.',
            'Factors always come in complementary pairs (e.g. for 24: (1, 24), (2, 12), (3, 8), (4, 6)).',
          ],
        ),
        TheorySection(
          heading: '2. Theoretical Definition of Multiples & Sequence Generation',
          lines: [
            'A multiple of a number is the product obtained when that number is multiplied by any non-zero whole integer.',
            'For any positive integer n, its multiples form an infinite arithmetic progression: n, 2n, 3n, 4n, 5n, 6n...',
            'Every non-zero multiple of a number is greater than or equal to the number itself.',
            'Zero is technically a multiple of every integer because n × 0 = 0.',
          ],
        ),
        TheorySection(
          heading: '3. Comparative Properties Table: Factors vs Multiples',
          lines: [
            'Boundary Limit: Factors of N are always ≤ N; Multiples of N are always ≥ N.',
            'Set Size: The count of factors is always strictly finite; The count of multiples is infinitely large.',
            'Smallest Element: The smallest factor of any number is always 1; The smallest positive multiple is the number itself.',
            'Operation: Finding factors involves division (partitioning); Generating multiples involves multiplication (scaling).',
          ],
        ),
        TheorySection(
          heading: '4. Factor Tree & Prime Factor Decomposition Method',
          lines: [
            'A Factor Tree is a hierarchical diagram used to break a composite number down into its ultimate prime leaves.',
            'Step 1: Write the number at the top and find any two factors that multiply to give the number.',
            'Step 2: If a branch ends in a composite number, continue branching until only prime numbers remain.',
            'Step 3: Collect all terminal prime leaves and express the original number in canonical exponential prime format.',
          ],
        ),
        TheorySection(
          heading: '5. Real-World Applications & Scheduling Problems',
          lines: [
            'Tile Layouts & Architecture: Finding factors determines possible grid dimensions when laying floor tiles without cuts.',
            'Packaging & Manufacturing: Packaging items into equal boxes requires finding common factors of batch sizes.',
            'Traffic Signal Synchronization: Traffic lights and bell chimes repeat their simultaneous activation at common multiples of their interval times.',
          ],
        ),
      ],
    ),

    // 4. Highest Common Factor (HCF / GCD)
    LessonContent(
      lessonNumber: 4,
      title: 'Highest Common Factor (HCF)',
      introPrefix: 'When comparing two or more numbers, the largest factor they share is called the ',
      highlightTerm1: 'common factor',
      highlightTerm2: 'HCF (or GCD)',
      introSuffix: '.',
      leftBadge: 'Common Factors',
      leftDescription: 'Factors that are shared simultaneously between two or more numbers.',
      rightBadge: 'HCF / GCD',
      rightDescription: 'The greatest number that divides each of the given numbers without a remainder.',
      exampleTitle: 'HCF Step-by-Step Calculation',
      examples: [
        ExampleBullet(label: 'Factors of 18', content: '1, 2, 3, 6, 9, 18', isPrimary: true),
        ExampleBullet(label: 'Factors of 24', content: '1, 2, 3, 4, 6, 8, 12, 24', isPrimary: false),
        ExampleBullet(label: 'Shared Factors', content: '1, 2, 3, 6', isPrimary: true),
        ExampleBullet(label: 'HCF(18, 24)', content: '6 (The maximum shared divisor)', isPrimary: false),
      ],
      rememberTitle: 'Important Properties',
      rememberPoints: [
        'HCF is always less than or equal to the smallest of the given numbers.',
        'HCF of two co-prime numbers is always 1.',
        'If one number is a factor of another, the smaller number is their HCF (e.g. HCF(5, 20) = 5).',
      ],
      thinkQuestion: 'What is the HCF of two consecutive natural numbers like 14 and 15?',
      thinkHint: '💡 Any two consecutive integers share no common factors other than 1. Therefore, their HCF is always 1.',
      keyFormulas: [
        'HCF = Product of smallest power of each common prime factor involved in the numbers',
        'Euclid Division Lemma: a = bq + r, then HCF(a, b) = HCF(b, r)',
        'HCF of Fractions = HCF of Numerators / LCM of Denominators',
        'Co-Prime Criterion: HCF(a, b) = 1',
      ],
      quizQuestions: [
        LessonQuizQuestion(
          question: 'What is the HCF (Greatest Common Divisor) of 18 and 24?',
          options: ['2', '3', '6', '12'],
          correctAnswerIndex: 2,
          explanation: 'Factors of 18 = {1,2,3,6,9,18}, Factors of 24 = {1,2,3,4,6,8,12,24}. The greatest common factor is 6.',
        ),
        LessonQuizQuestion(
          question: 'What is the HCF of any two consecutive natural numbers (like 14 and 15)?',
          options: ['0', '1', '2', 'Product of the numbers'],
          correctAnswerIndex: 1,
          explanation: 'Consecutive natural numbers share no common factors other than 1, so their HCF is always 1.',
        ),
      ],
      theorySections: [
        TheorySection(
          heading: '1. Theoretical Definition & Conceptual Meaning of HCF',
          lines: [
            'The Highest Common Factor (HCF), also termed Greatest Common Divisor (GCD), is the largest positive integer that divides two or more integers without leaving a remainder.',
            'It represents the greatest possible unit size into which multiple quantities can be partitioned equally.',
            'For any set of numbers {a₁, a₂, ..., aₙ}, HCF(a₁, ..., aₙ) ≤ min(a₁, ..., aₙ).',
            'If the HCF of two numbers is 1, they are classified as relatively prime or co-prime.',
          ],
        ),
        TheorySection(
          heading: '2. Method 1: Prime Factorization Method',
          lines: [
            'Step 1: Express each given number as a product of its prime factors in exponential power format.',
            'Step 2: Identify the prime factors that are common to all given numbers.',
            'Step 3: For each common prime factor, select the lowest exponent present across the factorizations.',
            'Step 4: Multiply these lowest powers together to obtain the exact HCF.',
            'Example: 72 = 2³ × 3² and 108 = 2² × 3³. Common primes are 2 and 3. HCF = 2² × 3² = 4 × 9 = 36.',
          ],
        ),
        TheorySection(
          heading: '3. Method 2: Euclid’s Division Algorithm (Successive Division)',
          lines: [
            'For larger numbers where prime factorization is tedious, Euclid’s Division Algorithm provides optimal efficiency.',
            'Principle: If a = b × q + r, where 0 ≤ r < b, then HCF(a, b) = HCF(b, r).',
            'Step 1: Divide the larger number by the smaller number to get a quotient and remainder.',
            'Step 2: Make the remainder the new divisor and previous divisor the new dividend.',
            'Step 3: Repeat the division until the remainder becomes zero. The final divisor at this stage is the HCF.',
          ],
        ),
        TheorySection(
          heading: '4. Mathematical Properties of HCF',
          lines: [
            'Commutative & Associative: HCF(a, b) = HCF(b, a) and HCF(a, HCF(b, c)) = HCF(HCF(a, b), c).',
            'Distributive Property: For any positive integer k, HCF(k × a, k × b) = k × HCF(a, b).',
            'Division Invariant: HCF(a/d, b/d) = 1, where d = HCF(a, b). Reducing a fraction by its HCF simplifies it to lowest terms.',
          ],
        ),
        TheorySection(
          heading: '5. Practical Applications & Real-Life Problem Solving',
          lines: [
            'Cutting Materials: Finding the maximum length of measuring tape that can measure lengths like 12m, 18m, and 24m exactly.',
            'Arrangement in Rows: Organizing students from different classes into rows with equal numbers of students without mixing classes.',
            'Fraction Simplification: Dividing numerator and denominator by their HCF guarantees simplification to irreducible form.',
          ],
        ),
      ],
    ),

    // 5. Lowest Common Multiple (LCM)
    LessonContent(
      lessonNumber: 5,
      title: 'Lowest Common Multiple (LCM)',
      introPrefix: 'The smallest non-zero multiple shared between numbers is known as the ',
      highlightTerm1: 'common multiple',
      highlightTerm2: 'LCM',
      introSuffix: '.',
      leftBadge: 'Common Multiples',
      leftDescription: 'Multiples that appear simultaneously in the multiplication tables of all given numbers.',
      rightBadge: 'LCM',
      rightDescription: 'The smallest positive integer that is divisible by all the given numbers without a remainder.',
      exampleTitle: 'LCM Calculation Methods',
      examples: [
        ExampleBullet(label: 'Multiples of 3', content: '3, 6, 9, 12, 15, 18, 21, 24...', isPrimary: true),
        ExampleBullet(label: 'Multiples of 4', content: '4, 8, 12, 16, 20, 24, 28...', isPrimary: false),
        ExampleBullet(label: 'Shared Multiples', content: '12, 24, 36...', isPrimary: true),
        ExampleBullet(label: 'LCM(3, 4)', content: '12 (The smallest positive shared multiple)', isPrimary: false),
      ],
      rememberTitle: 'Fundamental Rules',
      rememberPoints: [
        'LCM is always greater than or equal to the largest of the given numbers.',
        'Product Theorem: For any two numbers a and b: a × b = HCF(a, b) × LCM(a, b).',
        'If a and b are co-prime, LCM(a, b) = a × b.',
      ],
      thinkQuestion: 'If HCF of two numbers is 6 and their product is 216, what is their LCM?',
      thinkHint: '💡 Formula: Product = HCF × LCM => 216 = 6 × LCM => LCM = 216 ÷ 6 = 36.',
      keyFormulas: [
        'LCM = Product of highest power of each prime factor involved in the numbers',
        'Product Formula: a × b = HCF(a, b) × LCM(a, b)',
        'LCM of Fractions = LCM of Numerators / HCF of Denominators',
        'For Co-primes: LCM(a, b) = a × b',
      ],
      quizQuestions: [
        LessonQuizQuestion(
          question: 'What is the LCM of 4 and 6?',
          options: ['2', '12', '24', '48'],
          correctAnswerIndex: 1,
          explanation: 'Multiples of 4: 4, 8, 12... Multiples of 6: 6, 12... The smallest common multiple is 12.',
        ),
        LessonQuizQuestion(
          question: 'If HCF(a, b) = 4 and the product a × b = 48, what is LCM(a, b)?',
          options: ['8', '12', '16', '192'],
          correctAnswerIndex: 1,
          explanation: 'Using formula Product = HCF × LCM => 48 = 4 × LCM => LCM = 48 ÷ 4 = 12.',
        ),
      ],
      theorySections: [
        TheorySection(
          heading: '1. Theoretical Definition of Lowest Common Multiple',
          lines: [
            'The Lowest Common Multiple (LCM) of two or more non-zero integers is the smallest positive integer that is divisible by each of the given numbers.',
            'While multiples of any integer extend to infinity, their common multiples also form an infinite sequence.',
            'The LCM represents the minimum starting point and step size of this common multiple sequence.',
            'For any set of numbers {a₁, a₂, ..., aₙ}, LCM(a₁, ..., aₙ) ≥ max(a₁, ..., aₙ).',
          ],
        ),
        TheorySection(
          heading: '2. Method 1: Prime Factorization Approach',
          lines: [
            'Step 1: Write the prime factorization of each number in exponential notation.',
            'Step 2: List all unique prime factors that appear in ANY of the factorizations (not just common ones).',
            'Step 3: For each prime factor, take the HIGHEST exponent with which it occurs across all numbers.',
            'Step 4: Multiply these maximum powers together to calculate the LCM.',
            'Example: 24 = 2³ × 3¹ and 36 = 2² × 3². Highest powers: 2³ and 3². LCM = 8 × 9 = 72.',
          ],
        ),
        TheorySection(
          heading: '3. Method 2: Common Division Method (Ladder Method)',
          lines: [
            'Step 1: Write the numbers in a horizontal row, separated by commas.',
            'Step 2: Divide by the smallest prime number that divides at least one of the given numbers.',
            'Step 3: Write down the quotients below each divisible number, and carry forward unchanged numbers that are not divisible.',
            'Step 4: Continue dividing until all row elements become 1.',
            'Step 5: The product of all prime divisors on the vertical left column gives the LCM.',
          ],
        ),
        TheorySection(
          heading: '4. Fundamental Relationship Between HCF and LCM',
          lines: [
            'For any two positive integers a and b, the product of the numbers equals the product of their HCF and LCM:',
            'Product of Numbers (a × b) = HCF(a, b) × LCM(a, b)',
            'This allows finding the fourth value when any three of a, b, HCF, LCM are known.',
            'Important Caveat: This exact multiplicative equality holds strictly for two numbers; for three or more numbers, a generalized formula applies.',
          ],
        ),
        TheorySection(
          heading: '5. Real-World Applications & Periodic Phenomena',
          lines: [
            'Adding and Subtracting Fractions: Finding the Least Common Denominator (LCD) is identical to calculating the LCM of denominators.',
            'Planetary Orbits & Astronomy: Determining when celestial bodies or satellites will realign in their orbital periods.',
            'Racetrack & Circuit Laps: Calculating when two runners running at different lap speeds will meet again at the starting line.',
          ],
        ),
      ],
    ),

    // 6. Fractions & Decimals
    LessonContent(
      lessonNumber: 6,
      title: 'Fractions & Decimals',
      introPrefix: 'Fractions represent equal parts of a whole unit, connecting seamlessly with ',
      highlightTerm1: 'proper fractions',
      highlightTerm2: 'decimal values',
      introSuffix: '.',
      leftBadge: 'Fractions',
      leftDescription: 'Quantities represented as numerator over denominator (a/b where b ≠ 0).',
      rightBadge: 'Decimals',
      rightDescription: 'Numbers written with a decimal point denoting base-10 fractional place values.',
      exampleTitle: 'Fraction to Decimal Conversions',
      examples: [
        ExampleBullet(label: 'One Half', content: '1/2 = 0.5', isPrimary: true),
        ExampleBullet(label: 'One Quarter', content: '1/4 = 0.25', isPrimary: false),
        ExampleBullet(label: 'Three Quarters', content: '3/4 = 0.75', isPrimary: true),
        ExampleBullet(label: 'One Fifth', content: '1/5 = 0.2 = 20%', isPrimary: false),
      ],
      rememberTitle: 'Crucial Rules',
      rememberPoints: [
        'A denominator can never be zero (division by zero is undefined).',
        'Multiplying or dividing both numerator and denominator by the same non-zero number produces an equivalent fraction.',
        'Terminating decimals have denominators whose prime factors are only 2s and/or 5s.',
      ],
      thinkQuestion: 'Which fraction is larger: 3/5 or 4/7?',
      thinkHint: '💡 Cross-multiply: 3 × 7 = 21 and 4 × 5 = 20. Since 21 > 20, 3/5 is larger than 4/7.',
      keyFormulas: [
        'Equivalent Fractions: a/b = (a × k)/(b × k) where k ≠ 0',
        'Mixed to Improper: a b/c = (a × c + b) / c',
        'Improper to Mixed: Quotient (Remainder / Divisor)',
        'Decimal Place Values: 0.d₁d₂d₃ = d₁/10 + d₂/100 + d₃/1000',
      ],
      quizQuestions: [
        LessonQuizQuestion(
          question: 'Which of the following is a PROPER fraction?',
          options: ['5/3', '7/4', '3/8', '9/9'],
          correctAnswerIndex: 2,
          explanation: 'In a proper fraction, the numerator is strictly less than the denominator (3 < 8).',
        ),
        LessonQuizQuestion(
          question: 'What is the decimal equivalent of the fraction 3/4?',
          options: ['0.34', '0.50', '0.75', '1.25'],
          correctAnswerIndex: 2,
          explanation: '3 ÷ 4 = 0.75.',
        ),
      ],
      theorySections: [
        TheorySection(
          heading: '1. Mathematical Definition & Anatomy of Fractions',
          lines: [
            'A fraction represents a part of a whole or any number of equal parts of a quantity.',
            'It is written in the form a/b, where a is the Numerator (number of equal parts taken) and b is the Denominator (total equal parts).',
            'The denominator b must strictly be non-zero (b ≠ 0), because division by zero is mathematically undefined.',
            'A fraction also represents a division operation: a/b = a ÷ b.',
          ],
        ),
        TheorySection(
          heading: '2. Classification of Fractions',
          lines: [
            'Proper Fraction: Numerator is strictly less than denominator (a < b). Value is always < 1 (e.g. 2/3, 5/8).',
            'Improper Fraction: Numerator is greater than or equal to denominator (a ≥ b). Value is ≥ 1 (e.g. 7/4, 9/5).',
            'Mixed Number: A combination of a whole number and a proper fraction (e.g. 2 ¾ = 11/4).',
            'Like vs Unlike Fractions: Fractions with identical denominators are Like (3/7, 5/7); different denominators are Unlike (3/7, 2/5).',
            'Unit Fraction: Any fraction with a numerator of exactly 1 (1/2, 1/3, 1/4, 1/n).',
          ],
        ),
        TheorySection(
          heading: '3. Decimal Number System & Place Value Progression',
          lines: [
            'Decimals are an extension of the base-10 positional notation for numbers less than one.',
            'The decimal point separates the whole number part (left) from the fractional decimal part (right).',
            'First place after dot = Tenths (1/10 = 0.1), second place = Hundredths (1/100 = 0.01), third = Thousandths (1/1000 = 0.001).',
            'Adding trailing zeroes to the right of the decimal portion does not alter the numeric value (0.5 = 0.50 = 0.500).',
          ],
        ),
        TheorySection(
          heading: '4. Interconversion Between Fractions and Decimals',
          lines: [
            'Converting Fraction to Decimal: Divide the numerator by the denominator using long division.',
            'Terminating Decimals: If the reduced denominator has only prime factors 2 and 5 (e.g. 3/8 = 3/2³ = 0.375), division terminates.',
            'Non-Terminating Repeating Decimals: If other prime factors exist (3, 7, 11...), digits repeat infinitely (e.g. 1/3 = 0.333...).',
            'Converting Decimal to Fraction: Write the digits over the power of 10 matching decimal places and reduce by HCF (0.75 = 75/100 = 3/4).',
          ],
        ),
        TheorySection(
          heading: '5. Practical Applications in Everyday Metrics',
          lines: [
            'Financial Currencies: Expressing cents/paise as decimals of dollars/rupees (Rs 4.50 = Rs 4 + 50/100).',
            'Measurement Instruments: Rulers, calipers, digital weighing scales, and thermometers display values in decimals.',
            'Cooking & Recipes: Measuring ingredients often requires combining fractional portions (1/2 cup sugar, 3/4 tsp salt).',
          ],
        ),
      ],
    ),

    // 7. Operations on Fractions
    LessonContent(
      lessonNumber: 7,
      title: 'Operations on Fractions',
      introPrefix: 'Adding, subtracting, multiplying, and dividing fractions requires converting to ',
      highlightTerm1: 'like denominators',
      highlightTerm2: 'reciprocal multiplication',
      introSuffix: '.',
      leftBadge: 'Addition & Subtraction',
      leftDescription: 'Requires finding common denominators (LCM) before combining numerators.',
      rightBadge: 'Multiplication & Division',
      rightDescription: 'Multiply straight across; for division, multiply by the inverted reciprocal.',
      exampleTitle: 'Four Operations Step-by-Step',
      examples: [
        ExampleBullet(label: 'Addition', content: '1/3 + 1/6 = 2/6 + 1/6 = 3/6 = 1/2', isPrimary: true),
        ExampleBullet(label: 'Subtraction', content: '3/4 - 1/2 = 3/4 - 2/4 = 1/4', isPrimary: false),
        ExampleBullet(label: 'Multiplication', content: '2/3 × 3/4 = (2×3)/(3×4) = 6/12 = 1/2', isPrimary: true),
        ExampleBullet(label: 'Division', content: '2/3 ÷ 4/5 = 2/3 × 5/4 = 10/12 = 5/6', isPrimary: false),
      ],
      rememberTitle: 'Essential Principles',
      rememberPoints: [
        'Never add or subtract denominators directly (e.g. 1/2 + 1/2 ≠ 2/4).',
        'To divide by a fraction, multiply by its reciprocal (flip the second fraction).',
        'Always convert mixed numbers to improper fractions before multiplying or dividing.',
      ],
      thinkQuestion: 'What is 3/4 divided by 3/4?',
      thinkHint: '💡 Any non-zero quantity divided by itself equals 1. Invert and multiply: 3/4 × 4/3 = 12/12 = 1.',
      keyFormulas: [
        'Addition (Like): a/c + b/c = (a + b)/c',
        'Addition (Unlike): a/b + c/d = (a·d + b·c) / (b·d)',
        'Multiplication: (a/b) × (c/d) = (a × c) / (b × d)',
        'Division: (a/b) ÷ (c/d) = (a/b) × (d/c) = (a × d) / (b × c)',
      ],
      quizQuestions: [
        LessonQuizQuestion(
          question: 'What is the sum of 1/3 + 1/6?',
          options: ['2/9', '5/6', '1/2', '2/18'],
          correctAnswerIndex: 2,
          explanation: 'Convert to common denominator: 2/6 + 1/6 = 3/6 = 1/2.',
        ),
        LessonQuizQuestion(
          question: 'To divide 2/3 by 4/5, we multiply 2/3 by which reciprocal?',
          options: ['3/2', '5/4', '4/5', '1/2'],
          correctAnswerIndex: 1,
          explanation: 'Dividing by a fraction equals multiplying by its inverted reciprocal: 4/5 becomes 5/4.',
        ),
      ],
      theorySections: [
        TheorySection(
          heading: '1. Addition & Subtraction of Fractions',
          lines: [
            'Like Fractions: When denominators are identical, simply add or subtract the numerators and retain the common denominator.',
            'Unlike Fractions: You cannot add unlike fractional parts directly because their unit sizes differ.',
            'Step 1: Find the Least Common Denominator (LCD), which is the LCM of the denominators.',
            'Step 2: Convert each fraction into an equivalent fraction with the LCD as its denominator.',
            'Step 3: Add/subtract the new numerators over the LCD and simplify to lowest terms.',
          ],
        ),
        TheorySection(
          heading: '2. Multiplication of Fractions',
          lines: [
            'Fraction multiplication represents finding a fraction OF a fractional quantity (e.g. 1/2 × 1/4 means half of a quarter).',
            'Rule: Multiply all numerators together to form the product numerator; multiply all denominators to form product denominator.',
            'Cross-Cancellation: You can simplify by dividing out common factors between any numerator and any denominator before multiplying.',
            'Formula: (a/b) × (c/d) = (a × c) / (b × d).',
          ],
        ),
        TheorySection(
          heading: '3. Division of Fractions & The Reciprocal Rule',
          lines: [
            'The reciprocal (or multiplicative inverse) of a fraction a/b is obtained by swapping numerator and denominator to get b/a.',
            'The product of any non-zero fraction and its reciprocal is always strictly 1: (a/b) × (b/a) = 1.',
            'Rule for Division: Dividing by a fraction is mathematically identical to multiplying by its reciprocal.',
            'Mnemonic: "Keep, Change, Flip" — Keep first fraction, Change division to multiplication, Flip second fraction.',
            'Formula: (a/b) ÷ (c/d) = (a/b) × (d/c) = (a × d) / (b × c).',
          ],
        ),
        TheorySection(
          heading: '4. Operations on Mixed Numbers',
          lines: [
            'Step 1: Always convert all mixed numbers into improper fractions first: A b/c = [(A × c) + b] / c.',
            'Step 2: Execute the required arithmetic operations following standard fraction rules.',
            'Step 3: If the resulting answer is an improper fraction, convert it back to a simplified mixed number.',
            'Example: 1 ½ × 2 ⅔ = 3/2 × 8/3 = 24/6 = 4.',
          ],
        ),
        TheorySection(
          heading: '5. Order of Operations (BODMAS / PEMDAS) with Fractions',
          lines: [
            'When multiple operations appear in a single fractional expression, strictly adhere to BODMAS hierarchy:',
            'B: Brackets first ( ), [ ]',
            'O: Orders (powers, square roots, or "of" multiplication)',
            'D & M: Division and Multiplication (evaluated from left to right)',
            'A & S: Addition and Subtraction (evaluated from left to right)',
          ],
        ),
      ],
    ),

    // 8. Ratio and Proportion
    LessonContent(
      lessonNumber: 8,
      title: 'Ratio and Proportion',
      introPrefix: 'A ratio compares two quantities of the same unit, while proportion states equality between ',
      highlightTerm1: 'ratios',
      highlightTerm2: 'proportions',
      introSuffix: '.',
      leftBadge: 'Ratio (a:b)',
      leftDescription: 'Quantitative relationship comparing the relative sizes of two quantities in the same units.',
      rightBadge: 'Proportion (a:b :: c:d)',
      rightDescription: 'An equation stating that two given ratios are strictly equivalent.',
      exampleTitle: 'Ratio & Proportion in Action',
      examples: [
        ExampleBullet(label: 'Classroom ratio', content: '12 boys to 18 girls = 12:18 = 2:3', isPrimary: true),
        ExampleBullet(label: 'Proportion test', content: '2:3 :: 4:6 (Product of Means = Extremes: 2×6 = 3×4 = 12)', isPrimary: false),
        ExampleBullet(label: 'Unitary Method', content: '5 pens cost Rs 50 => 1 pen = Rs 10 => 8 pens = Rs 80', isPrimary: true),
        ExampleBullet(label: 'Scale on Map', content: '1 cm : 50 km in real distance', isPrimary: false),
      ],
      rememberTitle: 'Fundamental Principles',
      rememberPoints: [
        'Ratios must always compare quantities measured in the exact same units (convert meters to cm first).',
        'A ratio has no units of its own; it is a pure dimensionless comparison factor.',
        'In a proportion a:b = c:d, Product of Extremes (a × d) = Product of Means (b × c).',
      ],
      thinkQuestion: 'If 3 pencils cost Rs 15, how much will 9 pencils cost using proportion?',
      thinkHint: '💡 Setup: 3/15 = 9/x => 3x = 135 => x = 135 ÷ 3 = Rs 45.',
      keyFormulas: [
        'Ratio in simplest form: a:b = a/b (divided by HCF(a, b))',
        'Proportion cross-product: a:b :: c:d <=> a × d = b × c',
        'Mean Proportional: If a:b :: b:c, then b² = a × c => b = √(a × c)',
        'Unitary Formula: Value of Required Units = (Total Value / Given Units) × Required Units',
      ],
      quizQuestions: [
        LessonQuizQuestion(
          question: 'If the ratio of boys to girls is 2:3 and there are 12 boys, how many girls are there?',
          options: ['15', '18', '24', '36'],
          correctAnswerIndex: 1,
          explanation: '2 parts = 12 => 1 part = 6. Girls = 3 × 6 = 18.',
        ),
        LessonQuizQuestion(
          question: 'In the proportion a:b = c:d, which mathematical rule is always TRUE?',
          options: ['a + d = b + c', 'a × d = b × c (Product of Extremes = Means)', 'a × b = c × d', 'a - d = b - c'],
          correctAnswerIndex: 1,
          explanation: 'Fundamental Law of Proportion: Product of Extremes (a × d) = Product of Means (b × c).',
        ),
      ],
      theorySections: [
        TheorySection(
          heading: '1. Theoretical Nature & Definition of Ratio',
          lines: [
            'A ratio is a mathematical comparison of the relative sizes of two or more quantities of the same kind by division.',
            'The ratio of a quantity a to a quantity b is written as a:b (read as "a is to b") or as the fraction a/b.',
            'In the ratio a:b, the first term a is called the Antecedent and the second term b is called the Consequent.',
            'Crucial Condition: Both quantities must be expressed in the exact same unit of measurement before forming the ratio.',
          ],
        ),
        TheorySection(
          heading: '2. Properties of Ratios',
          lines: [
            'Dimensionless: Because units cancel out during division, a ratio is a pure number with no units.',
            'Order Matters: The ratio a:b is NOT equal to b:a unless a = b (e.g. 3:2 ≠ 2:3).',
            'Scaling Invariance: Multiplying or dividing both antecedent and consequent by the same non-zero constant does not change the ratio: a:b = ka:kb.',
            'Simplest Form: A ratio is in simplest (or irreducible) form when HCF(a, b) = 1.',
          ],
        ),
        TheorySection(
          heading: '3. Theoretical Definition & Rules of Proportion',
          lines: [
            'A Proportion is an equation stating that two ratios are equal: a:b = c:d or a:b :: c:d.',
            'The four numbers a, b, c, d are called terms of the proportion: 1st (a), 2nd (b), 3rd (c), and 4th (d).',
            'Extremes & Means: The outer terms a and d are called Extremes; the inner terms b and c are called Means.',
            'The Fundamental Law of Proportion states: Product of Extremes (a × d) = Product of Means (b × c).',
          ],
        ),
        TheorySection(
          heading: '4. Direct vs. Inverse Variation',
          lines: [
            'Direct Proportion: When an increase in one quantity causes a proportional increase in the other (y/x = k constant). Example: Speed and Distance.',
            'Inverse Proportion: When an increase in one quantity causes a proportional decrease in the other (x × y = k constant). Example: Workers and Time taken.',
            'Unitary Method: A universal technique where we first calculate the value of 1 single unit by division, then multiply to find the value of any desired quantity.',
          ],
        ),
        TheorySection(
          heading: '5. Engineering, Art & Real-World Applications',
          lines: [
            'Architectural Blueprints: Scale models use ratios (e.g. 1:100) to represent large buildings on paper accurately.',
            'Golden Ratio (φ ≈ 1.618): Found throughout nature, classical art, and UI/UX design layouts for visual aesthetics.',
            'Chemical Solutions & Cooking: Mixing acids, paints, and concrete requires strict stoichiometric ratios (e.g. 1 part cement : 2 parts sand : 4 parts gravel).',
          ],
        ),
      ],
    ),

    // 9. Basic Algebraic Expressions
    LessonContent(
      lessonNumber: 9,
      title: 'Basic Algebraic Expressions',
      introPrefix: 'Algebra uses symbols and letters to represent unknown quantities in mathematical ',
      highlightTerm1: 'variables',
      highlightTerm2: 'constants',
      introSuffix: '.',
      leftBadge: 'Variables',
      leftDescription: 'Symbols (letters like x, y, z) that represent unknown values that can change.',
      rightBadge: 'Constants',
      rightDescription: 'Fixed numerical values that remain constant (e.g. 5, -3, 12, 100).',
      exampleTitle: 'Algebraic Expressions Deconstructed',
      examples: [
        ExampleBullet(label: 'Expression 3x + 7', content: 'Coefficient = 3, Variable = x, Constant = 7', isPrimary: true),
        ExampleBullet(label: 'Evaluation for x = 4', content: '3(4) + 7 = 12 + 7 = 19', isPrimary: false),
        ExampleBullet(label: 'Like terms', content: '5x and 8x (Can be added: 5x + 8x = 13x)', isPrimary: true),
        ExampleBullet(label: 'Unlike terms', content: '5x and 5y (Cannot be combined into a single term)', isPrimary: false),
      ],
      rememberTitle: 'Essential Principles',
      rememberPoints: [
        'Only like terms (identical variables with identical exponents) can be combined by addition or subtraction.',
        'A term is a product of factors: e.g. -7xy² has numerical coefficient -7 and literal factors x, y².',
        'An algebraic expression does not contain an equal sign (=); equations contain equal signs.',
      ],
      thinkQuestion: 'Can you simplify 4x + 7y - 2x + 3y?',
      thinkHint: '💡 Group like terms: (4x - 2x) + (7y + 3y) = 2x + 10y.',
      keyFormulas: [
        'Term = (Numerical Coefficient) × (Literal Variable Factors)',
        'Degree of Monomial = Sum of exponents of all variables in the term',
        'Distributive Law: a(b + c) = ab + ac',
        'Standard Identity: (a + b)² = a² + 2ab + b²',
      ],
      quizQuestions: [
        LessonQuizQuestion(
          question: 'In the algebraic term -7xy², what is the numerical COEFFICIENT?',
          options: ['7', '-7', 'x', 'y²'],
          correctAnswerIndex: 1,
          explanation: 'The numerical factor multiplying the variables is -7.',
        ),
        LessonQuizQuestion(
          question: 'Which pair represents LIKE terms that can be added together directly?',
          options: ['4x and 4y', '3x² and 5x', '7xy and -2xy', '6a and 6b'],
          correctAnswerIndex: 2,
          explanation: 'Like terms must have identical variables and powers. 7xy and -2xy both have xy.',
        ),
      ],
      theorySections: [
        TheorySection(
          heading: '1. The Language of Algebra & Core Building Blocks',
          lines: [
            'Algebra is a branch of mathematics in which letters and symbols are used to represent numbers and quantities in formulas and equations.',
            'Variable: A symbol (commonly x, y, z, a, b, n) that can assume various numerical values.',
            'Constant: A symbol or number having a fixed, immutable numerical value (e.g. 7, -12, π).',
            'Algebraic Expression: A mathematical phrase formed by combining variables and constants using addition, subtraction, multiplication, division, and exponents.',
          ],
        ),
        TheorySection(
          heading: '2. Terms, Factors, and Coefficients',
          lines: [
            'Terms: The parts of an algebraic expression separated by + or - signs (e.g. 4x² - 3xy + 8 contains three distinct terms: 4x², -3xy, and 8).',
            'Factors: The quantities multiplied together to form a term (In 5xy, the factors are 5, x, and y).',
            'Coefficient: The numerical multiplier of a term (In -9x²y, the numerical coefficient is -9).',
            'Constant Term: A term that contains no variables at all (In 3x + 5, the constant term is 5).',
          ],
        ),
        TheorySection(
          heading: '3. Classification of Polynomial Expressions',
          lines: [
            'Monomial: An expression containing exactly 1 term (e.g. 5x, -7y², 12abc).',
            'Binomial: An expression containing exactly 2 unlike terms (e.g. 2x + 3, x² - y²).',
            'Trinomial: An expression containing exactly 3 unlike terms (e.g. ax² + bx + c).',
            'Polynomial: A general expression consisting of variables and coefficients with non-negative integer exponents.',
            'Degree of Polynomial: The highest exponent power of the variable present in the polynomial.',
          ],
        ),
        TheorySection(
          heading: '4. Combining Like Terms & Simplifying Expressions',
          lines: [
            'Like Terms: Terms that have the exact same literal variables raised to the exact same powers (e.g. 3x²y and -7x²y).',
            'Unlike Terms: Terms having different variables or different powers of the same variable (e.g. 3x and 3x²).',
            'Rule of Addition & Subtraction: ONLY like terms can be added or subtracted by operating on their numerical coefficients: ax + bx = (a + b)x.',
            'Unlike terms cannot be merged and must remain separate (e.g. 4x + 3y cannot be simplified further).',
          ],
        ),
        TheorySection(
          heading: '5. Practical Applications & Computer Programming',
          lines: [
            'Variables in Coding: Computer variables, memory allocation, and functions directly implement algebraic variable concepts.',
            'Financial Modeling: Formulating cost, revenue, and profit models: Profit = Revenue(x) - Cost(x).',
            'Physics Formulas: Expressing physical relationships: Force F = ma, Kinetic Energy E = ½mv².',
          ],
        ),
      ],
    ),

    // 10. Linear Equations in One Variable
    LessonContent(
      lessonNumber: 10,
      title: 'Linear Equations in One Variable',
      introPrefix: 'A statement of equality with an unknown variable raised to the power of 1 is a ',
      highlightTerm1: 'linear equation',
      highlightTerm2: 'solution root',
      introSuffix: '.',
      leftBadge: 'Equation',
      leftDescription: 'Two algebraic expressions joined by an equality sign (=) that are balanced.',
      rightBadge: 'Solution / Root',
      rightDescription: 'The specific numerical value of the variable that makes the equation true.',
      exampleTitle: 'Solving Equations Step-by-Step',
      examples: [
        ExampleBullet(label: 'Linear Equation', content: '2x + 6 = 14', isPrimary: true),
        ExampleBullet(label: 'Step 1: Subtract 6', content: '2x = 14 - 6 => 2x = 8', isPrimary: false),
        ExampleBullet(label: 'Step 2: Divide by 2', content: 'x = 8 / 2 => x = 4', isPrimary: true),
        ExampleBullet(label: 'Verification', content: 'LHS = 2(4) + 6 = 14 = RHS (Verified!)', isPrimary: false),
      ],
      rememberTitle: 'Essential Axioms',
      rememberPoints: [
        'Whatever operation you perform on the Left Hand Side (LHS), you MUST perform on the Right Hand Side (RHS).',
        'Transposition rule: Moving a term across the = sign reverses its operation (+ becomes -, × becomes ÷).',
        'A linear equation in one variable always has exactly ONE unique solution.',
      ],
      thinkQuestion: 'Solve for y: 5y - 7 = 3y + 9.',
      thinkHint: '💡 Transpose: 5y - 3y = 9 + 7 => 2y = 16 => y = 16 ÷ 2 = 8.',
      keyFormulas: [
        'Standard Form: ax + b = 0 (where a ≠ 0)',
        'Root formula: x = -b / a',
        'Cross-Multiplication: If (ax + b)/(cx + d) = m/n, then n(ax + b) = m(cx + d)',
        'Balance Principle: If a = b, then a ± c = b ± c and a × c = b × c',
      ],
      quizQuestions: [
        LessonQuizQuestion(
          question: 'What is the solution of the linear equation 3x + 5 = 20?',
          options: ['x = 3', 'x = 5', 'x = 7', 'x = 15'],
          correctAnswerIndex: 1,
          explanation: '3x = 20 - 5 => 3x = 15 => x = 15 ÷ 3 = 5.',
        ),
        LessonQuizQuestion(
          question: 'When moving a term from LHS to RHS across the = sign, a "+" sign changes to:',
          options: ['+', '-', '×', '÷'],
          correctAnswerIndex: 1,
          explanation: 'Transposition inverts the arithmetic operation: addition becomes subtraction (-).',
        ),
      ],
      theorySections: [
        TheorySection(
          heading: '1. Mathematical Definition of an Algebraic Equation',
          lines: [
            'An equation is a mathematical statement asserting that two expressions are equal in value, connected by an equal sign (=).',
            'The expression on the left of the equal sign is the Left Hand Side (LHS), and on the right is the Right Hand Side (RHS).',
            'A Linear Equation in One Variable is an equation where the highest exponent power of the single variable is exactly 1.',
            'Standard Canonical Form: ax + b = 0, where a, b are real numbers and a ≠ 0.',
          ],
        ),
        TheorySection(
          heading: '2. The Fundamental Balancing Scale Axiom',
          lines: [
            'An equation behaves like a balanced scale: equality is maintained if and only if identical operations are applied to both pans.',
            'Axiom 1 (Addition): Adding the same number to both sides maintains equality (a = b => a + c = b + c).',
            'Axiom 2 (Subtraction): Subtracting the same number from both sides maintains equality (a = b => a - c = b - c).',
            'Axiom 3 (Multiplication): Multiplying both sides by the same non-zero number maintains equality (a = b => a × c = b × c).',
            'Axiom 4 (Division): Dividing both sides by the same non-zero number maintains equality (a = b => a / c = b / c).',
          ],
        ),
        TheorySection(
          heading: '3. Method of Transposition',
          lines: [
            'Transposition is an efficient algebraic shortcut for solving equations by moving terms from one side to the other.',
            'When a term moves across the equal sign (=), its mathematical operation is inverted:',
            '+ changes to - on the opposite side (e.g. x + 5 = 12 => x = 12 - 5).',
            '- changes to + on the opposite side (e.g. x - 4 = 10 => x = 10 + 4).',
            '× changes to ÷ on the opposite side (e.g. 3x = 18 => x = 18 / 3).',
            '÷ changes to × on the opposite side (e.g. x / 4 = 5 => x = 5 × 4).',
          ],
        ),
        TheorySection(
          heading: '4. Systematic 5-Step Protocol for Solving Linear Equations',
          lines: [
            'Step 1 (Clear Fractions): Multiply all terms by the LCM of all denominators to eliminate fractions.',
            'Step 2 (Expand Parentheses): Use the distributive property a(b + c) = ab + ac to remove all brackets.',
            'Step 3 (Collect Like Terms): Combine like terms independently on the LHS and RHS.',
            'Step 4 (Isolate Variable): Transpose all variable terms to the LHS and all numerical constants to the RHS.',
            'Step 5 (Solve & Verify): Divide by the variable’s coefficient and substitute back into original LHS/RHS to verify equality.',
          ],
        ),
        TheorySection(
          heading: '5. Real-World Word Problems & Translation Technique',
          lines: [
            'Age Problems: Translating "Father is 3 times older than son" into F = 3s.',
            'Geometry Applications: Finding dimensions of a rectangle given perimeter 2(l + w) = 48 and length l = w + 4.',
            'Speed, Time & Distance: Setting up motion equations: Distance = Speed × Time.',
          ],
        ),
      ],
    ),

    // 11. Angles and Triangles
    LessonContent(
      lessonNumber: 11,
      title: 'Angles and Triangles',
      introPrefix: 'Geometry explores figures formed by intersecting lines and planes, focusing on ',
      highlightTerm1: 'angle measures',
      highlightTerm2: 'triangle properties',
      introSuffix: '.',
      leftBadge: 'Angle Types',
      leftDescription: 'Acute (<90°), Right (90°), Obtuse (90°-180°), Straight (180°), Reflex (>180°).',
      rightBadge: 'Triangles',
      rightDescription: '3-sided closed 2D polygon whose interior angles always sum up to exactly 180°.',
      exampleTitle: 'Angle & Triangle Properties',
      examples: [
        ExampleBullet(label: 'Angle Sum in Triangle', content: '∠A + ∠B + ∠C = 180° (Universal Law)', isPrimary: true),
        ExampleBullet(label: 'Equilateral Triangle', content: 'All 3 sides equal, all angles = 60°', isPrimary: false),
        ExampleBullet(label: 'Right Triangle', content: 'One angle is 90° (Hypotenuse² = Base² + Height²)', isPrimary: true),
        ExampleBullet(label: 'Isosceles Triangle', content: '2 equal sides, angles opposite equal sides are equal', isPrimary: false),
      ],
      rememberTitle: 'Geometric Laws',
      rememberPoints: [
        'The sum of interior angles of ANY triangle is always strictly 180°.',
        'Exterior angle of a triangle is equal to the sum of its two interior opposite angles.',
        'Triangle Inequality: The sum of the lengths of any two sides must always be greater than the third side.',
      ],
      thinkQuestion: 'Can a triangle have side lengths 3 cm, 4 cm, and 8 cm?',
      thinkHint: '💡 No! Triangle Inequality rule states sum of two sides must exceed third: 3 + 4 = 7 cm, which is less than 8 cm. Thus, no such triangle can exist.',
      keyFormulas: [
        'Angle Sum Property: ∠A + ∠B + ∠C = 180°',
        'Exterior Angle Theorem: Exterior ∠ = Interior ∠1 + Interior ∠2',
        'Pythagorean Theorem: Hypotenuse² = Base² + Altitude² (a² + b² = c²)',
        'Area of Triangle = 1/2 × Base × Height',
      ],
      quizQuestions: [
        LessonQuizQuestion(
          question: 'What is the sum of all three interior angles in ANY triangle?',
          options: ['90°', '180°', '270°', '360°'],
          correctAnswerIndex: 1,
          explanation: 'The universal angle sum property states that ∠A + ∠B + ∠C = 180°.',
        ),
        LessonQuizQuestion(
          question: 'In a right triangle with base 3 cm and height 4 cm, what is the hypotenuse length?',
          options: ['5 cm', '7 cm', '12 cm', '25 cm'],
          correctAnswerIndex: 0,
          explanation: 'Pythagoras Theorem: c² = 3² + 4² = 9 + 16 = 25 => c = √25 = 5 cm.',
        ),
      ],
      theorySections: [
        TheorySection(
          heading: '1. Geometric Anatomy & Classification of Angles',
          lines: [
            'An angle is formed when two rays originate from a common endpoint called the Vertex.',
            'Acute Angle: Measure strictly greater than 0° and less than 90° (0° < θ < 90°).',
            'Right Angle: Measure exactly equal to 90° (θ = 90°). Lines are perpendicular (⊥).',
            'Obtuse Angle: Measure strictly between 90° and 180° (90° < θ < 180°).',
            'Straight Angle: Measure exactly equal to 180°, forming a straight continuous line.',
            'Reflex Angle: Measure strictly between 180° and 360°. Complete angle = 360°.',
          ],
        ),
        TheorySection(
          heading: '2. Complementary, Supplementary & Vertically Opposite Angles',
          lines: [
            'Complementary Angles: Two angles whose sum equals 90° (e.g. 35° and 55°).',
            'Supplementary Angles: Two angles whose sum equals 180° (e.g. 110° and 70°).',
            'Linear Pair: Adjacent angles on a straight line that sum to 180°.',
            'Vertically Opposite Angles: When two straight lines intersect, opposite angles formed are always strictly equal (∠1 = ∠3, ∠2 = ∠4).',
          ],
        ),
        TheorySection(
          heading: '3. Classification of Triangles (By Sides & By Angles)',
          lines: [
            'By Side Lengths:',
            '• Scalene Triangle: All three sides have different lengths; all three interior angles are different.',
            '• Isosceles Triangle: Exactly two sides are equal; angles opposite to these equal sides are also equal.',
            '• Equilateral Triangle: All three sides are equal; all three angles are equal to exactly 60°.',
            'By Angle Measures:',
            '• Acute-angled Triangle: All three interior angles are acute (< 90°).',
            '• Right-angled Triangle: Exactly one angle is a right angle (90°).',
            '• Obtuse-angled Triangle: Exactly one angle is obtuse (> 90°).',
          ],
        ),
        TheorySection(
          heading: '4. Fundamental Theorems of Triangles',
          lines: [
            'Angle Sum Theorem: In any Euclidean triangle ΔABC, the sum of all three interior angles is always 180° (∠A + ∠B + ∠C = 180°).',
            'Exterior Angle Theorem: An exterior angle formed by extending a side equals the sum of the two opposite interior angles.',
            'Triangle Inequality Theorem: The sum of any two sides of a triangle must strictly exceed the length of the third side (a + b > c, b + c > a, a + c > b).',
            'Pythagoras Theorem: In a right-angled triangle, the square of the hypotenuse equals the sum of squares of the other two sides (c² = a² + b²).',
          ],
        ),
        TheorySection(
          heading: '5. Applications in Architecture, Navigation & Triangulation',
          lines: [
            'Structural Engineering: Triangles are the most rigid and stable geometric shape, used in bridges, roofs (trusses), and cranes.',
            'GPS Triangulation: Global Positioning Systems determine receiver location on Earth by intersecting spheres from satellite triangles.',
            'Computer Graphics: 3D modeling meshes render complex visual objects and characters by tessellating millions of tiny triangles.',
          ],
        ),
      ],
    ),

    // 12. Perimeter and Area of Shapes
    LessonContent(
      lessonNumber: 12,
      title: 'Perimeter and Area of Shapes',
      introPrefix: 'Measuring boundary lengths and enclosed surface space allows calculating ',
      highlightTerm1: 'perimeter',
      highlightTerm2: 'area',
      introSuffix: ' of 2D shapes.',
      leftBadge: 'Perimeter',
      leftDescription: 'Total distance around the outer boundary of a closed 2-dimensional shape.',
      rightBadge: 'Area',
      rightDescription: 'Total amount of 2D surface space enclosed within the boundary lines.',
      exampleTitle: 'Formulas & Calculation Examples',
      examples: [
        ExampleBullet(label: 'Rectangle Perimeter', content: '2 × (Length + Width) = 2 × (6 + 4) = 20 cm', isPrimary: true),
        ExampleBullet(label: 'Rectangle Area', content: 'Length × Width = 6 × 4 = 24 cm²', isPrimary: false),
        ExampleBullet(label: 'Square Area', content: 'Side × Side = 5 × 5 = 25 cm²', isPrimary: true),
        ExampleBullet(label: 'Circle Circumference', content: '2 × π × r = 2 × (22/7) × 7 = 44 cm', isPrimary: false),
      ],
      rememberTitle: 'Measurement Units',
      rememberPoints: [
        'Perimeter is a 1-dimensional measurement, expressed in linear units (mm, cm, m, km).',
        'Area is a 2-dimensional measurement, expressed in square units (cm², m², hectares).',
        'Unit conversion: 1 m² = 10,000 cm² (since 1m = 100cm => 100 × 100 = 10,000).',
      ],
      thinkQuestion: 'If a square and a rectangle have the same perimeter of 24 cm, which shape has a larger area?',
      thinkHint: '💡 Square side = 24/4 = 6 cm => Area = 36 cm². Rectangle (e.g. 8 by 4) => Area = 32 cm². A square always encloses more area than any non-square rectangle with the same perimeter!',
      keyFormulas: [
        'Square: Perimeter = 4a | Area = a²',
        'Rectangle: Perimeter = 2(l + w) | Area = l × w',
        'Triangle: Perimeter = a + b + c | Area = 1/2 × b × h',
        'Parallelogram: Perimeter = 2(a + b) | Area = Base × Height',
        'Circle: Circumference = 2πr | Area = πr²',
      ],
      quizQuestions: [
        LessonQuizQuestion(
          question: 'What is the AREA of a rectangle with length 8 cm and width 5 cm?',
          options: ['26 cm', '40 cm²', '13 cm²', '80 cm²'],
          correctAnswerIndex: 1,
          explanation: 'Area of rectangle = Length × Width = 8 × 5 = 40 cm².',
        ),
        LessonQuizQuestion(
          question: 'If a square has a perimeter of 36 cm, what is the length of each side?',
          options: ['6 cm', '9 cm', '12 cm', '18 cm'],
          correctAnswerIndex: 1,
          explanation: 'Perimeter = 4 × Side => Side = 36 ÷ 4 = 9 cm.',
        ),
      ],
      theorySections: [
        TheorySection(
          heading: '1. Fundamental Concept of Perimeter vs. Area',
          lines: [
            'Perimeter is the continuous line forming the boundary of a closed geometric figure; it measures total distance around the outside edge.',
            'Area is the quantity that expresses the two-dimensional extent of a planar region or shape; it measures total surface covered.',
            'Perimeter represents 1D length (measured in units: cm, m, km), while Area represents 2D space (measured in square units: cm², m², km²).',
            'Two figures can have identical perimeters but vastly different areas, and vice versa.',
          ],
        ),
        TheorySection(
          heading: '2. Detailed Formulas for Standard Quadrilaterals',
          lines: [
            'Square (Side a):',
            '• Perimeter: P = 4a',
            '• Area: A = a² = side × side',
            '• Diagonal: d = a√2',
            'Rectangle (Length l, Width w):',
            '• Perimeter: P = 2(l + w)',
            '• Area: A = l × w',
            '• Diagonal: d = √(l² + w²)',
            'Parallelogram (Base b, Height h, Side a):',
            '• Perimeter: P = 2(a + b)',
            '• Area: A = b × h',
            'Rhombus (Side a, Diagonals d₁, d₂):',
            '• Perimeter: P = 4a',
            '• Area: A = ½ × d₁ × d₂',
          ],
        ),
        TheorySection(
          heading: '3. Triangles & Circular Geometry Formulas',
          lines: [
            'Triangle (Base b, Altitude h, Sides a, b, c):',
            '• Perimeter: P = a + b + c',
            '• Standard Area: A = ½ × b × h',
            '• Heron’s Formula: A = √[s(s-a)(s-b)(s-c)], where Semi-perimeter s = (a+b+c)/2.',
            'Circle (Radius r, Diameter d = 2r, Constant π ≈ 3.14159 or 22/7):',
            '• Circumference (Perimeter): C = 2πr = πd',
            '• Area: A = πr²',
            '• Semi-circle: Perimeter = πr + 2r, Area = ½πr²',
          ],
        ),
        TheorySection(
          heading: '4. Unit Conversions & Scale Factors in 2D Geometry',
          lines: [
            'Linear Conversions (1D):',
            '• 1 m = 100 cm and 1 km = 1,000 m',
            'Square Area Conversions (2D):',
            '• 1 m² = 100 cm × 100 cm = 10,000 cm²',
            '• 1 km² = 1,000 m × 1,000 m = 1,000,000 m²',
            '• 1 Hectare = 10,000 m² (standard land measurement unit in agriculture).',
          ],
        ),
        TheorySection(
          heading: '5. Real-World Applications in Construction, Land & Agriculture',
          lines: [
            'Fencing vs Flooring: Fencing a boundary requires perimeter calculation; tiling a floor or carpeting requires area calculation.',
            'Paint & Wall Coverage: Determining how many liters of paint to purchase based on total wall surface area (m²).',
            'Agricultural Yields: Estimating crop production and fertilizer requirements based on total field acreage/hectares.',
          ],
        ),
      ],
    ),
  ];

  // ================= TAMIL LITERATURE & CLASS 6 SAMACHEER LESSONS (12 TOPICS) =================
  static const List<LessonContent> tamilLessons = [
    // 1. இன்பத்தமிழ்
    LessonContent(
      lessonNumber: 1,
      title: 'இன்பத்தமிழ் - பாரதிதாசன்',
      introPrefix: 'தமிழுக்கும் அமுதென்று பேர்! தமிழ் எங்கள் இளமைக்குக் காரணமான பால் போன்றது; அறிவுக்குத் துணைநிற்கும் ',
      highlightTerm1: 'வேல் போன்றது',
      highlightTerm2: 'உயிருக்கு நேர்',
      introSuffix: ' எனப் பாவேந்தர் பாடுகிறார்.',
      leftBadge: 'சுப்புரத்தினம்',
      leftDescription: 'பாரதியார் மீது கொண்ட பற்றினால் பாரதிதாசன் எனப் பெயர் மாற்றிக்கொண்டார்.',
      rightBadge: 'பாவேந்தர்',
      rightDescription: 'புரட்சிக் கவிஞர், பாவேந்தர் என தமிழ் உலகால் போற்றப்படுகிறார்.',
      exampleTitle: 'சொல்லும் பொருளும் & பாடல் வரிகள்',
      examples: [
        ExampleBullet(label: 'நிருமித்த', content: 'உருவாக்கிய (Created)', isPrimary: true),
        ExampleBullet(label: 'விளைவு', content: 'வளர்ச்சி / பயிர் விளைச்சல்', isPrimary: false),
        ExampleBullet(label: 'சமூகம்', content: 'மக்கள் குழு (Society)', isPrimary: true),
        ExampleBullet(label: 'அசதி', content: 'சோர்வு (Tiredness)', isPrimary: false),
      ],
      rememberTitle: 'நினைவில் கொள்க',
      rememberPoints: [
        'தமிழுக்கு நிலவென்றும், மணமென்றும், அமுதென்றும் பெயர் சூட்டியுள்ளார்.',
        'தமிழ் எங்கள் சமூக வளர்ச்சிக்கு அடிப்படையான நீர் போன்றது.',
        'இன்பத்தமிழ் எங்கள் சோர்வை நீக்கி ஒளிரச் செய்யும் தேன் போன்றது.',
      ],
      quizQuestions: [
        LessonQuizQuestion(
          question: 'பாரதிதாசனின் இயற்பெயர் என்ன?',
          options: ['சுப்புரத்தினம்', 'துரை. மாணிக்கம்', 'சுப்பிரமணியன்', 'கனகசுப்புரத்தினம்'],
          correctAnswerIndex: 0,
          explanation: 'பாரதிதாசனின் இயற்பெயர் சுப்புரத்தினம் ஆகும். பாரதியார் மீது கொண்ட அன்பினால் பாரதிதாசன் என்று மாற்றிக்கொண்டார்.',
        ),
        LessonQuizQuestion(
          question: '"தமிழுக்கும் அமுதென்று பேர்" - என்ற புகழ்பெற்ற பாடலை இயற்றியவர் யார்?',
          options: ['பாரதியார்', 'பாரதிதாசன்', 'நாமக்கல் கவிஞர்', 'கவிமணி'],
          correctAnswerIndex: 1,
          explanation: 'இப்பாடலை இயற்றியவர் பாவேந்தர் பாரதிதாசன் ஆவார்.',
        ),
      ],
      theorySections: [
        TheorySection(
          heading: '1. இன்பத்தமிழ் பாடல் கருத்து',
          lines: [
            'தமிழுக்கு அமுது என்று பெயர். அந்த இன்பத் தமிழ் எங்கள் உயிருக்கு இணையானது.',
            'தமிழுக்கு நிலவு என்று பெயர். இன்பத் தமிழ் எங்கள் சமூக வளர்ச்சிக்கு காரணமான நீர் போன்றது.',
            'தமிழுக்கு மணம் என்று பெயர். அது எங்கள் வாழ்விற்காகவே உருவாக்கப்பட்ட ஊர் ஆகும்.',
            'தமிழ் எங்கள் இளமைக்குக் காரணமான பால் போன்றது; நல்ல புகழ் மிகுந்த புலவர்க்கு கூர்மையான வேல் போன்ற கருவியாகும்.',
          ],
        ),
        TheorySection(
          heading: '2. நூல் வெளி & ஆசிரியர் சிறப்பு',
          lines: [
            'பாரதிதாசனின் இயற்பெயர் சுப்புரத்தினம்.',
            'பாரதியாரின் கவிதைகள் மீது கொண்ட பற்றினால் தம் பெயரைப் பாரதிதாசன் என மாற்றிக் கொண்டார்.',
            'தம் கவிதைகளில் பெண்கல்வி, கைம்பெண் மறுமணம், பொதுவுடைமை, பகுத்தறிவு முதலான புரட்சிகரமான கருத்துக்களைப் பாடியுள்ளார்.',
            'எனவே இவர் "புரட்சிக்கவி" என்றும் "பாவேந்தர்" என்றும் சிறப்பிக்கப்படுகிறார்.',
          ],
        ),
      ],
    ),

    // 2. தமிழ்க்கும்மி
    LessonContent(
      lessonNumber: 2,
      title: 'தமிழ்க் கும்மி - பாவலரேறு பெருஞ்சித்திரனார்',
      introPrefix: 'எட்டுத் திசையிலும் செந்தமிழின் புகழ் எட்டிடவே கும்மி கொட்டிப் பாடுவோம். தமிழ் மொழி பல நூறு ஆண்டுகளைக் கண்ட ',
      highlightTerm1: 'ஆழிப்பெருக்கு',
      highlightTerm2: 'காலவெள்ளம்',
      introSuffix: ' அனைத்தையும் வென்று நிலைத்து நிற்கிறது.',
      leftBadge: 'துரை. மாணிக்கம்',
      leftDescription: 'பாவலரேறு பெருஞ்சித்திரனாரின் இயற்பெயர் ஆகும்.',
      rightBadge: 'கணிச்சாறு',
      rightDescription: 'எட்டுத் தொகுதிகளாக வெளிவந்த பெருஞ்சித்திரனாரின் புகழ்பெற்ற கவிதை நூல்.',
      exampleTitle: 'சொல்லும் பொருளும்',
      examples: [
        ExampleBullet(label: 'ஆழிப்பெருக்கு', content: 'கடற்கோள் / சுனாமி (Tsunami / Sea surge)', isPrimary: true),
        ExampleBullet(label: 'மேதினி', content: 'உலகம் (Earth / World)', isPrimary: false),
        ExampleBullet(label: 'ஊழி', content: 'நீண்டதொரு காலப்பகுதி (Aeon / Era)', isPrimary: true),
        ExampleBullet(label: 'உள்ளப்பூட்டு', content: 'மனத்தின் அறியாமை (Ignorance of mind)', isPrimary: false),
      ],
      rememberTitle: 'முக்கியக் குறிப்புகள்',
      rememberPoints: [
        'கணிச்சாறு என்னும் நூலில் இப்பாடல் இடம்பெற்றுள்ளது.',
        'தென்மொழி, தமிழ்ச்சிட்டு, தமிழ்க்கழல் ஆகிய இதழ்களை நடத்தியவர் பெருஞ்சித்திரனார்.',
        'கொய்யாக்கனி, பாவியக்கொத்து, நூறாசிரியம் முதலிய நூல்களை இயற்றியுள்ளார்.',
      ],
      quizQuestions: [
        LessonQuizQuestion(
          question: 'பாவலரேறு பெருஞ்சித்திரனாரின் இயற்பெயர் என்ன?',
          options: ['சுப்புரத்தினம்', 'மாணிக்கம் (துரை. மாணிக்கம்)', 'அரங்கநாதன்', 'ராமானுஜம்'],
          correctAnswerIndex: 1,
          explanation: 'பெருஞ்சித்திரனாரின் இயற்பெயர் மாணிக்கம் ஆகும்.',
        ),
        LessonQuizQuestion(
          question: 'பெருஞ்சித்திரனார் நடத்திய இதழ்களுள் ஒன்று எது?',
          options: ['தென்மொழி', 'இந்தியா', 'குயில்', 'சுதேசமித்திரன்'],
          correctAnswerIndex: 0,
          explanation: 'தென்மொழி, தமிழ்ச்சிட்டு ஆகிய இதழ்களை நடத்தி தமிழ் உணர்வை வளர்த்தவர் பெருஞ்சித்திரனார்.',
        ),
      ],
      theorySections: [
        TheorySection(
          heading: '1. தமிழ்க்கும்மி பாடல் விளக்கம்',
          lines: [
            'இளம் பெண்களே! தமிழின் புகழ் எட்டுத் திசைகளிலும் பரவிடும் வகையில் கைகளை கொட்டி கும்மியடிப்போம்.',
            'பல நூறு ஆண்டுகளைக் கண்டது தமிழ் மொழி. அறிவு ஊற்றாகிய நூல்கள் பலவற்றைக் கொண்டது.',
            'பெரும் கடல் சீற்றங்கள், கால மாற்றங்கள் ஆகியவற்றால் அழியாமல் என்றும் நிலைத்து நிற்கிறது.',
            'பொய்யை அகற்றும் மொழி; மனத்தின் அறியாமையை நீக்கும் மொழி; அன்புடையோருக்கு இன்பம் தரும் பாட்டுகள் நிறைந்த மொழி.',
          ],
        ),
      ],
    ),

    // 3. வளர்தமிழ்
    LessonContent(
      lessonNumber: 3,
      title: 'வளர்தமிழ் - மூத்த தமிழ் மொழியின் சிறப்புகள்',
      introPrefix: 'மூத்த தமிழ் மொழி என்றும் இளமையானது, எளிமையானது, இனிமையானது மற்றும் ',
      highlightTerm1: 'சீர்மை மிக்கது',
      highlightTerm2: 'அறிவியல் தொழில்நுட்ப மொழி',
      introSuffix: ' எனப் போற்றப்படுகிறது.',
      leftBadge: 'தொன்மை',
      leftDescription: '"என்று பிறந்தவள் என்று உணராத இயல்பினளாம் எங்கள் தாய்" - பாரதியார்.',
      rightBadge: 'சீர்மை',
      rightDescription: 'அஃறிணை (அல்+திணை), பாகற்காய் (பாகு+அல்+காய்) போன்ற நயமிக்க சொல் மரபு.',
      exampleTitle: 'தமிழின் சிறப்புச் சொற்கள்',
      examples: [
        ExampleBullet(label: 'பூவின் ஏழு நிலைகள்', content: 'அரும்பு, மொட்டு, முகை, மலர், அலர், வீ, செம்மல்', isPrimary: true),
        ExampleBullet(label: 'மா என்னும் சொல்', content: 'மரம், விலங்கு, பெரிய, திருமகள், அழகு, அறிவு, அளவு, அழைத்தல்...', isPrimary: false),
        ExampleBullet(label: 'வளமை மொழி', content: 'தொல்காப்பியம், எட்டுத்தொகை, பத்துப்பாட்டு, சிலப்பதிகாரம், மணிமேகலை', isPrimary: true),
      ],
      rememberTitle: 'நினைவில் கொள்க',
      rememberPoints: [
        'தமிழ் எழுத்துகள் பெரும்பாலும் வலஞ்சுழி எழுத்துகளாகவே அமைந்துள்ளன (அ, எ, ஔ, ண, ஞ).',
        'இடஞ்சுழி எழுத்துகள்: ட, ய, ழ.',
        'இணையம், முகநூல், புலனம், தேடுபொறி, செயலிகளில் பயன்படும் தகுதிபெற்ற மொழி தமிழ்.',
      ],
      quizQuestions: [
        LessonQuizQuestion(
          question: 'பாகற்காய் என்பதைப் பிரித்து எழுதும் சரியான முறை எது?',
          options: ['பாகு + காய்', 'பாகற் + காய்', 'பாகு + அல் + காய்', 'பாக + காய்'],
          correctAnswerIndex: 2,
          explanation: 'பாகற்காய் கசப்புச் சுவை உடையது. கசப்புக்காய் எனக் கூறாமல் "இனிப்பு அல்லாத காய்" எனப் பாகு + அல் + காய் எனப் பெயரிட்டனர்.',
        ),
        LessonQuizQuestion(
          question: 'பூவின் நிலைகளில் ஐந்தாவது நிலை எது?',
          options: ['அரும்பு', 'மொட்டு', 'மலர்', 'அலர்'],
          correctAnswerIndex: 3,
          explanation: 'பூவின் ஏழு நிலைகள்: அரும்பு, மொட்டு, முகை, மலர், அலர், வீ, செம்மல்.',
        ),
      ],
      theorySections: [
        TheorySection(
          heading: '1. மூத்த மொழி & எளிய மொழி',
          lines: [
            'தமிழில் நமக்குக் கிடைத்துள்ள மிகப் பழமையான இலக்கண நூல் தொல்காப்பியம் ஆகும்.',
            'ஒரு மொழிக்கு இலக்கண நூல் உண்டென்றால் அதற்கு முன்பே இலக்கியங்கள் தோன்றியிருக்க வேண்டும்; எனவே தமிழ் மிகத் தொன்மையானது.',
            'தமிழ் பேசவும், படிக்கவும், எழுதவும் மிக எளிய மொழி. உயிரும் மெய்யும் இணைவதால் உயிர்மெய் ஒலிகள் தோன்றுகின்றன.',
          ],
        ),
        TheorySection(
          heading: '2. சீர்மை & புதுமை மொழி',
          lines: [
            'சீர்மை என்பது ஒழுங்குமுறையைக் குறிக்கும் சொல்.',
            'உயர்திணையின் எதிர்ச்சொல் தாழ்திணை என அமைய வேண்டும், ஆனால் நம் முன்னோர் "அல்+திணை" (உயர்வு அல்லாத திணை) எனப் பெயரிட்டனர்.',
            'இன்று கணினி, இணையம், வலைத்தளம், முகநூல், புலனம் ஆகியவற்றிலும் தமிழ் சிறப்புடன் ஆளப்படுகிறது.',
          ],
        ),
      ],
    ),

    // 4. கனவு பலித்தது
    LessonContent(
      lessonNumber: 4,
      title: 'கனவு பலித்தது - தமிழில் அறிவியல் சிந்தனைகள்',
      introPrefix: 'தமிழில் படித்தாலும் அறிவியல் மேதையாக உயர முடியும் என்பதை மெய்ப்பித்த சாதனையாளர்கள் மற்றும் பழந்தமிழரின் ',
      highlightTerm1: 'ஐம்பூதக் கோட்பாடு',
      highlightTerm2: 'அறிவியல் உண்மைகள்',
      introSuffix: ' பற்றிய பாடம்.',
      leftBadge: 'அறிவியல் மேதைகள்',
      leftDescription: 'அப்துல் கலாம், மயில்சாமி அண்ணாதுரை, கே.சிவன் - தமிழில் பயின்ற இஸ்ரோ தலைவர்கள்.',
      rightBadge: 'பழந்தமிழ் அறிவியல்',
      rightDescription: 'தொல்காப்பியம், கார்நாற்பது, நற்றிணை, பதிற்றுப்பத்தில் பதிவான அறிவியல் உண்மைகள்.',
      exampleTitle: 'இலக்கியங்களில் அறிவியல் சான்றுகள்',
      examples: [
        ExampleBullet(label: 'ஐம்பூதங்கள் (தொல்காப்பியம்)', content: '"நிலம் தீ நீர் வளி விசும்போடு ஐந்தும் கலந்த மயக்கம் உலகம்"', isPrimary: true),
        ExampleBullet(label: 'மழை சுழற்சி (கார்நாற்பது)', content: '"கடல்நீர் முகந்த கமஞ்சூல் எழிலி" - கடல் நீர் ஆவியாகி மேகமாதல்', isPrimary: false),
        ExampleBullet(label: 'மருத்துவ அறுவைசிகிச்சை (பதிற்றுப்பத்து)', content: '"நெடுவெள்ளூசி நெடுவசி பறந்த வடு" - போர்க்காயத்தை வெண்ணிற ஊசியால் தைத்தல்', isPrimary: true),
        ExampleBullet(label: 'சுறாமீன் தையல் (நற்றிணை)', content: '"கோட்சுரா எறிந்தெனச் சுருங்கிய நரம்பின் முடிமுதிர் பரதவர்"', isPrimary: false),
      ],
      rememberTitle: 'நினைவில் கொள்க',
      rememberPoints: [
        'நிலம், நீர், தீ, காற்று, வானம் ஆகிய ஐந்தும் கலந்தது உலகம் எனத் தொல்காப்பியர் கூறினார்.',
        'திரவப் பொருள்களை எவ்வளவு அழுத்தினாலும் உருவளவை மாற்ற முடியாது - ஔவையார் ("ஆழ அமுக்கி முகக்கினும் ஆழ்கடல்நீர் நாழி முகவாது").',
        'தாய்மொழியில் பயின்றாலே உயர்வான அறிவியல் ஆய்வுகளைச் செய்ய முடியும்.',
      ],
      quizQuestions: [
        LessonQuizQuestion(
          question: '"கடல்நீர் முகந்த கமஞ்சூல் எழிலி" - என்ற அறிவியல் வரிகள் இடம்பெற்ற நூல் எது?',
          options: ['கார்நாற்பது', 'தொல்காப்பியம்', 'பதிற்றுப்பத்து', 'நற்றிணை'],
          correctAnswerIndex: 0,
          explanation: 'கடல் நீர் ஆவியாகி மேகமாகிப் பின் மழையாகப் பொழியும் நீர்ச்சுழற்சியைக் கார்நாற்பது விவரிக்கிறது.',
        ),
      ],
      theorySections: [
        TheorySection(
          heading: '1. கடிதத்தின் மையக்கருத்து',
          lines: [
            'இன்சுவை என்னும் மாணவி தன் அத்தை நறுமுகைக்கு எழுதிய கடிதமும் அதற்கு அத்தை கூறிய ஊக்கப் பதிலும் இப்பாடமாகும்.',
            'தமிழ் வழியில் படித்த பலர் மிகப்பெரிய அறிவியல் விஞ்ஞானிகளாகவும் சாதனையாளர்களாகவும் திகழ்கின்றனர்.',
            'முன்னாள் குடியரசுத் தலைவர் டாக்டர் ஏ.பி.ஜே. அப்துல் கலாம், சந்திரயான் திட்ட இயக்குநர் மயில்சாமி அண்ணாதுரை, இஸ்ரோ தலைவர் கே.சிவன் ஆகியோர் தமிழில் படித்தவர்களே.',
          ],
        ),
      ],
    ),

    // 5. தமிழ் எழுத்துகளின் வகையும் தொகையும்
    LessonContent(
      lessonNumber: 5,
      title: 'தமிழ் எழுத்துகளின் வகையும் தொகையும் (இலக்கணம்)',
      introPrefix: 'மொழியைப் பிழையின்றிப் பேசவும் எழுதவும் உதவுவது இலக்கணம். தமிழ் இலக்கணம் ஐந்து வகைப்படும். எழுத்துக்களின் ',
      highlightTerm1: 'உயிர், மெய், ஆய்தம்',
      highlightTerm2: 'மாத்திரை அளவு',
      introSuffix: ' பற்றி கற்போம்.',
      leftBadge: 'ஐந்து இலக்கணம்',
      leftDescription: 'எழுத்து, சொல், பொருள், யாப்பு, அணி என இலக்கணம் ஐந்து வகைப்படும்.',
      rightBadge: 'மாத்திரை',
      rightDescription: 'எழுத்துக்களை ஒலிக்க ஆகும் கால அளவு (கண் இமைக்கும் நேரம் அல்லது கைநொடிக்கும் நேரம்).',
      exampleTitle: 'மாத்திரை கால அளவுகள்',
      examples: [
        ExampleBullet(label: 'குறில் எழுத்து (அ, இ, உ, எ, ஒ)', content: '1 மாத்திரை', isPrimary: true),
        ExampleBullet(label: 'நெடில் எழுத்து (ஆ, ஈ, ஊ, ஏ, ஐ, ஓ, ஔ)', content: '2 மாத்திரைகள்', isPrimary: false),
        ExampleBullet(label: 'மெய் எழுத்துகள் (க், ங், ச்...)', content: '1/2 (அரை) மாத்திரை', isPrimary: true),
        ExampleBullet(label: 'ஆய்த எழுத்து (ஃ)', content: '1/2 (அரை) மாத்திரை', isPrimary: false),
      ],
      rememberTitle: 'நினைவில் கொள்க',
      rememberPoints: [
        'உயிர் எழுத்துகள் மொத்தம் 12 (குறில் 5, நெடில் 7).',
        'மெய் எழுத்துகள் மொத்தம் 18 (வல்லினம் 6, மெல்லினம் 6, இடையினம் 6).',
        'உயிர்மெய் எழுத்துகள் 216 (12 × 18), ஆய்த எழுத்து 1. மொத்த தமிழ் எழுத்துகள் 247.',
      ],
      quizQuestions: [
        LessonQuizQuestion(
          question: 'குறில் எழுத்தை ஒலிக்க ஆகும் மாத்திரை அளவு எவ்வளவு?',
          options: ['1/2 மாத்திரை', '1 மாத்திரை', '2 மாத்திரைகள்', '3 மாத்திரைகள்'],
          correctAnswerIndex: 1,
          explanation: 'குறில் எழுத்து 1 மாத்திரை அளவும், நெடில் எழுத்து 2 மாத்திரை அளவும் ஒலிக்கும்.',
        ),
        LessonQuizQuestion(
          question: 'மெல்லின மெய்யெழுத்துகளின் வரிசை எது?',
          options: ['க், ச், ட், த், ப், ற்', 'ங், ஞ், ண், ந், ம், ன்', 'ய், ர், ல், வ், ழ், ள்', 'அ, ஆ, இ, ஈ'],
          correctAnswerIndex: 1,
          explanation: 'மெல்லின எழுத்துகள்: ங், ஞ், ண், ந், ம், ன் (ஞமன நமன).',
        ),
      ],
      theorySections: [
        TheorySection(
          heading: '1. மெய் எழுத்துக்களின் வகைகள்',
          lines: [
            'வல்லினம்: க், ச், ட், த், ப், ற் (கசட தபற)',
            'மெல்லினம்: ங், ஞ், ண், ந், ம், ன் (ஙஞண நமன)',
            'இடையினம்: ய், ர், ல், வ், ழ், ள் (யரல வழள)',
          ],
        ),
      ],
    ),

    // 6. சிலப்பதிகாரம் & காணி நிலம்
    LessonContent(
      lessonNumber: 6,
      title: 'சிலப்பதிகாரம் & காணி நிலம் (இயற்கை வாழ்த்து)',
      introPrefix: 'நிலவையும், கதிரவனையும், மழையையும் போற்றும் சிலப்பதிகார இயற்கை வாழ்த்தும் பாரதியாரின் ',
      highlightTerm1: 'திங்களைப் போற்றுதும்',
      highlightTerm2: 'காணி நிலம் வேண்டும்',
      introSuffix: ' கனவுக் கவிதையும்.',
      leftBadge: 'இளங்கோவடிகள்',
      leftDescription: 'சேர மன்னர் மரபினர்; ஐம்பெருங் காப்பியங்களில் ஒன்றான சிலப்பதிகாரத்தை இயற்றியவர்.',
      rightBadge: 'பாரதியார்',
      rightDescription: 'காணி நிலத்தில் அழகிய மாளிகையும் தென்னைமரங்களும் நிலவொளியும் வேண்டும் எனப் பாடியவர்.',
      exampleTitle: 'பாடலின் சிறப்பு வரிகள்',
      examples: [
        ExampleBullet(label: 'திங்களைப் போற்றுதும்', content: 'சோழ மன்னனின் குளிர்ந்த வெண்கொற்றக் குடைபோல நிலவு உலகிற்கு அருள்புரிகிறது.', isPrimary: true),
        ExampleBullet(label: 'ஞாயிறு போற்றுதும்', content: 'சோழனின் ஆணைச்சக்கரம் போலக் கதிரவன் இமயத்தைச் சுற்றி வலம் வருகிறது.', isPrimary: false),
        ExampleBullet(label: 'மாமழை போற்றுதும்', content: 'சோழனின் கருணைபோல வானிலிருந்து மழை பொழிகிறது.', isPrimary: true),
      ],
      rememberTitle: 'நினைவில் கொள்க',
      rememberPoints: [
        'சிலப்பதிகாரத்தை இயற்றியவர் இளங்கோவடிகள்.',
        'தமிழின் முதல் காப்பியம் சிலப்பதிகாரம் (முத்தமிழ்க் காப்பியம், குடிமக்கள் காப்பியம்).',
        'பாரதியாரின் இயற்பெயர் சுப்பிரமணியன்; எட்டயபுர மன்னரால் "பாரதி" என்ற பட்டம் பெற்றவர்.',
      ],
      quizQuestions: [
        LessonQuizQuestion(
          question: 'தமிழின் முதல் காப்பியம் எது?',
          options: ['மணிமேகலை', 'சிலப்பதிகாரம்', 'சீவக சிந்தாமணி', 'குண்டலகேசி'],
          correctAnswerIndex: 1,
          explanation: 'தமிழின் முதல் காப்பியம் இளங்கோவடிகள் இயற்றிய சிலப்பதிகாரம் ஆகும்.',
        ),
      ],
      theorySections: [
        TheorySection(
          heading: '1. சிலப்பதிகார இயற்கை வாழ்த்து',
          lines: [
            'நூலின் தொடக்கத்தில் சந்திரன், சூரியன், மழை ஆகிய இயற்கை கூறுகளை வாழ்த்தித் தொடங்குகிறார் இளங்கோவடிகள்.',
            'சோழ மன்னனின் செங்கோல் சிறப்பையும் அவனது அருளையும் இயற்கையோடு ஒப்பிட்டுப் பாடுகிறார்.',
          ],
        ),
      ],
    ),

    // 7. சிறகின் ஓசை
    LessonContent(
      lessonNumber: 7,
      title: 'சிறகின் ஓசை - பறவைகள் வலசை போதல்',
      introPrefix: 'பறவைகள் தட்பவெப்ப நிலை மாற்றத்திற்காக இடம் பெயர்வது வலசை போதல் ஆகும். சிட்டுக்குருவிகளின் வாழ்வும் ',
      highlightTerm1: 'வலசை போதல்',
      highlightTerm2: 'டாக்டர் சலீம் அலி',
      introSuffix: ' பறவை உலகப் பாடமும்.',
      leftBadge: 'வலசை போதல்',
      leftDescription: 'உணவு, இருப்பிடம், இனப்பெருக்கத்திற்காகப் பறவைகள் கண்டம் விட்டு கண்டம் பறக்கின்றன.',
      rightBadge: 'டாக்டர் சலீம் அலி',
      rightDescription: 'இந்தியாவின் பறவை மனிதர்; "சிட்டுக்குருவியின் வீழ்ச்சி" என்னும் தன் வரலாற்று நூலை எழுதியவர்.',
      exampleTitle: 'வலசை போகும் தகவல்கள்',
      examples: [
        ExampleBullet(label: 'சத்திமுத்தப் புலவர் பாடல்', content: '"நாராய் நாராய் செங்கால் நாராய்... தென்திசைக் குமரி ஆடி வடதிசைக்கு ஏகுவீராயின்" (1500 ஆண்டுகளுக்கு முன்)', isPrimary: true),
        ExampleBullet(label: 'ஆர்டிக் ஆலா (Arctic Tern)', content: 'உலகிலேயே அதிக தொலைவு (22,000 கி.மீ) பயணம் செய்யும் பறவை இனம்', isPrimary: false),
        ExampleBullet(label: 'சிட்டுக்குருவி', content: 'கூடுகட்டி வாழும் பறவை; 3 முதல் 6 முட்டைகள் இட்டு 14 நாட்கள் அடைகாக்கும்', isPrimary: true),
      ],
      rememberTitle: 'நினைவில் கொள்க',
      rememberPoints: [
        'பறவைகள் நிலவு, விண்மீன், புவிஈர்ப்புப் புலம் ஆகியவற்றை அடிப்படையாகக் கொண்டே திசையறிகின்றன.',
        'வடக்கிலிருந்து தெற்கு நோக்கியும், மேற்கிலிருந்து கிழக்கு நோக்கியும் பறவைகள் வலசை போகின்றன.',
        '"மனிதன் இல்லாத உலகில் பறவைகள் வாழ முடியும்; பறவைகள் இல்லாத உலகில் மனிதன் வாழ முடியாது" - சலீம் அலி.',
      ],
      quizQuestions: [
        LessonQuizQuestion(
          question: 'உலகிலேயே மிக நீண்ட தொலைவு (22,000 கி.மீ) பயணம் செய்யும் பறவை எது?',
          options: ['செங்கால் நாரை', 'ஆர்டிக் ஆலா', 'கப்பல் பறவை', 'சிட்டுக்குருவி'],
          correctAnswerIndex: 1,
          explanation: 'ஆர்டிக் ஆலா உலகிலேயே 22,000 கி.மீ தூரம் வலசை போகும் சாதனைப் பறவையாகும்.',
        ),
      ],
      theorySections: [
        TheorySection(
          heading: '1. பறவைகள் வலசை போதலின் காரணங்கள்',
          lines: [
            'உணவு, இருப்பிடம், தட்பவெப்பநிலை மாற்றம், இனப்பெருக்கம் ஆகியவற்றிற்காகப் பறவைகள் இடம் பெயர்கின்றன.',
            'வலசையின் போது பறவைகளின் தலையில் சிறகு வளருதல், இறகுகளின் நிறம் மாறுதல், உடலில் கற்றையாக முடி வளருதல் போன்ற உடலியல் மாற்றங்கள் ஏற்படுகின்றன.',
          ],
        ),
      ],
    ),

    // 8. கிழவனும் கடலும்
    LessonContent(
      lessonNumber: 8,
      title: 'கிழவனும் கடலும் (The Old Man and the Sea)',
      introPrefix: 'நோபல் பரிசு பெற்ற உலகப் புகழ்பெற்ற புதினம். மனிதன் விடாமுயற்சியோடு போராடினால் எதையும் சாதிக்கலாம் என்ற ',
      highlightTerm1: 'சாண்டியாகோ',
      highlightTerm2: 'மனோலின்',
      introSuffix: ' பாத்திரங்களின் உன்னதக் கதை.',
      leftBadge: 'எர்னஸ்ட் ஹெமிங்வே',
      leftDescription: 'அமெரிக்க எழுத்தாளர்; 1954-ல் இந்நூலுக்காக நோபல் பரிசு பெற்றார்.',
      rightBadge: 'சாண்டியாகோ',
      rightDescription: '84 நாட்கள் மீன் கிடைக்காத போதும் தளராமல் 85-ஆம் நாள் கடலுக்குச் சென்ற முதிய மீனவர்.',
      exampleTitle: 'கதை மாந்தர்கள் & முக்கிய நிகழ்வுகள்',
      examples: [
        ExampleBullet(label: 'சாண்டியாகோ', content: 'முதிய மீனவர்; கடலில் தனியாகப் போராடும் வீரம் கொண்டவர்', isPrimary: true),
        ExampleBullet(label: 'மனோலின்', content: 'சாண்டியாகோவிடம் மீன்பிடிக்கப் பழகிய சிறுவன்', isPrimary: false),
        ExampleBullet(label: 'மார்லின் மீன்', content: 'தூண்டிலில் மாட்டிய மிகப்பெரிய மீன்; சாண்டியாகோவின் கடும் போராட்டத்திற்குப் பின் வசப்பட்டது', isPrimary: true),
      ],
      rememberTitle: 'நினைவில் கொள்க',
      rememberPoints: [
        'The Old Man and the Sea என்னும் ஆங்கிலப் புதினம் தமிழில் படக்கதையாகத் தரப்பட்டுள்ளது.',
        '1954 ஆம் ஆண்டு இந்நூலுக்கு இலக்கியத்திற்கான நோபல் பரிசு வழங்கப்பட்டது.',
        '"மனிதன் அழிக்கப்படலாம், ஆனால் ஒருபோதும் தோற்கடிக்கப்பட முடியாது" என்பது இந்நூலின் தத்துவம்.',
      ],
      quizQuestions: [
        LessonQuizQuestion(
          question: 'கிழவனும் கடலும் (The Old Man and the Sea) புதினத்தின் ஆசிரியர் யார்?',
          options: ['எர்னஸ்ட் ஹெமிங்வே', 'ஷேக்ஸ்பியர்', 'வள்ளுவர்', 'ரவீந்திரநாத் தாகூர்'],
          correctAnswerIndex: 0,
          explanation: 'எர்னஸ்ட் ஹெமிங்வே எழுதிய இந்நூலுக்கு 1954-ல் நோபல் பரிசு கிடைத்தது.',
        ),
      ],
      theorySections: [
        TheorySection(
          heading: '1. கதைச் சுருக்கம்',
          lines: [
            'சாண்டியாகோ என்ற முதியவருக்கு 84 நாட்களாக ஒரு மீனும் கிடைக்கவில்லை. அவருடன் மீன்பிடிக்க வந்த மனோலின் என்ற சிறுவனை அவனது பெற்றோர் வேறு படகிற்கு அனுப்பிவிட்டனர்.',
            '85-ஆம் நாள் கடலுக்குள் தூண்டிலிட்ட சாண்டியாகோவிற்கு மிகப்பெரிய மார்லின் மீன் சிக்கியது.',
            'இரவும் பகலும் போராடி மீனை அடக்கிப் படகின் பக்கவாட்டில் கட்டினார்; சுறா மீன்கள் தாக்கிய போதும் தன் எலும்புக் கூடான மீனோடு கரை சேர்ந்தார்.',
          ],
        ),
      ],
    ),

    // 9. முதல் எழுத்தும் சார்பெழுத்தும்
    LessonContent(
      lessonNumber: 9,
      title: 'முதல் எழுத்தும் சார்பெழுத்தும் (இலக்கணம்)',
      introPrefix: 'எழுத்துக்கள் முதல் எழுத்து, சார்பெழுத்து என இருவகைப்படும். பிற எழுத்துக்களுக்கு அடிப்படையாக விளங்கும் ',
      highlightTerm1: 'முதல் எழுத்து 30',
      highlightTerm2: 'சார்பெழுத்து 10 வகைகள்',
      introSuffix: ' பற்றி விரிவாக அறிவோம்.',
      leftBadge: 'முதல் எழுத்துகள் (30)',
      leftDescription: 'உயிர் எழுத்துகள் 12 + மெய் எழுத்துகள் 18 = மொத்தம் 30 எழுத்துகள்.',
      rightBadge: 'சார்பெழுத்துகள் (10)',
      rightDescription: 'முதல் எழுத்துக்களைச் சார்ந்து இயங்கும் 10 வகையான எழுத்துக்கள்.',
      exampleTitle: 'சார்பெழுத்தின் 10 வகைகள்',
      examples: [
        ExampleBullet(label: '1. உயிர்மெய்', content: 'உயிர் + மெய் இணைந்து பிறப்பது', isPrimary: true),
        ExampleBullet(label: '2. ஆய்தம் (ஃ)', content: 'முப்புள்ளி, முப்பாற்புள்ளி, தனிநிலை, அஃகேனம் என அழைக்கப்படும்', isPrimary: false),
        ExampleBullet(label: 'பிற சார்பெழுத்துகள்', content: 'உயிரளபெடை, ஒற்றளபெடை, குற்றியலுகரம், குற்றியலிகரம், ஐகாரக்குறுக்கம், ஔகாரக்குறுக்கம், மகரக்குறுக்கம், ஆய்தக்குறுக்கம்', isPrimary: true),
      ],
      rememberTitle: 'நினைவில் கொள்க',
      rememberPoints: [
        'ஆய்த எழுத்து தனக்கு முன் ஒரு குறில் எழுத்தையும், பின் ஒரு வல்லின உயிர்மெய் எழுத்தையும் பெற்று இடையில் மட்டுமே வரும் (எ.கா: அஃது, எஃகு).',
        'ஆய்த எழுத்து தனித்து இயங்காது.',
        'முதல் எழுத்துக்கள் இல்லையேல் சார்பெழுத்துக்கள் இல்லை.',
      ],
      quizQuestions: [
        LessonQuizQuestion(
          question: 'ஆய்த எழுத்தின் வேறு பெயர்களுள் ஒன்று எது?',
          options: ['முப்புள்ளி / முப்பாற்புள்ளி / தனிநிலை', 'உயிரெழுத்து', 'மெய்யெழுத்து', 'இடையினம்'],
          correctAnswerIndex: 0,
          explanation: 'ஆய்த எழுத்துக்கு முப்புள்ளி, முப்பாற்புள்ளி, தனிநிலை, அஃகேனம் என்ற சிறப்புப் பெயர்கள் உண்டு.',
        ),
      ],
      theorySections: [
        TheorySection(
          heading: '1. சார்பெழுத்து விளக்கம்',
          lines: [
            'முதல் எழுத்துக்களைச் சார்ந்து வரும் எழுத்துக்கள் சார்பெழுத்துக்கள் எனப்படும்.',
            'இவை 10 வகைப்படும்: உயிர்மெய், ஆய்தம், உயிரளபெடை, ஒற்றளபெடை, குற்றியலுகரம், குற்றியலிகரம், ஐகாரக்குறுக்கம், ஔகாரக்குறுக்கம், மகரக்குறுக்கம், ஆய்தக்குறுக்கம்.',
          ],
        ),
      ],
    ),

    // 10. திருக்குறள்
    LessonContent(
      lessonNumber: 10,
      title: 'திருக்குறள் - கடவுள் வாழ்த்து, வான்சிறப்பு & அன்புடைமை',
      introPrefix: 'உலகப் பொதுமறை எனப் போற்றப்படும் திருக்குறளின் அறநெறிகள் மனித வாழ்வின் மேன்மையை விளக்குகின்றன. ',
      highlightTerm1: '1330 குறட்பாக்கள்',
      highlightTerm2: 'உலகப் பொதுமறை',
      introSuffix: ' மூலம் நல்வாழ்வு வாழ்வோம்.',
      leftBadge: 'திருவள்ளுவர்',
      leftDescription: 'நாயனார், தேவர், முதற்பாவலர், தெய்வப்புலவர், பொய்யாமொழிப் புலவர் எனப் போற்றப்படுகிறார்.',
      rightBadge: 'முப்பால்',
      rightDescription: 'அறத்துப்பால் (38), பொருட்பால் (70), காமத்துப்பால் (25) என 133 அதிகாரங்கள்.',
      exampleTitle: 'முக்கியக் குறள்கள் & பொருள்',
      examples: [
        ExampleBullet(label: 'குறள் 1', content: 'அகர முதல எழுத்தெல்லாம் ஆதி பகவன் முதற்றே உலகு.', isPrimary: true),
        ExampleBullet(label: 'குறள் 11', content: 'வான்நின்று உலகம் வழங்கி வருதலால் தான்அமிழ்தம் என்றுணரற் பாற்று.', isPrimary: false),
        ExampleBullet(label: 'குறள் 71', content: 'அன்பிலார் எல்லாம் தமக்குரியர் அன்புடையார் என்பும் உரியர் பிறர்க்கு.', isPrimary: true),
        ExampleBullet(label: 'குறள் 99', content: 'இனிய உளவாக இன்னாத கூறல் கனிஇருப்பக் காய்கவர்ந் தற்று.', isPrimary: false),
      ],
      rememberTitle: 'நினைவில் கொள்க',
      rememberPoints: [
        'திருக்குறள் பதினெண்கீழ்க்கணக்கு நூல்களுள் ஒன்றாகும்.',
        'சாதி, மத, இன பேதமின்றி அனைவருக்கும் பொதுவான கருத்துக்களைக் கூறுவதால் உலகப் பொதுமறை எனப்படுகிறது.',
        'நூற்றுக்கும் மேற்பட்ட மொழிகளில் திருக்குறள் மொழிபெயர்க்கப்பட்டுள்ளது.',
      ],
      quizQuestions: [
        LessonQuizQuestion(
          question: 'திருக்குறளில் உள்ள மொத்த அதிகாரங்களின் எண்ணிக்கை எத்தனை?',
          options: ['100', '133', '150', '1330'],
          correctAnswerIndex: 1,
          explanation: 'திருக்குறளில் 133 அதிகாரங்களும், அதிகாரத்திற்கு 10 வீதம் 1330 குறள்களும் உள்ளன.',
        ),
      ],
      theorySections: [
        TheorySection(
          heading: '1. வாழ்வியல் விழுமியங்கள்',
          lines: [
            'அன்புடையவர்கள் தம் உடம்பையும் பிறர்க்கு ஈந்து மகிழ்வர்.',
            'இனிய சொற்கள் இருக்கும்போது துன்பம் தரும் கடுஞ்சொற்களைப் பேசுவது இனிய பழம் இருக்கும் போது காயைத் தின்பதற்கு ஒப்பானது.',
          ],
        ),
      ],
    ),

    // 11. துன்பத்தை வெல்லும் கல்வி
    LessonContent(
      lessonNumber: 11,
      title: 'துன்பத்தை வெல்லும் கல்வி - பட்டுக்கோட்டை கல்யாணசுந்தரம்',
      introPrefix: 'ஏட்டில் படித்ததோடு இருந்துவிடாதே; கல்வி கற்றதன் பயனை வாழ்வின் ஒழுக்க நெறிகளில் கடைப்பிடிக்க வேண்டும் என ',
      highlightTerm1: 'மக்கள் கவிஞர்',
      highlightTerm2: 'உழைப்பாளர்களின் மேன்மை',
      introSuffix: ' மூலம் பாடுகிறார்.',
      leftBadge: 'மக்கள் கவிஞர்',
      leftDescription: 'பட்டுக்கோட்டை கல்யாணசுந்தரம் எளிய தமிழில் சமூக சீர்திருத்தக் கருத்துக்களைப் பாடியவர்.',
      rightBadge: 'கல்வி நெறி',
      rightDescription: '"ஏட்டில் படித்ததோடு இருந்துவிடாதே - நீ ஏன் படித்தோம் என்பதையும் மறந்துவிடாதே!"',
      exampleTitle: 'பாடல் நயங்கள்',
      examples: [
        ExampleBullet(label: 'நல்லவர்கள் தூற்றும்படி', content: 'வளர்ந்துவிடாதே; மேலான மனிதர்களின் குணங்களை அறிந்து நட', isPrimary: true),
        ExampleBullet(label: 'மூத்தோர் சொல்', content: 'வார்த்தைகளை ஒருபோதும் மீறாதே; நற்பண்புகளில் பிறருக்கு வழிகாட்டு', isPrimary: false),
        ExampleBullet(label: 'உழைப்பின் உயர்வு', content: 'பிறர் உழைப்பில் வாழாமல் தன் சொந்த உழைப்பில் வாழ்வதே பெருமை', isPrimary: true),
      ],
      rememberTitle: 'நினைவில் கொள்க',
      rememberPoints: [
        'பட்டுக்கோட்டை கல்யாணசுந்தரம் "மக்கள் கவிஞர்" எனச் சிறப்புப் பெயர் பெற்றவர்.',
        'திரையிசைப் பாடல்களில் உழைப்பாளர்களின் உயர்வைப் போற்றியவர்.',
        'கல்வி என்பது ஏட்டறிவோடு நின்றுவிடாமல் ஒழுக்கமாகவும் திகழ வேண்டும்.',
      ],
      quizQuestions: [
        LessonQuizQuestion(
          question: '"மக்கள் கவிஞர்" என்று அழைக்கப்படுபவர் யார்?',
          options: ['பாரதிதாசன்', 'பட்டுக்கோட்டை கல்யாணசுந்தரம்', 'உடுமலை நாராயணகவி', 'கண்ணதாசன்'],
          correctAnswerIndex: 1,
          explanation: 'பட்டுக்கோட்டை கல்யாணசுந்தரம் எளிய மக்களின் பாடல்களைப் பாடியதால் மக்கள் கவிஞர் எனப்படுகிறார்.',
        ),
      ],
      theorySections: [
        TheorySection(
          heading: '1. பாடலின் மையக்கருத்து',
          lines: [
            'நாம் நூல்களைக் கற்றதோடு நின்றுவிடாமல், கற்றதன் பயனை நினைவில் வைத்து வாழ வேண்டும்.',
            'நாட்டின் சட்டதிட்டங்களுக்கு மதிப்பளித்து நடக்க வேண்டும்; பெரியோரின் அறிவுரைகளைக் கேட்டுப் பணிவோடு செயல்பட வேண்டும்.',
          ],
        ),
      ],
    ),

    // 12. கல்விக்கண் திறந்தவர் & நூலகம் நோக்கி
    LessonContent(
      lessonNumber: 12,
      title: 'கல்விக்கண் திறந்தவர் & நூலகம் நோக்கி',
      introPrefix: 'கிராமந்தோறும் பள்ளிகளைத் திறந்து மதிய உணவுத் திட்டம் கொண்டுவந்த கர்மவீரர் காமராசர் மற்றும் ஆசியாவின் 2வது பெரிய ',
      highlightTerm1: 'கர்மவீரர் காமராசர்',
      highlightTerm2: 'அண்ணா நூற்றாண்டு நூலகம்',
      introSuffix: ' பற்றிய உன்னதப் பாடம்.',
      leftBadge: 'கல்விக்கண் திறந்தவர்',
      leftDescription: 'தந்தை பெரியாரால் "கல்விக்கண் திறந்தவர்" எனப் பாராட்டப்பட்டவர் கர்மவீரர் காமராசர்.',
      rightBadge: 'அண்ணா நூற்றாண்டு நூலகம்',
      rightDescription: 'சென்னையில் அமைந்துள்ள ஆசியாவின் இரண்டாவது மிகப்பெரிய நூலகம் (8 தளங்கள்).',
      exampleTitle: 'காமராசரின் கல்விப் புரட்சி & நூலகச் சிறப்புகள்',
      examples: [
        ExampleBullet(label: 'கல்வித் திட்டங்கள்', content: 'இலவசக் கட்டாயக் கல்விச் சட்டம், மதிய உணவுத் திட்டம், சீருடைத் திட்டம்', isPrimary: true),
        ExampleBullet(label: 'பாரத ரத்னா விருது', content: '1976 ஆம் ஆண்டு காமராசருக்கு பாரத ரத்னா விருது வழங்கி நடுவண் அரசு சிறப்பித்தது', isPrimary: false),
        ExampleBullet(label: 'அண்ணா நூற்றாண்டு நூலகம்', content: 'தரைத்தளத்தில் பிரெய்லி பிரிவு, முதல் தளத்தில் குழந்தைகள் பிரிவு (20,000+ நூல்கள்)', isPrimary: true),
        ExampleBullet(label: 'நூலகத் தந்தை', content: 'இந்திய நூலக அறிவியலின் தந்தை என அழைக்கப்படுபவர் முனைவர் எஸ்.ஆர். அரங்கநாதன்', isPrimary: false),
      ],
      rememberTitle: 'நினைவில் கொள்க',
      rememberPoints: [
        'காமராசர் காலத்தில் 1 மைல் தூரத்தில் தொடக்கப்பள்ளியும், 3 மைல் தூரத்தில் நடுநிலைப்பள்ளியும், 5 மைல் தூரத்தில் உயர்நிலைப்பள்ளியும் திறக்கப்பட்டன.',
        'சென்னையில் உள்ள உள்நாட்டு வானூர்தி நிலையத்திற்கு காமராசர் பெயர் சூட்டப்பட்டுள்ளது.',
        'சிறந்த நூலகர்களுக்கு டாக்டர் எஸ்.ஆர். அரங்கநாதன் விருது வழங்கப்படுகிறது.',
      ],
      quizQuestions: [
        LessonQuizQuestion(
          question: 'காமராசரை "கல்விக்கண் திறந்தவர்" என்று பாராட்டியவர் யார்?',
          options: ['அண்ணா', 'தந்தை பெரியார்', 'பாரதியார்', 'நேரு'],
          correctAnswerIndex: 1,
          explanation: 'காமராசரின் தன்னலமற்ற கல்விச் சேவையைப் பாராட்டி தந்தை பெரியார் அவரை "கல்விக்கண் திறந்தவர்" என்றார்.',
        ),
        LessonQuizQuestion(
          question: 'இந்திய நூலக அறிவியலின் தந்தை என்று போற்றப்படுபவர் யார்?',
          options: ['முனைவர் எஸ்.ஆர். அரங்கநாதன்', 'காமராசர்', 'திருவள்ளுவர்', 'உ.வே. சாமிநாதையர்'],
          correctAnswerIndex: 0,
          explanation: 'இந்திய நூலக அறிவியலின் தந்தை முனைவர் எஸ்.ஆர். அரங்கநாதன் ஆவார்.',
        ),
      ],
      theorySections: [
        TheorySection(
          heading: '1. கர்மவீரர் காமராசரின் கல்வித் தொண்டுகள்',
          lines: [
            'பள்ளிக் குழந்தைகள் பசியின்றிப் படிக்க வேண்டும் என்பதற்காக மதிய உணவுத் திட்டத்தை அறிமுகப்படுத்தினார்.',
            'ஏழை, பணக்காரன் என்ற வேறுபாடின்றி அனைவரும் சமமாகப் பயில சீருடைத் திட்டத்தைக் கொண்டு வந்தார்.',
            'பள்ளிகளின் எண்ணிக்கையை பன்மடங்கு பெருக்கி தொடக்கக்கல்வியை அனைவருக்குமானதாக மாற்றினார்.',
          ],
        ),
        TheorySection(
          heading: '2. அண்ணா நூற்றாண்டு நூலகம் (சென்னை)',
          lines: [
            'ஆசியாவிலேயே இரண்டாவது மிகப்பெரிய நூலகமாகும். இது தரைத்தளத்தோடு எட்டுத் தளங்களைக் கொண்டுள்ளது.',
            'தரைத்தளம்: பார்வைத் திறன் குறைபாடுடையோருக்கான பிரெய்லி நூல்கள் மற்றும் ஒளிவட்டுகள்.',
            'முதல் தளம்: குழந்தைகளுக்கான உலகம் மற்றும் பருவ இதழ்கள்.',
            'ஏழாம் தளம்: அரசு ஆவணக் காப்பகம் மற்றும் போட்டித் தேர்வுப் பிரிவு.',
            'எட்டாம் தளம்: நூலகத்தின் நிர்வாகப் பிரிவு மற்றும் மின்னணு நூலகம்.',
          ],
        ),
      ],
    ),
  ];

  // ================= SCIENCE LESSONS (12 TOPICS) =================
  static const List<LessonContent> scienceLessons = [
    LessonContent(
      lessonNumber: 1,
      title: 'Plant Anatomy & Photosynthesis',
      introPrefix: 'Green plants are the primary energy producers on Earth through the magical biochemical process of ',
      highlightTerm1: 'photosynthesis',
      highlightTerm2: 'chlorophyll pigments',
      introSuffix: '.',
      leftBadge: 'Photosynthesis',
      leftDescription: '6CO₂ + 6H₂O + Sunlight ➔ C₆H₁₂O₆ + 6O₂ (Glucose & Oxygen).',
      rightBadge: 'Chlorophyll',
      rightDescription: 'Green photosynthetic pigment in chloroplasts that absorbs sunlight photons.',
      exampleTitle: 'Key Components',
      examples: [
        ExampleBullet(label: 'Light Reaction', content: 'Occurs in the thylakoid membranes of chloroplasts', isPrimary: true),
        ExampleBullet(label: 'Dark Reaction (Calvin Cycle)', content: 'Occurs in the stroma without direct light requirement', isPrimary: false),
        ExampleBullet(label: 'Stomata', content: 'Microscopic pores for gas exchange (CO₂ intake, O₂ release)', isPrimary: true),
      ],
      rememberTitle: 'Essential Principles',
      rememberPoints: [
        'Plants produce the oxygen we breathe as a byproduct of water photolysis.',
        'Xylem transports water and minerals upwards from roots.',
        'Phloem transports food (sucrose) bidirectionally to all plant parts.',
      ],
      quizQuestions: [
        LessonQuizQuestion(
          question: 'What is the primary gas ABSORBED by plants during photosynthesis?',
          options: ['Oxygen', 'Carbon Dioxide (CO₂)', 'Nitrogen', 'Helium'],
          correctAnswerIndex: 1,
          explanation: 'Plants absorb Carbon Dioxide from the air through stomata to produce glucose.',
        ),
        LessonQuizQuestion(
          question: 'Which plant vascular tissue is responsible for transporting water from roots to leaves?',
          options: ['Phloem', 'Xylem', 'Stomata', 'Chloroplast'],
          correctAnswerIndex: 1,
          explanation: 'Xylem vessels conduct water and dissolved minerals from roots to the upper parts.',
        ),
      ],
      theorySections: [
        TheorySection(
          heading: '1. Biochemical Mechanism of Photosynthesis',
          lines: [
            'Photosynthesis is the fundamental biological process that converts radiant solar energy into chemical energy.',
            'The chemical reaction: 6CO₂ + 6H₂O + Sunlight ➔ C₆H₁₂O₆ + 6O₂ (Glucose & Oxygen)',
            'Chloroplasts inside plant mesophyll cells contain the green pigment chlorophyll that captures light wavelengths.',
          ],
        ),
        TheorySection(
          heading: '2. Plant Vascular Transport Systems',
          lines: [
            'Xylem Tissue: Transports water and minerals unidirectionally from roots to stems and leaves via capillary action.',
            'Phloem Tissue: Transports synthesized organic sugars and nutrients bidirectionally from leaves to storage organs.',
            'Stomata: Guard-cell regulated pores on the leaf epidermis responsible for transpiration and gaseous exchange.',
          ],
        ),
      ],
    ),
  ];

  // ================= ENGLISH LESSONS =================
  // ================= ENGLISH & CLASS 6 SAMACHEER LESSONS (12 TOPICS) =================
  static const List<LessonContent> englishLessons = [
    // 1. Sea Turtles (Prose)
    LessonContent(
      lessonNumber: 1,
      title: 'Sea Turtles - Marine Biology & Conservation',
      introPrefix: 'Sea turtles are magnificent marine reptiles that have roamed the oceans for over 100 million years. India is home to five species of ',
      highlightTerm1: 'Olive Ridley',
      highlightTerm2: 'mass nesting (Arribada)',
      introSuffix: '.',
      leftBadge: '5 Species in India',
      leftDescription: 'Olive Ridley, Hawksbill, Green Sea Turtle, Loggerhead, and Leatherback.',
      rightBadge: 'Arribada',
      rightDescription: 'Mass nesting phenomenon on Odisha beaches where thousands of turtles nest together.',
      exampleTitle: 'Nesting & Biology Facts',
      examples: [
        ExampleBullet(label: 'Olive Ridley', content: 'Smallest species (~35 kg); nests between January and March', isPrimary: true),
        ExampleBullet(label: 'Leatherback', content: 'Largest sea turtle; grows up to 2.2 meters and weighs 700 kg', isPrimary: false),
        ExampleBullet(label: 'Nesting cavity', content: 'Mother scoops a 45 cm pit in the sand and lays ~100 ping-pong sized eggs', isPrimary: true),
        ExampleBullet(label: 'Incubation', content: 'Takes 45 to 60 days under the natural warmth of the sun', isPrimary: false),
      ],
      rememberTitle: 'Key Takeaways',
      rememberPoints: [
        'Sea turtles use front flippers to swim gracefully in water and haul themselves on land.',
        'Hatchlings follow the natural glow of the open sea horizon to reach the water.',
        'Threats include trawl fishing nets, coastal pollution, plastic debris, and artificial lights.',
      ],
      quizQuestions: [
        LessonQuizQuestion(
          question: 'Which is the largest marine sea turtle species in the world?',
          options: ['Olive Ridley', 'Hawksbill', 'Green Sea Turtle', 'Leatherback'],
          correctAnswerIndex: 3,
          explanation: 'The Leatherback is the largest, growing up to 2.2 m and weighing up to 700 kg.',
        ),
        LessonQuizQuestion(
          question: 'What is the term "Arribada" used to describe?',
          options: ['Underwater migration', 'Mass nesting of Olive Ridley turtles', 'Deep sea diving', 'Egg hatching season'],
          correctAnswerIndex: 1,
          explanation: 'Arribada (Spanish for arrival) refers to thousands of female Olive Ridley turtles nesting simultaneously.',
        ),
      ],
      theorySections: [
        TheorySection(
          heading: '1. Marine Life of Sea Turtles',
          lines: [
            'Unlike land tortoises, sea turtles live almost their entire lives in open oceans.',
            'Only female sea turtles return to dry land, strictly to lay eggs on the same beaches where they were born.',
            'The eggs incubate in sandy beach nests for 45 to 60 days before baby hatchlings emerge at night.',
          ],
        ),
        TheorySection(
          heading: '2. Conservation Efforts in India',
          lines: [
            'Community groups like the Students\' Sea Turtle Conservation Network (SSTCN) in Chennai patrol beaches.',
            'Turtles are protected under Schedule I of the Wildlife Protection Act, 1972.',
          ],
        ),
      ],
    ),

    // 2. The Crocodile (Poem)
    LessonContent(
      lessonNumber: 2,
      title: 'The Crocodile - Lewis Carroll',
      introPrefix: 'A delightfully humorous and ironic poem portraying the deceptive gentleness of the predatory ',
      highlightTerm1: 'Nile Crocodile',
      highlightTerm2: 'Alice in Wonderland',
      introSuffix: '.',
      leftBadge: 'Lewis Carroll',
      leftDescription: 'English author famous for "Alice’s Adventures in Wonderland".',
      rightBadge: 'Nile River',
      rightDescription: 'The longest river in Africa where the smiling crocodile pours golden water.',
      exampleTitle: 'Poem Stanzas & Glossary',
      examples: [
        ExampleBullet(label: 'Stanza 1', content: '"How doth the little crocodile / Improve his shining tail / And pour the waters of the Nile / On every golden scale!"', isPrimary: true),
        ExampleBullet(label: 'Stanza 2', content: '"How cheerful he seems to grin / How neatly spreads his claws / And welcomes little fishes in / With gently smiling jaws!"', isPrimary: false),
        ExampleBullet(label: 'doth', content: 'Archaic / Old English form of "does"', isPrimary: true),
        ExampleBullet(label: 'improve', content: 'To make better or polish', isPrimary: false),
      ],
      rememberTitle: 'Poetic Analysis',
      rememberPoints: [
        'Rhyme Scheme: abab cdcd (crocodile/Nile, tail/scale, grin/in, claws/jaws).',
        'The poem uses humor to contrast the crocodile\'s gentle smile with its deadly predatory jaws.',
        'Madras Crocodile Bank in Kovalam, Chennai is one of the world’s largest reptile conservation parks.',
      ],
      quizQuestions: [
        LessonQuizQuestion(
          question: 'Who is the poet of "The Crocodile"?',
          options: ['Ruskin Bond', 'Lewis Carroll', 'William Wordsworth', 'Sara Coleridge'],
          correctAnswerIndex: 1,
          explanation: 'Lewis Carroll wrote "The Crocodile" in his masterpiece "Alice in Wonderland".',
        ),
      ],
      theorySections: [
        TheorySection(
          heading: '1. Summary and Central Theme',
          lines: [
            'The poem describes a cunning crocodile that seems cheerful, polishing its golden scales with Nile water.',
            'Underneath its warm smile and open claws, it traps unsuspecting fishes into its jaws.',
          ],
        ),
      ],
    ),

    // 3. Owlie (Supplementary)
    LessonContent(
      lessonNumber: 3,
      title: 'Owlie - Vijaya Ghose',
      introPrefix: 'A heartwarming story about Payal and her mother who rescue an abandoned baby ',
      highlightTerm1: 'spotted owlet',
      highlightTerm2: 'family library',
      introSuffix: '.',
      leftBadge: 'Vijaya Ghose',
      leftDescription: 'Indian children’s author and former editor of the Limca Book of Records.',
      rightBadge: 'Owlie',
      rightDescription: 'A tiny ball of brown and grey feathers rescued by Shefali Didi.',
      exampleTitle: 'Plot Highlights',
      examples: [
        ExampleBullet(label: 'Rescue', content: 'Shefali Didi brings a baby owlet in a cardboard carton to Payal’s house', isPrimary: true),
        ExampleBullet(label: 'Diet', content: 'Mother cooks minced meat; Owlie pretends to be dead before eating eagerly', isPrimary: false),
        ExampleBullet(label: 'The Library', content: 'Owlie is housed in the library room filled with books and natural perches', isPrimary: true),
        ExampleBullet(label: 'The Disappearance', content: 'Owlie seemingly escapes through an open door, only to be found sleeping high on the bookshelf', isPrimary: false),
      ],
      rememberTitle: 'Key Takeaways',
      rememberPoints: [
        'Owlets have excellent camouflage feathers and can turn their heads up to 270 degrees.',
        'Animals in distress need gentle care, patience, and compassion.',
      ],
      quizQuestions: [
        LessonQuizQuestion(
          question: 'Where was Owlie eventually found after everyone thought she had flown away?',
          options: ['In the garden tree', 'On the highest bookshelf in the library', 'Under the kitchen table', 'In Shefali Didi\'s bag'],
          correctAnswerIndex: 1,
          explanation: 'Owlie was quietly perched on the top shelf of the library behind the curtains.',
        ),
      ],
      theorySections: [
        TheorySection(
          heading: '1. Character & Narrative Insight',
          lines: [
            'Payal\'s household is animal-friendly, having rescued dogs, cats, and birds.',
            'Owlie\'s comical habits—rolling over on her back and winking one eye—bring happiness to the family.',
          ],
        ),
      ],
    ),

    // 4. Types of Sentences & Grammar Checkpoint
    LessonContent(
      lessonNumber: 4,
      title: 'Types of Sentences & Language Checkpoint',
      introPrefix: 'A sentence is a group of words expressing a complete thought. Sentences are classified into ',
      highlightTerm1: 'four major types',
      highlightTerm2: 'Subject & Predicate',
      introSuffix: '.',
      leftBadge: '4 Sentence Types',
      leftDescription: 'Declarative, Imperative, Interrogative, and Exclamatory.',
      rightBadge: 'Language Checkpoint',
      rightDescription: 'Proper usage of who/whom, how many/how much, and what/which.',
      exampleTitle: 'Sentence Classifications',
      examples: [
        ExampleBullet(label: 'Declarative (Statement)', content: 'Olive Ridley turtles lay eggs on the beach. (Ends with .)', isPrimary: true),
        ExampleBullet(label: 'Imperative (Command/Request)', content: 'Please close the library door quietly. (Ends with .)', isPrimary: false),
        ExampleBullet(label: 'Interrogative (Question)', content: 'Where do sea turtles swim during migration? (Ends with ?)', isPrimary: true),
        ExampleBullet(label: 'Exclamatory (Emotion)', content: 'What a magnificent crocodile this is! (Ends with !)', isPrimary: false),
      ],
      rememberTitle: 'Language Rules',
      rememberPoints: [
        'Use "who" for subjects (He/She) and "whom" for objects (Him/Her).',
        'Use "how many" for countable nouns (books, apples) and "how much" for uncountable nouns (water, luggage).',
        'Use "which" for limited choices and "what" for open choices.',
      ],
      quizQuestions: [
        LessonQuizQuestion(
          question: 'Identify the sentence type: "How beautiful the sea turtle hatchlings look!"',
          options: ['Declarative', 'Imperative', 'Interrogative', 'Exclamatory'],
          correctAnswerIndex: 3,
          explanation: 'It expresses strong wonder and emotion and ends with an exclamation mark.',
        ),
        LessonQuizQuestion(
          question: 'Choose the correct word: "________ luggage did you bring on the trip?"',
          options: ['How many', 'How much', 'How few', 'What number'],
          correctAnswerIndex: 1,
          explanation: 'Luggage is an uncountable noun, so "How much" is grammatically correct.',
        ),
      ],
      theorySections: [
        TheorySection(
          heading: '1. Subject and Predicate',
          lines: [
            'Subject: The person, animal, or thing performing the action (e.g. "The baby turtles").',
            'Predicate: The verb and modifying phrase explaining the action (e.g. "crawled swiftly into the sea").',
          ],
        ),
      ],
    ),

    // 5. When the Trees Walked - Part 1 (Prose)
    LessonContent(
      lessonNumber: 5,
      title: 'When the Trees Walked (Part 1) - Ruskin Bond',
      introPrefix: 'Ruskin Bond recounts his childhood days in Dehradun with his grandfather, learning why trees are essential for ',
      highlightTerm1: 'nature\'s balance',
      highlightTerm2: 'forest planting',
      introSuffix: '.',
      leftBadge: 'Ruskin Bond',
      leftDescription: 'Renowned Indian author who writes affectionately about nature and the Himalayas.',
      rightBadge: 'Dehradun Foothills',
      rightDescription: 'Scenic valleys where grandfather planted trees on rocky dry riverbeds.',
      exampleTitle: 'Story Excerpts & Wisdom',
      examples: [
        ExampleBullet(label: 'Tendril movement', content: 'A tendril of a creeping vine slowly moved towards grandfather across the veranda steps', isPrimary: true),
        ExampleBullet(label: 'Why we need trees', content: 'To keep the desert away, attract rain, bind the soil, and provide fruits and wood', isPrimary: false),
        ExampleBullet(label: 'The Island Project', content: 'Grandfather and Ruskin planted tamarind, laburnum, and coral tree saplings on a dry island', isPrimary: true),
      ],
      rememberTitle: 'Grandfather’s Philosophy',
      rememberPoints: [
        '"If a small mango tree can grow on this dry island, so can others."',
        'Trees walk by spreading their seeds through wind, rivers, and animals.',
        'We must plant trees for birds and wild animals, not merely for human timber.',
      ],
      quizQuestions: [
        LessonQuizQuestion(
          question: 'Which author wrote the story "When the Trees Walked"?',
          options: ['R.K. Narayan', 'Ruskin Bond', 'Lewis Carroll', 'Rabindranath Tagore'],
          correctAnswerIndex: 1,
          explanation: 'Ruskin Bond wrote this autobiographical story about his nature-loving grandfather.',
        ),
      ],
      theorySections: [
        TheorySection(
          heading: '1. Grandfather’s Tree-Planting Mission',
          lines: [
            'Grandfather was passionate about forestry and planted saplings across barren slopes.',
            'During the monsoon, he and young Ruskin crossed streams to plant saplings on a rocky riverbed.',
          ],
        ),
      ],
    ),

    // 6. When the Trees Walked - Part 2 (Prose)
    LessonContent(
      lessonNumber: 6,
      title: 'When the Trees Walked (Part 2) - The Forest Blooms',
      introPrefix: 'Years after leaving Dehradun and returning from World War II, the author visits the island to witness a miraculous ',
      highlightTerm1: 'green forest',
      highlightTerm2: 'singing birds & deer',
      introSuffix: '.',
      leftBadge: 'Transformed Island',
      leftDescription: 'The barren rocky island grew into a lush woodland of red coral and yellow laburnum.',
      rightBadge: 'Living Legacy',
      rightDescription: 'Grandfather’s saplings spread seeds and created a thriving sanctuary for wildlife.',
      exampleTitle: 'The Miracle of Nature',
      examples: [
        ExampleBullet(label: 'Red blossoms', content: 'Coral tree flowers attracted koels, bulbuls, and monkeys', isPrimary: true),
        ExampleBullet(label: 'Spotted deer', content: 'Cheetal deer found shelter under the shady canopy', isPrimary: false),
        ExampleBullet(label: 'The trees walked', content: 'Grandfather’s trees multiplied and spread across the entire valley', isPrimary: true),
      ],
      rememberTitle: 'Key Takeaways',
      rememberPoints: [
        'A single act of planting seeds can restore an entire ecosystem over decades.',
        'Nature responds with boundless beauty when humans nurture it with love.',
      ],
      quizQuestions: [
        LessonQuizQuestion(
          question: 'What had the rocky river island transformed into when the author returned years later?',
          options: ['A dry wasteland', 'A bustling marketplace', 'A lush green forest with wildlife', 'A large stone dam'],
          correctAnswerIndex: 2,
          explanation: 'The saplings had grown into magnificent blooming trees filled with birds and animals.',
        ),
      ],
      theorySections: [
        TheorySection(
          heading: '1. The Message of Afforestation',
          lines: [
            'Deforestation causes soil erosion and flash floods.',
            'Afforestation brings back rainfall, cooling shade, and natural biodiversity.',
          ],
        ),
      ],
    ),

    // 7. Trees (Poem)
    LessonContent(
      lessonNumber: 7,
      title: 'Trees - Sara Coleridge',
      introPrefix: 'A lyrical exploration of the diverse tree species of the Indian landscape, celebrating their ',
      highlightTerm1: 'unique traits',
      highlightTerm2: 'rhythm & imagery',
      introSuffix: '.',
      leftBadge: 'Sara Coleridge',
      leftDescription: 'English poet known for her evocative verses on nature and botanical life.',
      rightBadge: 'Indian Trees',
      rightDescription: 'Banyan, Peepul, Coconut, Neem, Tamarind, and Date Palm.',
      exampleTitle: 'Poetic Characteristics',
      examples: [
        ExampleBullet(label: 'Banyan', content: 'The largest of trees with sprawling aerial roots', isPrimary: true),
        ExampleBullet(label: 'Peepul', content: 'Quivers and whispers in the gentlest breeze', isPrimary: false),
        ExampleBullet(label: 'Coconut', content: 'Grows up straight, tall, and resilient', isPrimary: true),
        ExampleBullet(label: 'Neem', content: 'Produces small medicinal fruits and purifying leaves', isPrimary: false),
        ExampleBullet(label: 'Tamarind', content: 'Provides deep pleasant shade on hot sunny days', isPrimary: true),
      ],
      rememberTitle: 'Poem Highlights',
      rememberPoints: [
        'Every tree species has a distinct shape, leaf pattern, and ecological purpose.',
        'Rhyming words: trees/breeze, tall/small, shade/blade.',
      ],
      quizQuestions: [
        LessonQuizQuestion(
          question: 'Which tree is described in the poem as having leaves as sharp as a blade?',
          options: ['Banyan tree', 'Neem tree', 'Date palm', 'Tamarind tree'],
          correctAnswerIndex: 2,
          explanation: '"The Date’s leaf is as sharp as a blade" - describing the spiky foliage of the date palm.',
        ),
      ],
      theorySections: [
        TheorySection(
          heading: '1. Botanical Poetry Appreciation',
          lines: [
            'The poem encourages students to observe trees in their neighborhood.',
            'Trees symbolize longevity, shelter, and natural beauty.',
          ],
        ),
      ],
    ),

    // 8. The Apple Tree and the Farmer (Supplementary)
    LessonContent(
      lessonNumber: 8,
      title: 'The Apple Tree and the Farmer',
      introPrefix: 'A thought-provoking fable about environmental conservation, showing how every tree supports a ',
      highlightTerm1: 'web of life',
      highlightTerm2: 'honeycomb awakening',
      introSuffix: '.',
      leftBadge: 'The Old Apple Tree',
      leftDescription: 'Home to chirping sparrows, playful squirrels, and humming honeybees.',
      rightBadge: 'The Farmer',
      rightDescription: 'Planned to cut the tree for wood until he realized its irreplaceable worth.',
      exampleTitle: 'Key Story Beats',
      examples: [
        ExampleBullet(label: 'Farmer\'s decision', content: 'Believed the old barren tree was useless and took his axe', isPrimary: true),
        ExampleBullet(label: 'Animal pleas', content: 'Birds and squirrels begged him not to destroy their home', isPrimary: false),
        ExampleBullet(label: 'The Honeycomb', content: 'A blow of the axe revealed a hollow full of delicious golden honey', isPrimary: true),
        ExampleBullet(label: 'Realization', content: 'The farmer tasted the honey, remembered his childhood memories, and dropped the axe', isPrimary: false),
      ],
      rememberTitle: 'Moral of the Story',
      rememberPoints: [
        'Nature provides value beyond direct timber or fruit harvests.',
        'Protecting animal habitats ensures ecological balance and benefits humans.',
      ],
      quizQuestions: [
        LessonQuizQuestion(
          question: 'What made the farmer change his mind about chopping down the apple tree?',
          options: ['A heavy rainstorm', 'Tasting sweet honey found inside the tree hollow', 'His wife stopped him', 'The axe broke'],
          correctAnswerIndex: 1,
          explanation: 'Tasting the sweet honey made him realize the tree was still fruitful and full of life.',
        ),
      ],
      theorySections: [
        TheorySection(
          heading: '1. Ecological Moral',
          lines: [
            'Trees are micro-habitats for birds, insects, and small mammals.',
            'Greed harms the environment, whereas empathy preserves life.',
          ],
        ),
      ],
    ),

    // 9. Nouns, Pronouns & Degrees of Comparison (Grammar)
    LessonContent(
      lessonNumber: 9,
      title: 'Nouns, Pronouns & Degrees of Comparison',
      introPrefix: 'Master the building blocks of descriptive English: noun categories, personal pronouns, and ',
      highlightTerm1: 'degrees of comparison',
      highlightTerm2: 'prepositions of place',
      introSuffix: '.',
      leftBadge: 'Noun Types',
      leftDescription: 'Proper (Chennai), Common (city), Collective (flock), Abstract (kindness).',
      rightBadge: '3 Degrees',
      rightDescription: 'Positive (tall), Comparative (taller), Superlative (tallest).',
      exampleTitle: 'Degrees of Comparison Examples',
      examples: [
        ExampleBullet(label: 'Positive', content: 'The banyan tree is tall.', isPrimary: true),
        ExampleBullet(label: 'Comparative', content: 'The coconut tree is taller than the neem tree.', isPrimary: false),
        ExampleBullet(label: 'Superlative', content: 'The redwood is the tallest tree in the forest.', isPrimary: true),
      ],
      rememberTitle: 'Grammar Rules',
      rememberPoints: [
        'Add -er and -est for regular one-syllable adjectives (fast, faster, fastest).',
        'Use "more" and "most" for multi-syllable adjectives (beautiful, more beautiful, most beautiful).',
        'Irregular forms: good / better / best, bad / worse / worst.',
      ],
      quizQuestions: [
        LessonQuizQuestion(
          question: 'What is the comparative degree of the adjective "good"?',
          options: ['Gooder', 'Better', 'Best', 'More good'],
          correctAnswerIndex: 1,
          explanation: 'The degrees of "good" are irregular: good (positive), better (comparative), best (superlative).',
        ),
      ],
      theorySections: [
        TheorySection(
          heading: '1. Collective and Abstract Nouns',
          lines: [
            'Collective Noun: A pride of lions, a flock of birds, a swarm of bees.',
            'Abstract Noun: Honesty, bravery, wisdom, beauty, friendship.',
          ],
        ),
      ],
    ),

    // 10. A Visitor from Distant Lands (Prose)
    LessonContent(
      lessonNumber: 10,
      title: 'A Visitor from Distant Lands - Spices & Trade',
      introPrefix: 'Discover how Indian spices shaped world history, seafaring voyages, and global culinary trade from ',
      highlightTerm1: 'Black Pepper (Black Gold)',
      highlightTerm2: 'Vasco da Gama & Columbus',
      introSuffix: '.',
      leftBadge: 'Black Gold',
      leftDescription: 'Indian black pepper from the Malabar coast was valued like pure gold in Europe.',
      rightBadge: 'Global Explorers',
      rightDescription: 'Vasco da Gama sailed to Calicut in 1498; Columbus discovered chillies in the Americas.',
      exampleTitle: 'Spices and Their Origins',
      examples: [
        ExampleBullet(label: 'Black Pepper', content: 'Native to Kerala/Tamil Nadu; used for food preservation and medicine', isPrimary: true),
        ExampleBullet(label: 'Chilli', content: 'Brought to India by the Portuguese from South America', isPrimary: false),
        ExampleBullet(label: 'Cinnamon & Cloves', content: 'Aromatic tree bark and flower buds used in cooking and dental remedies', isPrimary: true),
        ExampleBullet(label: 'Cardamom', content: '"Queen of Spices" grown in the Western Ghats', isPrimary: false),
      ],
      rememberTitle: 'Historical Facts',
      rememberPoints: [
        'Vasco da Gama reached Calicut (Kozhikode) in 1498 seeking black pepper.',
        'Spices not only add flavor but have powerful antiseptic and digestive properties.',
      ],
      quizQuestions: [
        LessonQuizQuestion(
          question: 'Which explorer landed at Calicut in 1498 in search of Indian black pepper?',
          options: ['Christopher Columbus', 'Vasco da Gama', 'Marco Polo', 'James Cook'],
          correctAnswerIndex: 1,
          explanation: 'Portuguese explorer Vasco da Gama discovered the direct sea route to India in 1498.',
        ),
      ],
      theorySections: [
        TheorySection(
          heading: '1. The Spice Route',
          lines: [
            'Ancient Greeks, Romans, and Arabs sailed to South India for pepper, ginger, and cardamom.',
            'Chilli peppers, tomatoes, and potatoes were introduced to India through international trade.',
          ],
        ),
      ],
    ),

    // 11. I Dream of Spices (Poem)
    LessonContent(
      lessonNumber: 11,
      title: 'I Dream of Spices - Raj Arumugam',
      introPrefix: 'A cheerful and relatable poem about a young boy sent on an errand to buy cooking spices who gets hilariously ',
      highlightTerm1: 'rattling off a grocery list',
      highlightTerm2: 'forgetful shopping trip',
      introSuffix: '.',
      leftBadge: 'Raj Arumugam',
      leftDescription: 'Poet who captures everyday childhood experiences with rhythmic simplicity.',
      rightBadge: 'Muthu\'s Shop',
      rightDescription: 'The local neighborhood grocery store where the comical blunder happens.',
      exampleTitle: 'The Poem Contrast',
      examples: [
        ExampleBullet(label: 'Mother\'s grocery list', content: '"Cinnamon, betel leaves, ginger and garlic"', isPrimary: true),
        ExampleBullet(label: 'Raj\'s singing', content: 'Singing joyfully on the walk to the grocery store', isPrimary: false),
        ExampleBullet(label: 'What Raj bought instead', content: '"Sesame seeds, onions, tomatoes and pickles!"', isPrimary: true),
      ],
      rememberTitle: 'Poetic Takeaways',
      rememberPoints: [
        'The poem celebrates the innocent forgetfulness of children.',
        'Uses everyday household imagery and musical rhythm.',
      ],
      quizQuestions: [
        LessonQuizQuestion(
          question: 'What did the boy\'s mother ask him to buy from Muthu\'s shop?',
          options: ['Apples, oranges, and bananas', 'Cinnamon, betel leaves, ginger and garlic', 'Sugar, tea, and milk', 'Biscuits and chocolates'],
          correctAnswerIndex: 1,
          explanation: 'His mother asked for cinnamon, betel leaves, ginger, and garlic.',
        ),
      ],
      theorySections: [
        TheorySection(
          heading: '1. Narrative Humor',
          lines: [
            'Raj sings enthusiastically along the way, forgets the original instructions, and blurts out completely different grocery items at the counter.',
          ],
        ),
      ],
    ),

    // 12. Stone Soup & Verbs and Tenses (Supplementary & Grammar)
    LessonContent(
      lessonNumber: 12,
      title: 'Stone Soup & English Verb Tenses',
      introPrefix: 'A classic European folklore about unity and community sharing, paired with foundational mastery of ',
      highlightTerm1: 'Verb Tenses',
      highlightTerm2: 'Conjunctions',
      introSuffix: '.',
      leftBadge: 'Stone Soup',
      leftDescription: 'A clever traveler boiling water with a magic stone inspires villagers to share ingredients.',
      rightBadge: '3 Simple Tenses',
      rightDescription: 'Past (cooked), Present (cooks), Future (will cook).',
      exampleTitle: 'Story Highlights & Verb Tenses',
      examples: [
        ExampleBullet(label: 'The Magic Stone', content: 'The traveler starts boiling a round stone in a large iron pot', isPrimary: true),
        ExampleBullet(label: 'Villagers\' sharing', content: 'Carrots, potatoes, cabbages, onions, and beef are gradually contributed', isPrimary: false),
        ExampleBullet(label: 'Simple Present', content: 'She reads books every evening. (Habitual action)', isPrimary: true),
        ExampleBullet(label: 'Simple Past', content: 'They shared the delicious soup together. (Completed action)', isPrimary: false),
        ExampleBullet(label: 'Simple Future', content: 'We will plant new trees tomorrow. (Upcoming action)', isPrimary: true),
      ],
      rememberTitle: 'Moral & Grammar Summary',
      rememberPoints: [
        'Sharing and collaboration can solve scarcity and bring joy to an entire community.',
        'Regular verbs form past tense with -ed (walk/walked), while irregular verbs change forms (eat/ate/eaten, write/wrote/written).',
      ],
      quizQuestions: [
        LessonQuizQuestion(
          question: 'What is the moral of the story "Stone Soup"?',
          options: ['Cooking stones creates magic', 'Sharing and working together benefits everyone', 'Never talk to travelers', 'Keep all food hidden'],
          correctAnswerIndex: 1,
          explanation: 'The story teaches that cooperation and generosity create abundance for everyone.',
        ),
        LessonQuizQuestion(
          question: 'Identify the past tense of the irregular verb "bring":',
          options: ['Bringed', 'Brought', 'Brang', 'Bringing'],
          correctAnswerIndex: 1,
          explanation: 'The past tense of "bring" is "brought".',
        ),
      ],
      theorySections: [
        TheorySection(
          heading: '1. Conjunctions in Sentence Construction',
          lines: [
            '"and" connects similar ideas; "but" shows contrast; "because" gives reason; "so" shows result.',
            'Example: The villagers were hesitant, BUT the aroma made them curious.',
          ],
        ),
      ],
    ),
  ];

  // ================= SOCIAL SCIENCE LESSONS =================
  static const List<LessonContent> socialLessons = [
    LessonContent(
      lessonNumber: 1,
      title: 'Indian Constitution & Fundamental Rights',
      introPrefix: 'The Constitution of India is the supreme legal document embodying the principles of democracy, ',
      highlightTerm1: 'sovereignty',
      highlightTerm2: 'fundamental rights',
      introSuffix: '.',
      leftBadge: 'Constitution',
      leftDescription: 'Adopted on 26 Nov 1949 and came into effect on 26 Jan 1950 (Republic Day).',
      rightBadge: 'Fundamental Rights',
      rightDescription: 'Guaranteed civil liberties in Part III (Articles 12 to 35).',
      exampleTitle: 'Six Fundamental Rights',
      examples: [
        ExampleBullet(label: 'Right to Equality', content: 'Articles 14 - 18 (Equal protection under the law)', isPrimary: true),
        ExampleBullet(label: 'Right to Freedom', content: 'Articles 19 - 22 (Speech, assembly, movement)', isPrimary: false),
        ExampleBullet(label: 'Right to Constitutional Remedies', content: 'Article 32 ("Heart and Soul" of Constitution)', isPrimary: true),
      ],
      rememberTitle: 'Key Facts',
      rememberPoints: [
        'Dr. B.R. Ambedkar was the Chairman of the Drafting Committee.',
        'India is a Sovereign, Socialist, Secular, Democratic Republic.',
        'Universal Adult Suffrage gives every citizen aged 18+ the right to vote.',
      ],
      quizQuestions: [
        LessonQuizQuestion(
          question: 'Who was the Chairman of the Drafting Committee of the Indian Constitution?',
          options: ['Mahatma Gandhi', 'Dr. B.R. Ambedkar', 'Jawaharlal Nehru', 'Sardar Patel'],
          correctAnswerIndex: 1,
          explanation: 'Dr. B.R. Ambedkar was the chief architect and Drafting Committee Chairman.',
        ),
        LessonQuizQuestion(
          question: 'On which historic date did the Constitution of India come into full effect?',
          options: ['15 August 1947', '26 November 1949', '26 January 1950', '2 October 1950'],
          correctAnswerIndex: 2,
          explanation: 'The Constitution came into force on 26 January 1950, celebrated as Republic Day.',
        ),
      ],
      theorySections: [
        TheorySection(
          heading: '1. Preamble & Democratic Structure of India',
          lines: [
            'The Constitution of India is the longest written national constitution of any sovereign state in the world.',
            'The Preamble proclaims India to be a Sovereign, Socialist, Secular, Democratic Republic committed to Justice, Liberty, Equality, and Fraternity.',
            'The Constitution guarantees a three-tier federal system comprising the Union Government, State Governments, and Local Panchayati Raj.',
          ],
        ),
      ],
    ),
  ];

  // ================= COMPUTER SCIENCE LESSONS =================
  static const List<LessonContent> computerLessons = [
    LessonContent(
      lessonNumber: 1,
      title: 'Python Programming & Algorithm Basics',
      introPrefix: 'Programming empowers computers to solve real-world problems through logical sequences called ',
      highlightTerm1: 'algorithms',
      highlightTerm2: 'Python syntax',
      introSuffix: '.',
      leftBadge: 'Variables',
      leftDescription: 'Named memory containers storing data values (strings, integers, floats).',
      rightBadge: 'Control Flow',
      rightDescription: 'Conditional if-else branching and loops that repeat execution blocks.',
      exampleTitle: 'Python Code Examples',
      examples: [
        ExampleBullet(label: 'Variable Assignment', content: 'score = 95\nname = "Arjun"', isPrimary: true),
        ExampleBullet(label: 'Condition', content: 'if score >= 90: print("Grade A")', isPrimary: false),
        ExampleBullet(label: 'For Loop', content: 'for i in range(5): print(i)', isPrimary: true),
      ],
      rememberTitle: 'Core Concepts',
      rememberPoints: [
        'Python uses indentation (whitespace) to define code blocks instead of curly braces.',
        'Lists in Python are mutable ordered collections defined with square brackets [1, 2, 3].',
        'Functions are defined with the "def" keyword and encourage code reuse.',
      ],
      quizQuestions: [
        LessonQuizQuestion(
          question: 'Which symbol is used for single-line comments in Python?',
          options: ['//', '/*', '#', '--'],
          correctAnswerIndex: 2,
          explanation: 'In Python, the hash symbol (#) is used to start a single-line comment.',
        ),
        LessonQuizQuestion(
          question: 'What data type will Python assign to the expression x = 15.5?',
          options: ['int', 'float', 'str', 'bool'],
          correctAnswerIndex: 1,
          explanation: 'Numbers with fractional decimal points are stored as floating-point numbers (float).',
        ),
      ],
      theorySections: [
        TheorySection(
          heading: '1. Introduction to Computational Thinking & Python',
          lines: [
            'Python is a high-level, interpreted, dynamically-typed programming language renowned for clear syntax.',
            'An algorithm is a finite, step-by-step procedure designed to solve a specific computational problem.',
            'Python programs execute line-by-line via the Python Virtual Machine (PVM) interpreter.',
          ],
        ),
      ],
    ),
  ];

  // ================= GENERAL KNOWLEDGE LESSONS =================
  static const List<LessonContent> gkLessons = [
    LessonContent(
      lessonNumber: 1,
      title: 'Tamil Nadu Heritage & World Wonders',
      introPrefix: 'Discover the rich architectural monuments, UNESCO heritage sites, and classical achievements of ',
      highlightTerm1: 'Tamil Nadu culture',
      highlightTerm2: 'global history',
      introSuffix: '.',
      leftBadge: 'Brihadisvara Temple',
      leftDescription: 'Thanjavur Big Temple built by Chola Emperor Raja Raja Chola I in 1010 AD.',
      rightBadge: 'Shore Temple',
      rightDescription: '8th-century Pallava architectural wonder located in Mamallapuram.',
      exampleTitle: 'Heritage Highlights',
      examples: [
        ExampleBullet(label: 'Classical Language', content: 'Tamil was declared India’s first Classical Language in 2004.', isPrimary: true),
        ExampleBullet(label: 'Kallanai Dam', content: 'Built across River Kaveri by Karikala Chola (2nd century AD).', isPrimary: false),
      ],
      rememberTitle: 'Fascinating Facts',
      rememberPoints: [
        'Mamallapuram monuments are recognized as a UNESCO World Heritage site.',
        'The Chola bronze sculptures are internationally renowned masterpieces of metallurgy.',
        'Tamil Nadu has the highest number of temples in India, earning the title "Land of Temples".',
      ],
      quizQuestions: [
        LessonQuizQuestion(
          question: 'Who built the world-famous Brihadisvara (Big Temple) in Thanjavur?',
          options: ['Karikala Chola', 'Raja Raja Chola I', 'Rajendra Chola', 'Narasimhavarman'],
          correctAnswerIndex: 1,
          explanation: 'Raja Raja Chola I constructed the Brihadisvara Temple between 1003 and 1010 AD.',
        ),
        LessonQuizQuestion(
          question: 'Which ancient dam across the Kaveri River was built by Karikala Chola?',
          options: ['Mettur Dam', 'Kallanai (Grand Anicut)', 'Bhavanisagar Dam', 'Vaigai Dam'],
          correctAnswerIndex: 1,
          explanation: 'Kallanai is one of the oldest active water-regulator structures in the world.',
        ),
      ],
      theorySections: [
        TheorySection(
          heading: '1. Great Living Chola Temples & Pallava Architecture',
          lines: [
            'Tamil Nadu boasts centuries of architectural mastery from the Sangam, Pallava, Chola, and Pandya dynasties.',
            'The Brihadisvara Temple in Thanjavur features an 80-tonne single granite block dome (Kumbam) placed atop a 216-foot vimanam.',
            'Kallanai Dam stands as a testimony to ancient hydraulic engineering, functioning actively for over 2,000 years.',
          ],
        ),
      ],
    ),
  ];
}
