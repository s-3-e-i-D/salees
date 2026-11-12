import { normalize, type Lang } from "@/lib/keyboard/text";

const AR_RAW = `
منزل مساء مرحبا ماء مال موعد مطعم مسجد مدرسة مكتب مدينة مدير مشروع مشكلة مساعدة مباراة مناسب مباشر
حرف حرارة حرية حليب حجز حفل حذاء حار حال حديث حوار حلو حبيب حاجة
بيت باب بارد برنامج بطارية بكرة بداية بريد بقية بطاقة
سلام سعيد سفر سيارة سعر سوق شاي شارع شغل شركة شمس شباك شكرا شوية
عمل عمر عشاء عرض عنوان عطلة عيد عائلة عادي عالم عاجل
طيب طاولة طيارة طريق طويل طقس طلب طفل طيبين
وقت ولد وعد وظيفة ورقة وضع وصول واجب
كتاب كلمة كثير قهوة قريب قرار قديم قوي قلب قمر
درس دوام دواء دقيق دجاج داخل دائم
زيارة زوج زهرة زحمة زمان زين
رقم ريال رسالة رمضان رياض راحة رئيس
نور نوم نتيجة ناس نجم نقاش نجاح نقطة
لعب ليل لحم لون لغة لقاء لذيذ
يوم يد يمين يسار يسافر
فطور فندق فكرة فستان فلوس فريق فصل فرح
غرفة غداء غالي غدا غيم
خبر خط خطة خصم خفيف خطوة خال
ثلج ثوب ثلاث
صدق صباح صورة صلاة صديق صغير صعب صفحة صوت
ضحى ضوء ضيف ضحك
اهل احب اكتب اروح اكل اسمع اشوف اجازة اخو اخت امان
تأخير تقرير تذكرة تمر تمور تصميم
جوال جديد جميل جامعة جمع جمعة جسر جار
خروف خير
في من الى على عن مع ان هذا هذه ذلك تلك الذي التي الذين كان ما لا لم لن ليس قد كل حتى اذا كما عند حيث منذ بين بعد قبل او ثم هو هي هم هن نحن انا انت انتي انتم كيف ماذا لماذا اين متى كم هل لو سوف يمكن يجب لازم نعم
طيب تمام حلو زين خلاص يلا هلا مرحبا اهلا السلام عليكم صباح الخير مساء الورد كيفك شلونك وش ايش ليش عشان لان شكرا مشكور تسلم الله يعطيك العافية ياخي
اريد ابي ابيك ابغى ابغا نبي تبي احب اكره اعرف افهم اظن اقول اتكلم اكتب اقرأ اسمع اشوف اروح اجي اجلس انام اكل اشرب اشتري اساعد احاول ابدأ اخلص احتاج استخدم اتعلم اشتغل ادرس العب اسافر ارجع انتظر
قال قلت راح رحت جاء جيت شاف شفت كتب قرأ سمع صار كانت كانوا سويت عملت جربت نسيت تذكرت فتحت قفلت ارسلت وصلت فهمت
الناس رجل امرأة ولد بنت طفل اهل اب ام اخ اخت زوج زوجة صاحب صديق صديقة بيت شقة غرفة مكتب مدرسة جامعة مسجد عمل شغل فلوس ريال مال سوق محل مطعم قهوة شاهي موية اكل فطور غداء عشاء دوام اجازة سيارة طريق شارع
اليوم امس بكرة الحين الان بعدين شوي دقيقة ساعة اسبوع شهر سنة ليل فجر ظهر عصر مغرب
صلاة قرآن دعاء المدينة مكة جدة الرياض الدمام الطائف ينبع تبوك
رسالة جوال هاتف تطبيق برنامج كيبورد لوحة مفاتيح حرف كلمة كلمات جملة نص رقم ارقام صورة فيديو انترنت شحنة بطارية
كبير صغير جديد قديم طويل قصير سريع بطيء جميل كويس سيء صعب سهل مهم كثير قليل اول ثاني افضل احسن اقرب ابعد
فيه فيها فيهم منه منها لهم لها لنا لي لك لكم عليهم علينا اليك اليه عليها
هذي هذول كذا مرة واجد مره زيادة نقص امورك طبعا ربما لأنه بدون معاه معاي معك معهم
تقدر اقدر نقدر يقدر واضح اكيد يكفي قدام ورا فوق تحت جنب برا دخل
يالله الحمد سبحان ماشاء تبارك جزاك بارك
كتاب قلم ورقة دفتر باب شباك كرسي طاولة سرير مطبخ حمام حديقة شجرة وردة شمس قمر نجم بحر جبل هوا مطر برد حر نور
يد عين اذن فم قلب روح جسم صحة مرض دكتور مستشفى دواء
اسم عنوان حساب سر فريق مباراة هدف كورة لعبة اغنية فلم مسلسل خبر
وظيفة مدير موظف اجتماع مشروع تقرير مهمة موعد
سفر طيارة مطار فندق حجز تذكرة جواز
ثوب شماغ فستان حذاء بنك تحويل
شاي عصير خبز رز لحم دجاج سمك سلطة حلى تمر
سلامة زميل زميلة جار جارة حي منطقة مدينة قرية دولة عالم
شركة سعر رخيص غالي خصم عرض
اقتراح اقتراحات كتابة مفاتيح زر مسافة حذف
الجميع الكل شخص شيء اشياء امور حياة يوميات
خطة فكرة رأي نصيحة مساعدة
مشكلة حل سبب نتيجة
سؤال جواب شرح
لحظة استنى
مبروك الف عقبالك
عيد رمضان فطر اضحى جمعة
صيام افطار سحور
محمد احمد علي عمر خالد فهد سعد عبدالله عبدالرحمن يوسف ابراهيم حسن حسين
نورة سارة لمى لينا ريم هند فاطمة عائشة مريم
البيت العمل المدرسة الجامعة الوقت الكلام اليوميات الرسالة الصورة
فيه فين وين منين لين دقايق ساعات ايام
تعال تعالي روح روحي خذ خذي ارسل ارسلي
حاضر امر ياسلام جماعة
اوكي اوك تم تمم ماشي مب مو
نورت هلا والله فيك
تصبح بخير نورتي
السلام عليكم ورحمة
صباح مساءكم
كيف الحال اموركم تمامين
ابيك ابيه ابيها ابغاها
الحرم المسجد النبوي
قهوة لقمة ساندويتش برجر
دوام اجازتي مشواري
خلاص بجي باجر باكر
الحين جايك طالع نازل
وصلت البيت وصلت الدوام
تاخرت زهقت زهقت استنيت
احبها احبه نحب
ياخي ياختي ياقلبي
رقم الجوال كلمة المرور
لوحة المفاتيح صف الارقام
يكتب يقرأ يتعلم يتنبأ يقترح يحفظ
سلس سلسة كتابة سريعة
مرحبتين هلاوغلا يا هلا فيك
ان شاء الله باذن الله
ماشاء الله تبارك الرحمن
الله يسعدك الله يبارك فيك
يعطيك العافية الله يعافيك
مشكور يا بعدهم
طيب بشري وش اخباره
تمام الحمد لله
على خير نلتقي
مع السلامة باي
تصبح على خير
صباح الخير مساء الخير
كيفك اليوم وش مسوي
ابي اكل ابي قهوة ابي انام
روح دوامك لا تتأخر
وينك تأخرت عليك
خلاص ارسلها الحين
اكتبها مرة ثانية
الكلمة تتوقعها
الاقتراح يطلع فوق
المسافة تثبت الكلمة
حذف سريع بالضغط
مساء النور صباح النور
اهلين وسهلين
حياك الله حياك
نورت المكان
شلونك طيب ان شاء الله
ابغى هالشيء
كذا احسن كذا تمام
مرة حلو وايد حلو
مو زين مب تمام
اقدر اجي بكرة
نستنى شوي وبعدين نروح
عندي اجتماع بعد شوي
المشروع خلص تقريب
التقرير على الايميل
حولت لك المبلغ
الحجز مؤكد التذكرة جاهزة
الجواز في الشنطة
الطيارة تتأخر المطار زحام
البيت بعيد الشغل قريب
الجو حار الجو بارد فيه مطر
ابغى موية ابغى شاهي
الفطور جاهز الغدا يتأخر
العشا عند اهلنا
السيارة في المواقف
الطريق زحمة خذ الخط الثاني
رسالة جديدة وصلت
الصورة حلوة الفيديو طويل
البطارية ضعيفة الشاحن وين
الواي فاي فاصل النت بطيء
التطبيق هذا خفيف
الكيبورد سلس وسريع
تعلم الكلمة من التكرار
اقتراح ذكي وفوري
`;

