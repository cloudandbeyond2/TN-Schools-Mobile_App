import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

interface PageInput {
  pageNumber: number;
  contentEnglish: string;
  contentTamil: string;
  illustration: string;
}

interface ChapterInput {
  chapterNumber: number;
  title: string;
  pages: PageInput[];
}

interface BookInput {
  title: string;
  author: string;
  genre: string;
  cover: string;
  color: string;
  language: string;
  moral: string;
  xpReward: number;
  gradeLevel: string;
  chapters: ChapterInput[];
}

const storiesData: BookInput[] = [
  // ─── CLASS 6 STORIES ──────────────────────────────────────────────────
  {
    title: 'Wings of Fire',
    author: 'Dr. APJ Abdul Kalam',
    genre: 'Biography',
    cover: '🚀',
    color: 'from-blue-600 to-indigo-850',
    language: 'Bilingual',
    moral: 'Dream big, work hard, and never let failure stop you.',
    xpReward: 100,
    gradeLevel: '6',
    chapters: [
      {
        chapterNumber: 1,
        title: 'The Boy of Rameswaram',
        pages: [
          {
            pageNumber: 1,
            contentEnglish: 'Young Abdul Kalam lived in the island town of Rameswaram. Every evening, after school, he would walk along the sandy beaches, watching seagulls fly. He wondered how these birds could soar so effortlessly high above the waves. He dreamed that one day, he too would fly into the infinite sky.',
            contentTamil: 'இளம் அப்துல் கலாம் இராமேஸ்வரம் தீவு நகரில் வசித்து வந்தார். ஒவ்வொரு மாலையும், பள்ளி முடிந்ததும், அவர் மணல் பரவிய கடற்கரையில் உலாவி, கடற்பறவைகள் பறப்பதைப் பார்ப்பார். இந்த பறவைகளால் எவ்வாறு அலைகளுக்கு மேலே இவ்வளவு எளிதாக உயரப் பறக்க முடிகிறது என்று அவர் வியப்பார். ஒரு நாள் தானும் எல்லையற்ற வானத்தில் பறப்போம் என்று அவர் கனவு கண்டார்.',
            illustration: '🌊🕊️👦'
          },
          {
            pageNumber: 2,
            contentEnglish: 'His family faced difficult times, and young Kalam wanted to help. Before dawn, he would run to the railway station to collect bundles of newspapers thrown from moving trains. He distributed them across town, learning the value of honest labor and discipline at a very early age.',
            contentTamil: 'அவரது குடும்பம் கடினமான சூழ்நிலைகளை எதிர்கொண்டது, இளம் கலாமும் அவர்களுக்கு உதவ விரும்பினார். விடியற்காலையில், அவர் நகரும் ரயில்களில் இருந்து வீசப்பட்ட செய்தித்தாள் மூட்டைகளை சேகரிக்க ரயில் நிலையத்திற்கு ஓடுவார். அவற்றை அவர் நகரம் முழுவதும் விநியோகித்து, நேர்மையான உழைப்பு மற்றும் ஒழுக்கத்தின் மதிப்பை மிக இளம் வயதிலேயே கற்றுக்கொண்டார்.',
            illustration: '📰🚂🏃'
          }
        ]
      },
      {
        chapterNumber: 2,
        title: 'The Flight of Dreams',
        pages: [
          {
            pageNumber: 3,
            contentEnglish: 'Kalam worked hard and joined the Madras Institute of Technology to study aerospace engineering. When his project design was delayed, his professor warned him that his scholarship would be cancelled. Kalam sat up all night, working without rest, and finished the design. The impressed professor hugged him, saying he had doubted Kalam in vain.',
            contentTamil: 'கலாம் கடினமாக உழைத்து விண்வெளி பொறியியல் பயில சென்னை தொழில்நுட்ப நிறுவனத்தில் சேர்ந்தார். அவரது திட்ட வடிவமைப்பு தாமதமானபோது, அவரது உதவித்தொகை ரத்து செய்யப்படும் என்று அவரது பேராசிரியர் எச்சரித்தார். கலாம் இரவு முழுவதும் அமர்ந்து, ஓய்வின்றி உழைத்து, வடிவமைப்புப் பணியை முடித்தார். இதைக் கண்டு வியந்த பேராசிரியர், கலாமை கட்டிப்பிடித்து, தான் வீணாக சந்தேகித்ததாகக் கூறினார்.',
            illustration: '✍️📐👨‍🔬'
          },
          {
            pageNumber: 4,
            contentEnglish: 'Years later, Dr. Kalam led India\'s first satellite launch vehicle, SLV-3, placing Rohini in orbit. Despite initial failures, he taught the nation that failure is not the end, but the first step towards learning. He urged students, "Great dreams of great dreamers are always transcended."',
            contentTamil: 'பல ஆண்டுகள் கழித்து, டாக்டர் கலாம் இந்தியாவின் முதல் செயற்கைக்கோள் ஏவு வாகனமான SLV-3 ஐ வழிநடத்தி, ரோகிணியை சுற்றுப்பாதையில் செலுத்தினார். ஆரம்பகால தோல்விகளுக்கு மத்தியிலும், தோல்வி என்பது முடிவல்ல, கற்றலின் முதல் படி என்பதை அவர் நாட்டிற்கு கற்பித்தார். "சிறந்த கனவு காண்பவர்களின் சிறந்த கனவுகள் எப்போதுமே வெல்லப்படும்" என்று அவர் மாணவர்களை வலியுறுத்தினார்.',
            illustration: '🚀🛰️🌠'
          }
        ]
      }
    ]
  },
  {
    title: 'Tenali Raman and the Brinjals',
    author: 'Traditional Folklore',
    genre: 'Folklore',
    cover: '🍛',
    color: 'from-purple-500 to-indigo-700',
    language: 'Bilingual',
    moral: 'Intelligence and quick thinking can save you from difficult situations.',
    xpReward: 80,
    gradeLevel: '6',
    chapters: [
      {
        chapterNumber: 1,
        title: 'The Forbidden Curry',
        pages: [
          {
            pageNumber: 1,
            contentEnglish: 'Tenali Raman\'s wife tasted a rare brinjal curry made of special brinjals from the King\'s private garden. She begged Tenali to get more for their son, even though stealing from the King\'s garden carried a death penalty. Tenali Raman was torn between his love for his family and the law.',
            contentTamil: 'தெனாலி ராமனின் மனைவி அரசனின் சிறப்புத் தோட்டத்தில் இருந்த அரிய கத்தரிக்காயில் செய்த கறியை ருசி பார்த்தாள். தன் மகனுக்காக மேலும் சில கத்தரிக்காய்களைக் கொண்டு வருமாறு அவள் தெனாலி ராமனிடம் கெஞ்சினாள். அரசனின் தோட்டத்தில் திருடினால் மரண தண்டனை கிடைக்கும் என்ற போதிலும் குடும்ப அன்பிற்காக அவர் யோசித்தார்.',
            illustration: '👑🍆🍲'
          }
        ]
      },
      {
        chapterNumber: 2,
        title: 'The Rainy Roof Dream',
        pages: [
          {
            pageNumber: 2,
            contentEnglish: 'Tenali stole the brinjals but knew his son might tell the guards. So, that night, he poured water on his sleeping son, saying it was raining. The next day, when the son told the King about eating brinjals in the rain, the court dismissed it as a child\'s dream, saving Tenali.',
            contentTamil: 'தெனாலி கத்தரிக்காய்களைத் திருடினார், ஆனால் தன் மகன் காவலர்களிடம் கூறிவிடுவான் என்று பயந்தார். எனவே அன்று இரவு தூங்கிக்கொண்டிருந்த மகன் மீது மழை பெய்வதாகக் கூறி தண்ணீரை ஊற்றினார். மறுநாள் மகன் மழையில் கத்தரிக்காய் சாப்பிட்டதாகக் கூறியபோது, நீதிமன்றம் அதை ஒரு குழந்தையின் கனவு என்று நிராகரித்தது.',
            illustration: '🌧️👦💤'
          }
        ]
      }
    ]
  },
  {
    title: 'Damon and Pythias',
    author: 'Greek Legend',
    genre: 'Classics',
    cover: '👬',
    color: 'from-teal-500 to-emerald-650',
    language: 'Bilingual',
    moral: 'True friendship is built on trust, sacrifice, and keeping your promises.',
    xpReward: 80,
    gradeLevel: '6',
    chapters: [
      {
        chapterNumber: 1,
        title: 'The Tyrant\'s Sentence',
        pages: [
          {
            pageNumber: 1,
            contentEnglish: 'Pythias was sentenced to death by the cruel ruler Dionysius. Pythias begged to go home to settle his family affairs, promising to return. The king refused, until Pythias\'s best friend Damon offered to stay in prison and be executed if Pythias failed to return on time.',
            contentTamil: 'கொடுங்கோல் மன்னன் தியோனிசியஸால் பிதியாசுக்கு மரண தண்டனை விதிக்கப்பட்டது. பிதியாஸ் தன் குடும்பக் கடமைகளை முடிக்க வீட்டிற்குச் செல்ல அனுமதி கேட்டான். அவன் திரும்பத் தவறினால் தன் உயிரைக் கொடுப்பதாக அவனது சிறந்த நண்பன் டேமன் சிறையில் இருக்க ஒப்புக்கொண்டான்.',
            illustration: '👑🏛️⛓️'
          }
        ]
      },
      {
        chapterNumber: 2,
        title: 'The Final Hour',
        pages: [
          {
            pageNumber: 2,
            contentEnglish: 'On the day of execution, Pythias was delayed by shipwrecks. As Damon was led to the scaffold, he smiled, trusting his friend. At the final second, Pythias arrived, exhausted, running to embrace Damon. Deeply moved by their loyalty, the tyrant set them both free.',
            contentTamil: 'மரணதண்டனை நாளில், கப்பல் விபத்தால் பிதியாஸ் தாமதமானான். டேமன் தூக்குமேடைக்கு அழைத்துச் செல்லப்பட்டபோது, அவன் தன் நண்பனை நம்பி புன்னகைத்தான். கடைசி வினாடியில், பிதியாஸ் ஓடிவந்து டேமனை தழுவினான். அவர்களின் விசுவாசத்தைக் கண்டு வியந்த மன்னன் இருவரையும் விடுவித்தான்.',
            illustration: '⏳🏃🤝'
          }
        ]
      }
    ]
  },
  {
    title: 'Rani Laxmibai\'s Courage',
    author: 'Indian History',
    genre: 'Biography',
    cover: '⚔️',
    color: 'from-orange-500 to-red-650',
    language: 'Bilingual',
    moral: 'Stand brave in the face of injustice and protect your homeland at all costs.',
    xpReward: 90,
    gradeLevel: '6',
    chapters: [
      {
        chapterNumber: 1,
        title: 'The Warrior Princess',
        pages: [
          {
            pageNumber: 1,
            contentEnglish: 'Born as Manu, she was trained in horse riding, sword fighting, and archery, which was unusual for girls at the time. She married the King of Jhansi and became Rani Laxmibai, loved by her people for her strength, wisdom, and active leadership.',
            contentTamil: 'மனுவாகப் பிறந்த அவள் குதிரை சவாரி, வாள் வீச்சு மற்றும் வில்வித்தையில் பயிற்சி பெற்றாள். அவள் ஜான்சி மன்னரை மணந்து ஜான்சி ராணி லட்சுமிபாய் ஆனாள், மக்கள் அவளை அவளது வலிமை, ஞானம் மற்றும் சிறந்த தலைமைத்துவத்திற்காக நேசித்தனர்.',
            illustration: '🐎⚔️🛡️'
          }
        ]
      },
      {
        chapterNumber: 2,
        title: 'The Final Stand',
        pages: [
          {
            pageNumber: 2,
            contentEnglish: 'When the British refused to recognize her adopted son and tried to seize Jhansi, the Rani tied her young son to her back, took up swords, and led her army into battle, fighting valiantly for her kingdom until her last breath.',
            contentTamil: 'ஆங்கிலேயர்கள் ஜான்சியைக் கைப்பற்ற முயன்றபோது, ராணி தன் இளம் மகனை முதுகில் கட்டிக்கொண்டு, வாளெடுத்து தன் படையை வழிநடத்தி, இறுதி மூச்சு வரை வீரமாகப் போராடினார்.',
            illustration: '⚔️👩‍👦🔥'
          }
        ]
      }
    ]
  },
  {
    title: 'The Magic Pot',
    author: 'Folklore',
    genre: 'Folklore',
    cover: '🏺',
    color: 'from-yellow-500 to-amber-600',
    language: 'Bilingual',
    moral: 'Greed leads to ruin. True contentment is the greatest wealth.',
    xpReward: 80,
    gradeLevel: '6',
    chapters: [
      {
        chapterNumber: 1,
        title: 'The Discovery',
        pages: [
          {
            pageNumber: 1,
            contentEnglish: 'A poor farmer named Subha found a large metal pot in his field. When he dropped his shovel into it, he was shocked to find it multiplied into a hundred shovels! He realized it was a magical duplicating pot.',
            contentTamil: 'சுபா என்ற ஏழை விவசாயி தன் வயலில் ஒரு பெரிய உலோகக் குடத்தைக் கண்டான். அவன் தன் மண்வெட்டியை அதில் போட்டபோது, அது நூறு மண்வெட்டிகளாகப் பெருகியதைக் கண்டு அதிர்ச்சியடைந்தான்! அது ஒரு மாயக் குடம் என்பதை அவன் உணர்ந்தான்.',
            illustration: '🌾🚜🏺'
          }
        ]
      },
      {
        chapterNumber: 2,
        title: 'The Greedy Fall',
        pages: [
          {
            pageNumber: 2,
            contentEnglish: 'Subha became rich by multiplying gold. The greedy local King heard of this and took the pot by force. To inspect it, the King leaned in, slipped, and fell inside. Instantly, the pot filled with a hundred greedy kings who fought each other, destroying the palace.',
            contentTamil: 'சுபா தங்கத்தைப் பெருக்கி பணக்காரரானான். இதையறிந்த பேராசை பிடித்த அரசன் குடத்தைப் பறித்தான். அதை ஆராய அரசன் எட்டிப்பார்த்தபோது தவறி விழுந்தான். உடனே குடத்தில் இருந்து நூறு அரசர்கள் தோன்றி சண்டையிட்டு அரண்மனையை அழித்தனர்.',
            illustration: '👑💰🥊'
          }
        ]
      }
    ]
  },
  {
    title: 'The Hero of Haarlem',
    author: 'Traditional Legend',
    genre: 'Folklore',
    cover: '👦',
    color: 'from-sky-500 to-blue-600',
    language: 'Bilingual',
    moral: 'No act of responsibility is too small. Alertness saves communities.',
    xpReward: 85,
    gradeLevel: '6',
    chapters: [
      {
        chapterNumber: 1,
        title: 'The Leaking Dike',
        pages: [
          {
            pageNumber: 1,
            contentEnglish: 'Young Hans was walking home along the dike, which held back the heavy North Sea. He noticed a tiny hole in the wall, with a small trickle of cold water. Hans knew that if the hole grew, the sea would flood and drown the entire town.',
            contentTamil: 'இளம் ஹான்ஸ் கடலைத் தடுத்து நிறுத்திய அணையின் அருகே நடந்து சென்று கொண்டிருந்தான். சுவரில் ஒரு சிறிய துளையிலிருந்து நீர் கசிவதைக் கண்டான். துளை பெரிதானால் கடல் நீர் ஊருக்குள் புகுந்து ஊரையே மூழ்கடித்துவிடும் என்று அவன் அறிந்தான்.',
            illustration: '🧱💧👦'
          }
        ]
      },
      {
        chapterNumber: 2,
        title: 'The Long Night',
        pages: [
          {
            pageNumber: 2,
            contentEnglish: 'Hans blocked the hole by sticking his finger inside. All night, in the freezing cold, he sat alone, calling for help. In the morning, a priest found him shivering but holding fast. The town repaired the dike, praising Hans as their savior.',
            contentTamil: 'ஹான்ஸ் தன் விரலைத் துளையினுள் செலுத்தி அடைத்தான். இரவு முழுவதும் பனிக் குளிரில் தனியாக அமர்ந்து உதவிக்காகக் கூவினான். காலையில் ஒரு பாதிரியார் அவனைக் கண்டு காப்பாற்றினார். மக்கள் அணையைச் சரிசெய்து ஹான்ஸைப் பாராட்டினர்.',
            illustration: '❄️☝️🌅'
          }
        ]
      }
    ]
  },

  // ─── CLASS 7 STORIES ──────────────────────────────────────────────────
  {
    title: 'The Legend of Kannagi',
    author: 'Ilango Adigal',
    genre: 'Classics',
    cover: '⚖️',
    color: 'from-red-600 to-amber-800',
    language: 'Bilingual',
    moral: 'Dharma and justice will prevail, and even kings must yield to the truth.',
    xpReward: 120,
    gradeLevel: '7',
    chapters: [
      {
        chapterNumber: 1,
        title: 'The Anklet of Fate',
        pages: [
          {
            pageNumber: 1,
            contentEnglish: 'In the ancient city of Madurai, Kannagi lived in deep grief after her husband Kovalan was falsely accused of stealing the queen\'s golden anklet. The guards had found Kovalan trying to sell Kannagi\'s precious anklet, which looked identical to the stolen royal jewel.',
            contentTamil: 'பண்டைய மதுரை மாநகரில், தனது கணவர் கோவலன் அரசியின் சிலம்பை திருடியதாக தவறாக குற்றம் சாட்டப்பட்டதால் கண்ணகி ஆழ்ந்த துயரத்தில் இருந்தாள். திருடப்பட்ட அரச சிலம்பைப் போலவே இருந்த கண்ணகியின் விலைமதிப்பற்ற சிலம்பை விற்க முயன்றபோது காவலர்கள் கோவலனைப் பிடித்தனர்.',
            illustration: '🌆💎🧎‍♀️'
          },
          {
            pageNumber: 2,
            contentEnglish: 'Without checking the facts, King Nedunchezhian, ruled by pride, ordered Kovalan to be executed. When the news reached Kannagi, her sorrow turned into raging anger. Clutching her remaining anklet, she marched directly to the royal court to demand justice.',
            contentTamil: 'உண்மைகளை ஆராயாமல், பெருமிதம் கொண்ட மன்னர் நெடுஞ்செழியன் கோவலனை தூக்கிலிடுமாறு உத்தரவிட்டார். இச்செய்தி கண்ணகியை எட்டியதும், அவளது துக்கம் கொதிக்கும் கோபமாக மாறியது. தனது எஞ்சிய சிலம்பைக் கையில் ஏந்தியபடி, அவள் நீதிகேட்டு நேரடியாக அரசவைக்கு விரைந்தாள்.',
            illustration: '😠⚖️🏛️'
          }
        ]
      },
      {
        chapterNumber: 2,
        title: 'The Trial of Truth',
        pages: [
          {
            pageNumber: 3,
            contentEnglish: 'Kannagi stood before the King and challenged him: "My lord, my anklets contain red rubies at their core. What did the Queen\'s anklet contain?" The King replied, "It was filled with pearls." Kannagi threw her anklet to the floor. It broke open, scattering bright red rubies across the marble.',
            contentTamil: 'மன்னரின் முன் நின்ற கண்ணகி அவரிடம் சவால் விட்டாள்: "மன்னரே, என் சிலம்புகளின் உள்ளே சிவப்பு மாணிக்கங்கள் உள்ளன. அரசியின் சிலம்பில் என்ன இருந்தது?" மன்னர், "அது முத்துக்களால் நிரப்பப்பட்டிருந்தது" என்று பதிலளித்தார். கண்ணகி தன் சிலம்பை தரையில் வீசினாள். அது உடைந்து, பளிங்குத் தரையில் பிரகாசமான சிவப்பு மாணிக்கங்களை சிதறடித்தது.',
            illustration: '🔴💎👑'
          },
          {
            pageNumber: 4,
            contentEnglish: 'The King was shocked. He realized Kovalan was innocent, and that he had failed in his duty as a just ruler. He cried out, "I am no king; I am the thief who took an innocent life!" With a broken heart, he fell from his throne and died, proving that truth is greater than any crown.',
            contentTamil: 'மன்னர் அதிர்ச்சியடைந்தார். கோவலன் குற்றமற்றவன் என்பதையும், ஒரு நேர்மையான ஆட்சியாளராக தனது கடமையில் தான் தவறிவிட்டதையும் அவர் உணர்ந்தார். "யானோ அரசன், யானே கள்வன்!" என்று கதறியவாறு, உடைந்த இதயத்துடன் அரியணையிலிருந்து விழுந்து இறந்தார், உண்மை எந்தவொரு கிரீடத்தையும் விட மேலானது என்பதை நிரூபித்தார்.',
            illustration: '🙇‍♂️👑☠️'
          }
        ]
      }
    ]
  },
  {
    title: 'The Wisdom of King Solomon',
    author: 'Hebrew Classics',
    genre: 'Classics',
    cover: '👑',
    color: 'from-emerald-600 to-teal-700',
    language: 'Bilingual',
    moral: 'True wisdom is guided by love, empathy, and justice.',
    xpReward: 80,
    gradeLevel: '7',
    chapters: [
      {
        chapterNumber: 1,
        title: 'Two Mothers',
        pages: [
          {
            pageNumber: 1,
            contentEnglish: 'Two women came to King Solomon with a single baby, both claiming to be the real mother. They argued fiercely, and the court could not resolve who was telling the truth. King Solomon listened carefully to both accounts.',
            contentTamil: 'இரண்டு பெண்கள் ஒரு குழந்தையுடன் சாலமன் அரசனிடம் வந்தனர், இருவரும் தாங்களே பெற்ற தாய் என்று உரிமை கோரினர். அவர்கள் கடுமையாக விவாதித்தனர், அரசவையால் உண்மையை அறிய முடியவில்லை. சாலமன் இருவர் பக்கத்தையும் பொறுமையாகக் கேட்டார்.',
            illustration: '👩‍🍼👩‍🍼👑'
          }
        ]
      },
      {
        chapterNumber: 2,
        title: 'The Sword Test',
        pages: [
          {
            pageNumber: 2,
            contentEnglish: 'Solomon ordered, "Cut the baby in half and give each woman a share." One woman agreed, but the real mother wept, crying: "Give the child to her, do not kill it!" Solomon gave the baby to the weeping woman, knowing only a true mother would give up her child to save its life.',
            contentTamil: 'சாலமன் உத்தரவிட்டார், "குழந்தையை இரண்டாக வெட்டி இருவருக்கும் ஒரு பங்கைத் கொடுங்கள்." ஒரு பெண் ஒப்புக்கொண்டாள், ஆனால் உண்மையான தாய் கதறினாள்: "குழந்தையை அவளிடமே கொடுத்துவிடுங்கள், கொல்ல வேண்டாம்!" சாலமன் உண்மையான தாயைக் கண்டறிந்து குழந்தையை அவளிடம் கொடுத்தார்.',
            illustration: '⚔️👶😭'
          }
        ]
      }
    ]
  },
  {
    title: 'Subramania Bharati',
    author: 'Biographies',
    genre: 'Biography',
    cover: '📜',
    color: 'from-orange-600 to-amber-700',
    language: 'Bilingual',
    moral: 'Words can ignite the fire of freedom, equality, and social reform.',
    xpReward: 100,
    gradeLevel: '7',
    chapters: [
      {
        chapterNumber: 1,
        title: 'The Poet\'s Pen',
        pages: [
          {
            pageNumber: 1,
            contentEnglish: 'Subramania Bharati was a revolutionary Tamil poet. Through his powerful words and songs, he fought against British rule, untouchability, and gender inequality, instilling courage in the hearts of millions of people.',
            contentTamil: 'சுப்பிரமணிய பாரதி ஒரு புரட்சிகர தமிழ் கவிஞர். தனது சக்திவாய்ந்த வார்த்தைகள் மற்றும் பாடல்கள் மூலம், அவர் பிரிட்டிஷ் ஆட்சி, தீண்டாமை மற்றும் பாலின சமத்துவமின்மைக்கு எதிராக போராடினார், லட்சக்கணக்கான மக்களின் மனதில் தைரியத்தை விதைத்தார்.',
            illustration: '✍️📜🔥'
          }
        ]
      },
      {
        chapterNumber: 2,
        title: 'The Song of Freedom',
        pages: [
          {
            pageNumber: 2,
            contentEnglish: 'Despite poverty and exile, Bharatiyar dressed in his signature turban, walked proudly, and sang songs of national pride. He dreamed of a free India where every citizen had equal rights and dignity, and women were fully empowered.',
            contentTamil: 'வறுமை மற்றும் நாடுகடத்தப்பட்ட போதிலும், பாரதியார் தனது வழக்கமான தலைப்பாகையை அணிந்து, பெருமையுடன் நடந்து, தேசப்பற்றுப் பாடல்களைப் பாடினார். ஒவ்வொரு குடிமகனுக்கும் சம உரிமை மற்றும் பெண் உரிமை கிடைக்கும் சுதந்திர இந்தியாவை அவர் கனவு கண்டார்.',
            illustration: '👳🏾‍♂️🕊️🇮🇳'
          }
        ]
      }
    ]
  },
  {
    title: 'The Windmill Boy',
    author: 'William Kamkwamba',
    genre: 'Science',
    cover: '💨',
    color: 'from-sky-500 to-cyan-700',
    language: 'Bilingual',
    moral: 'Curiosity and resourcefulness can solve the most desperate crises.',
    xpReward: 100,
    gradeLevel: '7',
    chapters: [
      {
        chapterNumber: 1,
        title: 'The Silent Fields',
        pages: [
          {
            pageNumber: 1,
            contentEnglish: 'In a small Malawian village, young William Kamkwamba\'s family was starving due to a severe drought. Forced to drop out of school because of poverty, William spent his days in the local library, reading science books on wind energy.',
            contentTamil: 'ஒரு சிறிய ஆப்பிரிக்க கிராமத்தில், கடுமையான வறட்சியால் இளம் வில்லியம் காம்குவாம்பாவின் குடும்பம் பட்டினியால் வாடியது. வறுமையால் பள்ளியை விட்டு விலக வேண்டிய கட்டாயத்தில் இருந்த வில்லியம், நூலகத்தில் காற்றாலை ஆற்றல் பற்றிய புத்தகங்களைப் படித்தார்.',
            illustration: '🌾📖🛖'
          }
        ]
      },
      {
        chapterNumber: 2,
        title: 'Harnessing the Wind',
        pages: [
          {
            pageNumber: 2,
            contentEnglish: 'Using scrap metal, a bicycle frame, and plastic pipes, William built a working windmill. It pumped water to irrigate the crops and generated electricity for his village, proving that determination can overcome lack of resources.',
            contentTamil: 'இரும்பு கழிவுகள், மிதிவண்டி சட்டகம் மற்றும் பிளாஸ்டிக் குழாய்களைப் பயன்படுத்தி, வில்லியம் ஒரு காற்றாலையை உருவாக்கினார். அது பயிர்களுக்கு நீர் பாய்ச்சி, கிராமத்திற்கு மின்சாரம் வழங்கியது, விடாமுயற்சியால் எதையும் சாதிக்கலாம் என நிரூபித்தார்.',
            illustration: '💨🚲⚡'
          }
        ]
      }
    ]
  },
  {
    title: 'The Merchant of Venice',
    author: 'William Shakespeare',
    genre: 'Classics',
    cover: '🎭',
    color: 'from-rose-500 to-red-800',
    language: 'Bilingual',
    moral: 'Mercy is greater than strict law. Justice must be tempered with compassion.',
    xpReward: 90,
    gradeLevel: '7',
    chapters: [
      {
        chapterNumber: 1,
        title: 'The Pound of Flesh',
        pages: [
          {
            pageNumber: 1,
            contentEnglish: 'Bassanio borrowed money from the merchant Antonio, who signed a dangerous contract with the moneylender Shylock: if Antonio failed to repay on time, Shylock could cut a pound of flesh from Antonio\'s body.',
            contentTamil: 'பஸானியோ அன்டோனியோ என்ற வணிகனிடம் கடன் வாங்கினான். அன்டோனியோ கடனைத் திருப்பிச் செலுத்தத் தவறினால், அவனது உடலில் இருந்து ஒரு பவுண்டு சதையை வெட்டியெடுக்கலாம் என்று ஷைலாக்கிடம் ஒப்பந்தம் கையெழுத்திடப்பட்டது.',
            illustration: '📜⚖️🎭'
          }
        ]
      },
      {
        chapterNumber: 2,
        title: 'The Quality of Mercy',
        pages: [
          {
            pageNumber: 2,
            contentEnglish: 'In court, Bassanio\'s clever wife Portia disguised herself as a lawyer. She pleaded for mercy. When Shylock refused, Portia agreed but warned: "Cut the flesh, but if you spill even one drop of blood, your life is forfeit." Shylock retreated, saving Antonio.',
            contentTamil: 'நீதிமன்றத்தில், பஸானியோவின் மனைவி போர்ஷியா வழக்கறிஞராக மாறுவேடமிட்டு வாதிட்டாள். \'சதையை வெட்டுங்கள், ஆனால் ஒரு துளி இரத்தம் கூட சிந்தக்கூடாது\' என்று எச்சரித்தாள். ஷைலாக் பின்வாங்கினார், அன்டோனியோ காப்பாற்றப்பட்டார்.',
            illustration: '⚖️👩‍⚖️🩸'

          }
        ]
      }
    ]
  },
  {
    title: 'Helen Keller\'s Light',
    author: 'Biographies',
    genre: 'Biography',
    cover: '💡',
    color: 'from-fuchsia-600 to-purple-800',
    language: 'Bilingual',
    moral: 'Resilience, patience, and guidance can unlock the darkest barriers of life.',
    xpReward: 100,
    gradeLevel: '7',
    chapters: [
      {
        chapterNumber: 1,
        title: 'The Silent Dark',
        pages: [
          {
            pageNumber: 1,
            contentEnglish: 'Left blind and deaf by illness at a young age, Helen Keller lived in a silent, dark world, frustrated and angry. Her life changed when her teacher, Anne Sullivan, arrived and began spelling words on Helen\'s palm.',
            contentTamil: 'இளம் வயதிலேயே நோய்வாய்ப்பட்டு பார்வை மற்றும் கேட்கும் திறனை இழந்த ஹெலன் கெல்லர், அமைதியான, இருண்ட உலகில் வாழ்ந்தார். அவரது ஆசிரியை ஆனி சல்லிவன் ஹெலனின் உள்ளங்கையில் வார்த்தைகளை எழுதத் தொடங்கியபோது அவரது வாழ்க்கை மாறத் தொடங்கியது.',
            illustration: '👧🔒🖤'
          }
        ]
      },
      {
        chapterNumber: 2,
        title: 'The Breakthrough at the Pump',
        pages: [
          {
            pageNumber: 2,
            contentEnglish: 'Anne ran cold water over Helen\'s hand while spelling W-A-T-E-R on her other palm. Helen suddenly understood the connection! This breakthrough unlocked the world of language, leading Helen to become a famous writer and activist.',
            contentTamil: 'ஆனி ஹெலனின் ஒரு கையில் குளிர்ந்த நீரை ஊற்றி, மற்றொரு கையில் W-A-T-E-R என்று எழுதினார். ஹெலன் திடீரென்று அதன் தொடர்பைப் புரிந்துகொண்டார்! இந்த முன்னேற்றம் மொழியுலகை அவருக்குத் திறந்து காட்டியது.',
            illustration: '🚰✍️✨'
          }
        ]
      }
    ]
  },

  // ─── CLASS 8 STORIES ──────────────────────────────────────────────────
  {
    title: 'The Man Who Knew Infinity',
    author: 'Biography of Ramanujan',
    genre: 'Science',
    cover: '🔢',
    color: 'from-purple-600 to-fuchsia-700',
    language: 'Bilingual',
    moral: 'True passion and intellectual honesty overcome all socio-economic barriers.',
    xpReward: 100,
    gradeLevel: '8',
    chapters: [
      {
        chapterNumber: 1,
        title: 'The Kumbakonam Genius',
        pages: [
          {
            pageNumber: 1,
            contentEnglish: 'Srinivasa Ramanujan spent his childhood in Kumbakonam, sitting on the front porch of his small house. Armed with only a slate and chalk, he filled thousands of rows with strange, beautiful mathematical formulas. He had no formal training, but numbers were his closest friends, whispered to him by his family deity.',
            contentTamil: 'சீனிவாச இராமானுஜன் கும்பகோணத்தில் உள்ள தனது சிறிய வீட்டின் முன் திண்ணையில் அமர்ந்து தனது சிறுபிராயத்தைக் கழித்தார். ஒரு பலகையும் சுண்ணாம்பும் மட்டுமே கொண்டு, ஆயிரக்கணக்கான வரிகளில் விசித்திரமான, அழகான கணித சூத்திரங்களை எழுதினார். அவருக்கு முறையான பயிற்சி எதுவும் இல்லை, ஆனால் எண்களே அவரது நெருங்கிய நண்பர்களாக இருந்தன.',
            illustration: '🏠✍️🧮'
          },
          {
            pageNumber: 2,
            contentEnglish: 'Ramanujan was so absorbed in mathematics that he failed all other subjects in college. Destitute and lacking support, he wrote a letter to the famous Cambridge mathematician G.H. Hardy, containing pages of complex theorems. Hardy was amazed, realizing he was looking at the work of a raw mathematical genius.',
            contentTamil: 'இராமானுஜன் கணிதத்தில் மிகவும் மூழ்கியிருந்ததால் கல்லூரியில் மற்ற அனைத்து பாடங்களிலும் தோல்வியடைந்தார். வறுமையிலும் ஆதரவற்ற நிலையிலும், அவர் கேம்பிரிட்ஜின் பிரபல கணிதவியலாளர் ஜி.ஹெச்.ஹார்டிக்கு சிக்கலான தேற்றங்கள் அடங்கிய கடிதம் எழுதினார். அதைக் கண்டு வியந்த ஹார்டி, தான் ஒரு தூய கணித மேதையின் படைப்பைப் பார்க்கிறோம் என்பதை உணர்ந்தார்.',
            illustration: '✉️🧐🇬🇧'
          }
        ]
      },
      {
        chapterNumber: 2,
        title: 'The Cambridge Legacy',
        pages: [
          {
            pageNumber: 3,
            contentEnglish: 'Crossing the ocean, Ramanujan reached Trinity College in Cambridge. Despite facing bitter cold, loneliness, and a lack of proper vegetarian food, he worked relentlessly with Hardy. They proved extraordinary partition formulas and mock theta functions that baffled the world\'s greatest minds.',
            contentTamil: 'கடல் கடந்து, இராமானுஜன் கேம்பிரிட்ஜில் உள்ள டிரினிட்டி கல்லூரியை அடைந்தார். கடுமையான குளிர், தனிமை மற்றும் முறையான சைவ உணவு இல்லாத போதிலும், அவர் ஹார்டியுடன் இடைவிடாமல் உழைத்தார். அவர்கள் அசாதாரணமான பிரிவினை சூத்திரங்களையும், உலகெங்கிலும் உள்ள அறிஞர்களை வியப்பில் ஆழ்த்திய மாக் தீட்டா சார்புகளையும் நிரூபித்தனர்.',
            illustration: '❄️👨‍🔬🔬'
          },
          {
            pageNumber: 4,
            contentEnglish: 'When Hardy once remarked that a taxi cab number "1729" was dull, Ramanujan quickly replied: "No, Hardy! It is a very interesting number. It is the smallest number expressible as the sum of two cubes in two different ways!" To him, an equation had no meaning unless it expressed a thought of God.',
            contentTamil: 'ஒருமுறை ஹார்டி "1729" என்ற வாடகை வண்டி எண் சலிப்பை ஏற்படுகிறது என்று குறிப்பிட்டபோது, இராமானுஜன் விரைந்து பதிலளித்தார்: "இல்லை ஹார்டி! அது மிகவும் சுவாரஸ்யமான எண். இரு வெவ்வேறு வழிகளில் இரு கனங்களின் கூட்டுத்தொகையாக எழுதக்கூடிய மிகச்சிறிய எண் அதுதான்!" சமன்பாடு என்பது இறைவனின் சிந்தனையை வெளிப்படுத்தாவிட்டால் அதற்குப் பொருளே இல்லை என்பது அவரது கொள்கை.',
            illustration: '🚖🔢✨'
          }
        ]
      }
    ]
  },
  {
    title: 'Raja Raja Chola\'s Crown',
    author: 'Tamil History',
    genre: 'Classics',
    cover: '🏰',
    color: 'from-amber-700 to-yellow-800',
    language: 'Bilingual',
    moral: 'True leadership is rooted in humility, consensus, and putting the country first.',
    xpReward: 110,
    gradeLevel: '8',
    chapters: [
      {
        chapterNumber: 1,
        title: 'The Crown Rejected',
        pages: [
          {
            pageNumber: 1,
            contentEnglish: 'When King Sundara Chola died, the citizens and ministers wanted the brilliant young prince Arulmozhi Varman (Raja Raja Chola) to take the throne. However, Arulmozhi refused, stating that his elder uncle Uttama Chola had a greater right to rule first.',
            contentTamil: 'சுந்தர சோழர் மறைந்தபோது, குடிமக்களும் அமைச்சர்களும் அருண்மொழிவர்மன் (ராஜராஜ சோழன்) அரியணை ஏற விரும்பினர். இருப்பினும், தனது பெரியப்பா உத்தம சோழனுக்கே ஆட்சி செய்ய அதிக உரிமை உண்டு என்று அருண்மொழி மறுத்துவிட்டார்.',
            illustration: '👑🏰⚔️'
          }
        ]
      },
      {
        chapterNumber: 2,
        title: 'The Rise of the Empire',
        pages: [
          {
            pageNumber: 2,
            contentEnglish: 'Arulmozhi crowned his uncle and served as a general. Years later, he took the throne as Raja Raja Chola I. His humility united the kingdom, launching a golden age of arts, ocean trade, and temple architecture.',
            contentTamil: 'அருண்மொழி தனது மாமாவிற்கு முடிசூட்டி, தளபதியாகப் பணியாற்றினார். ஆண்டுகள் கழித்து, அவர் ராஜராஜ சோழனாக அரியணை ஏறினார். அவரது பணிவு சோழ ராஜ்யத்தை ஒன்றிணைத்து கலைகள், கடல் வர்த்தகம் மற்றும் கட்டிடக்கலையின் பொற்காலத்தைத் தொடங்கியது.',
            illustration: '🔱🧱🏛️'
          }
        ]
      }
    ]
  },
  {
    title: 'The Trial of Socrates',
    author: 'Philosophy Classics',
    genre: 'Classics',
    cover: '🏛️',
    color: 'from-slate-650 to-zinc-800',
    language: 'Bilingual',
    moral: 'Truth and intellectual integrity are worth defending, even at the cost of life.',
    xpReward: 110,
    gradeLevel: '8',
    chapters: [
      {
        chapterNumber: 1,
        title: 'The Philosopher\'s Questions',
        pages: [
          {
            pageNumber: 1,
            contentEnglish: 'Socrates walked the streets of Athens, asking citizens deep questions to challenge their assumptions and expose false wisdom. The rulers grew angry, accusing him of misleading the youth and questioning state authority.',
            contentTamil: 'சாக்ரடீஸ் ஏதென்ஸ் வீதிகளில் நடந்து சென்று, குடிமக்களிடம் ஆழமான கேள்விகளைக் கேட்டு அவர்களின் அனுமானங்களை சவால் செய்தார். இளைஞர்களை தவறாக வழிநடத்துவதாகவும், அரசு அதிகாரத்தை கேள்வி கேட்பதாகவும் ஆட்சியாளர்கள் குற்றம் சாட்டினர்.',
            illustration: '🏛️🗣️🤔'
          }
        ]
      },
      {
        chapterNumber: 2,
        title: 'The Hemlock Poison',
        pages: [
          {
            pageNumber: 2,
            contentEnglish: 'In court, Socrates refused to apologize, declaring: "The unexamined life is not worth living." Sentenced to drink poisonous hemlock, he drank it calmly, choosing death over compromising his philosophical integrity.',
            contentTamil: 'நீதிமன்றத்தில், சாக்ரடீஸ் மன்னிப்பு கேட்க மறுத்து, "ஆராயப்படாத வாழ்க்கை வாழ்வதற்கு தகுதியற்றது" என்று முழங்கினார். நஞ்சு அருந்தும் தண்டனை விதிக்கப்பட்டபோது, அவர் அதை அமைதியாகக் குடித்து, தனது நேர்மையை நிலைநாட்டினார்.',
            illustration: '🧪🙇‍♂️🏛'
          }
        ]
      }
    ]
  },
  {
    title: 'Marie Curie\'s Isolation',
    author: 'Science Biographies',
    genre: 'Science',
    cover: '🔬',
    color: 'from-cyan-600 to-indigo-800',
    language: 'Bilingual',
    moral: 'Relentless dedication and scientific curiosity reveal the universe\'s hidden truths.',
    xpReward: 120,
    gradeLevel: '8',
    chapters: [
      {
        chapterNumber: 1,
        title: 'The Drafty Shed',
        pages: [
          {
            pageNumber: 1,
            contentEnglish: 'In a freezing, drafty wooden shed in Paris, Marie Curie and her husband Pierre worked for years stirring boiling vats of pitchblende. They had no funding, but they were determined to isolate a mysterious new radioactive element.',
            contentTamil: 'பாரிஸில் ஒரு குளிர்ந்த மரக் கொட்டகையில், மேரி கியூரியும் அவரது கணவர் பியரும் பல ஆண்டுகள் உழைத்தனர். அவர்களிடம் போதிய நிதி இல்லை, ஆனால் ஒரு புதிய கதிரியக்க தனிமத்தைப் பிரித்தெடுக்க அவர்கள் உறுதியாக இருந்தனர்.',
            illustration: '🪵🧪🔬'
          }
        ]
      },
      {
        chapterNumber: 2,
        title: 'Glowing Radium',
        pages: [
          {
            pageNumber: 2,
            contentEnglish: 'In 1902, after refining tons of ore, Marie isolated a tiny fraction of a gram of pure radium. That night, walking into the dark shed, they saw the vials glowing with a beautiful, eerie blue light. Marie went on to win two Nobel Prizes.',
            contentTamil: '1902 இல், டன் கணக்கான தாதுக்களை சுத்திகரித்த பிறகு, மேரி ஒரு கிராம் தூய ரேடியத்தைப் பிரித்தெடுத்தார். அன்று இரவு, இருண்ட கொட்டகையில் குப்பிகள் அழகான நீல ஒளியுடன் ஒளிர்வதைக் கண்டனர். மேரி இரு நோபல் பரிசுகளை வென்றார்.',
            illustration: '🔵🧪🌟'
          }
        ]
      }
    ]
  },
  {
    title: 'Ali Cogia\'s Olives',
    author: 'Traditional Folklore',
    genre: 'Folklore',
    cover: '🏺',
    color: 'from-lime-600 to-yellow-750',
    language: 'Bilingual',
    moral: 'Truth and justice cannot be hidden. Honesty is revealed through keen observation.',
    xpReward: 90,
    gradeLevel: '8',
    chapters: [
      {
        chapterNumber: 1,
        title: 'The Stolen Gold',
        pages: [
          {
            pageNumber: 1,
            contentEnglish: 'Ali Cogia hid a bag of gold coins under a jar of olives and left it with a merchant friend before going on a journey. Years later, the greedy merchant stole the gold. When Ali returned, the merchant claimed he knew nothing.',
            contentTamil: 'அலி கோஜியா ஒரு குவளை ஆலிவ் பழங்களுக்கு அடியில் தங்கக் காசுகளை மறைத்து வைத்து தன் நண்பனிடம் கொடுத்துவிட்டுச் சென்றார். பல ஆண்டுகள் கழித்து, பேராசை பிடித்த வணிகன் தங்கத்தைத் திருடினான். அலி திரும்பியபோது வணிகன் தங்களுக்கு எதுவும் தெரியாது என்றான்.',
            illustration: '🏺🫒💰'
          }
        ]
      },
      {
        chapterNumber: 2,
        title: 'The Children\'s Play',
        pages: [
          {
            pageNumber: 2,
            contentEnglish: 'The Caliph observed children playing court, simulating Ali\'s case. The child judge called olive merchants who tasted the olives and declared them fresh, proving they couldn\'t be old olives from years ago! The thief confessed.',
            contentTamil: 'அலியின் வழக்கைப் போல குழந்தைகள் விளையாடுவதை மன்னன் கவனித்தான். குழந்தை நீதிபதி ஆலிவ் பழங்களைச் சுவைக்க ஆலிவ் வியாபாரிகளை அழைத்தான். பழங்கள் புதியவை என்று அவர்கள் கூறினர், இதன் மூலம் திருட்டு அம்பலமாகி திருடன் ஒப்புக் கொண்டான்.',
            illustration: '🏺👦⚖️'
          }
        ]
      }
    ]
  },
  {
    title: 'Sir CV Raman\'s Ocean',
    author: 'Science Biographies',
    genre: 'Science',
    cover: '🌊',
    color: 'from-blue-600 to-sky-700',
    language: 'Bilingual',
    moral: 'Everyday phenomena hide scientific mysteries. Keep questioning the world around you.',
    xpReward: 100,
    gradeLevel: '8',
    chapters: [
      {
        chapterNumber: 1,
        title: 'The Blue Voyage',
        pages: [
          {
            pageNumber: 1,
            contentEnglish: 'In 1921, Indian scientist C.V. Raman was traveling across the Mediterranean Sea. He sat on the deck, amazed by the deep blue color of the water. Lord Rayleigh had claimed the sea reflected the sky, but Raman was not convinced.',
            contentTamil: '1921 ஆம் ஆண்டில், இந்திய விஞ்ஞானி சி.வி.ராமன் மத்திய தரைக்கடல் வழியாகப் பயணம் செய்தார். அவர் கப்பலின் தளத்தில் அமர்ந்து, கடலின் ஆழமான நீல நிறத்தைக் கண்டு வியந்தார். கடல் வானத்தைப் பிரதிபலிக்கிறது என்ற பழைய கூற்றை ராமன் ஏற்கவில்லை.',
            illustration: '🛳️🌊🧐'
          }
        ]
      },
      {
        chapterNumber: 2,
        title: 'Scattering Light',
        pages: [
          {
            pageNumber: 2,
            contentEnglish: 'Using simple pocket instruments, Raman tested the water. In Calcutta, he proved that the blue color is caused by the scattering of light molecules (the Raman Effect). This discovery won him the Nobel Prize in Physics in 1930.',
            contentTamil: 'ராமன் தண்ணீரைச் சோதித்தார். கொல்கத்தாவில், நீல நிறம் ஒளி மூலக்கூறுகள் சிதறுவதால் (ராமன் விளைவு) ஏற்படுகிறது என்பதை அவர் நிரூபித்தார். இந்த கண்டுபிடிப்பிற்கு 1930 இல் அவருக்கு இயற்பியலுக்கான நோபல் பரிசு கிடைத்தது.',
            illustration: '🔬💡🔵'
          }
        ]
      }
    ]
  }
];

