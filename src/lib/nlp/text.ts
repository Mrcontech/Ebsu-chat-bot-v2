/**
 * Stage 1 of the NLP pipeline: cleaning and tokenising raw text.
 *
 * Students type in many styles ("Wetin be d sch fees??", "how do i chk my result").
 * Before anything can be compared we bring every message to one plain form:
 * lower case, no accents, no punctuation, single spaces.
 */

/** Lower-case, strip accents (e.g. Igbo tone marks), drop punctuation. */
export function cleanText(raw: string): string {
  return raw
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // remove accent marks: "Daalụ" -> "Daalu"
    .toLowerCase()
    .replace(/['’‘`]/g, "") // "o'level" -> "olevel", "don't" -> "dont"
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ") // every other symbol becomes a space
    .replace(/\s+/g, " ")
    .trim();
}

/** Split cleaned text into word tokens. */
export function tokenize(cleaned: string): string[] {
  return cleaned.length === 0 ? [] : cleaned.split(" ");
}

/**
 * Words that carry no meaning for matching. Includes common English function
 * words, Nigerian Pidgin function words and words that appear in almost every
 * enquiry (e.g. "EBSU", "university"), which would otherwise add noise.
 */
export const STOPWORDS = new Set<string>([
  // English
  "a", "an", "the", "is", "are", "am", "was", "were", "be", "been", "being",
  "do", "does", "did", "doing", "done", "i", "me", "my", "mine", "we", "us", "our",
  "you", "your", "yours", "he", "she", "him", "her", "his", "it", "its", "they",
  "them", "their", "this", "that", "these", "those", "there", "here", "what",
  "which", "who", "whom", "whose", "how", "why", "of", "to", "in", "on", "at",
  "by", "for", "from", "with", "about", "into", "as", "and", "or", "but", "if",
  "so", "than", "then", "too", "very", "can", "could", "will", "would", "shall",
  "should", "may", "might", "must", "have", "has", "had", "having", "get", "got",
  "any", "some", "all", "also", "just", "only", "own", "same", "such", "more",
  "most", "other", "again", "out", "up", "down", "over", "under", "per",
  "please", "kindly", "pls", "plz", "sir", "ma", "madam", "mr", "mrs", "know",
  "tell", "want", "wish", "like", "need", "needed", "let", "go", "going", "one", "see",
  "anyone", "someone", "somebody", "people", "person", "thing", "things", "way", "ways", "much",
  "many", "now", "currently", "still", "yet", "ok", "okay", "o", "oo", "ooo",
  // Nigerian Pidgin function words (meaning-carrying Pidgin words are mapped
  // to English by the language rules instead of being dropped)
  "abeg", "biko", "dey", "de", "na", "una", "wey", "sef", "abi", "shey", "sha",
  "make", "don", "dem", "am", "di", "d", "pikin", "una", "wan", "fit", "take",
  "go", "come", "e", "u", "ur", "im", "mi", "dis", "dat", "say", "sef",
  // words present in nearly every enquiry about this university
  "ebsu", "ebonyi", "state", "university", "uni", "varsity", "abakaliki",
  "school", "student", "students",
]);

/** Small-talk words that must survive stopword removal. */
export const KEEP_WORDS = new Set<string>([
  "hi", "hello", "hey", "morning", "afternoon", "evening", "thanks", "thank",
  "bye", "goodbye",
]);

export function isStopword(token: string): boolean {
  return STOPWORDS.has(token) && !KEEP_WORDS.has(token);
}