const EN_RAW = `
the of and to in is you that it he was for on are as with his they be at one have this from or had by word but not what all were we when your can said there use an each which she do how their if will up other about out many then them these so some her would make like him into time has look two more write go see number no way could people my than first water been call who oil its now find long down day did get come made may part
i'm don't it's you're can't that's what's i'm we're they're i'll you'll we'll didn't doesn't isn't aren't wasn't weren't i'm there's here's let's
hello hey hi thanks thank please sorry yes yeah yep no nope okay ok sure maybe later today tomorrow yesterday now just really very much more most some any every own other right left good bad new old big small long short high low
want need like love know think say tell ask try work play read write hear see come go take give make help start stop wait look feel seem become keep hold turn move live believe allow add change
time people year day way man woman child friend family home house school work money water food morning night week month name place number point fact
today tonight tomorrow morning afternoon evening please thanks sorry hello goodbye welcome
what where when why who how which about because before after under over again always never often once
message phone email photo video internet password account keyboard letter word words sentence text number
coffee water lunch dinner breakfast meeting project report ticket flight hotel
great nice cool fine done ready later soon maybe probably actually basically
the a an this that these those my your our their
going coming taking making getting looking working writing reading learning typing
suggest suggestion predict prediction smooth typing learned saved word twice
`;

function parse(raw: string, lang: Lang): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of raw.trim().split(/\s+/)) {
    const n = normalize(w, lang);
    if (n.length < 2 || seen.has(n)) continue;
    if (!/^[\p{L}]+$/u.test(n)) continue;
    seen.add(n);
    out.push(w);
  }
  return out;
}

export const AR_WORDS = parse(AR_RAW, "ar");
export const EN_WORDS = parse(EN_RAW, "en");

const buckets = new Map<string, string[]>();

function index(words: string[], lang: Lang) {
  for (const w of words) {
    const n = normalize(w, lang);
    const key = `${lang}:${n[0] ?? ""}`;
    const list = buckets.get(key);
    if (list) list.push(w);
    else buckets.set(key, [w]);
  }
}

index(AR_WORDS, "ar");
index(EN_WORDS, "en");

export function wordsByFirst(lang: Lang, first: string): readonly string[] {
  return buckets.get(`${lang}:${first}`) ?? [];
}