async function main() {
  console.log('🌱 Start seeding moral bilingual stories...');

  // Delete existing data to avoid duplicates
  await prisma.studentStoryProgress.deleteMany({});
  await prisma.storyPage.deleteMany({});
  await prisma.storyChapter.deleteMany({});
  await prisma.storyBook.deleteMany({});

  for (const bookInfo of storiesData) {
    const book = await prisma.storyBook.create({
      data: {
        title: bookInfo.title,
        author: bookInfo.author,
        genre: bookInfo.genre,
        cover: bookInfo.cover,
        color: bookInfo.color,
        language: bookInfo.language,
        moral: bookInfo.moral,
        xpReward: bookInfo.xpReward,
        gradeLevel: bookInfo.gradeLevel
      }
    });

    for (const chapInfo of bookInfo.chapters) {
      const chapter = await prisma.storyChapter.create({
        data: {
          storyBookId: book.id,
          chapterNumber: chapInfo.chapterNumber,
          title: chapInfo.title
        }
      });

      await prisma.storyPage.createMany({
        data: chapInfo.pages.map(p => ({
          storyChapterId: chapter.id,
          pageNumber: p.pageNumber,
          contentEnglish: p.contentEnglish,
          contentTamil: p.contentTamil,
          illustration: p.illustration
        }))
      });
    }
    console.log(`📚 Seeded: "${bookInfo.title}" (Class ${bookInfo.gradeLevel})`);
  }

  console.log('✅ Seeding completed! Stories successfully populated.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
