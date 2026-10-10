import { ChatWorkspace, type Suggestion } from "@/components/chat-workspace";
import { DbOffline } from "@/components/db-offline";
import { StudentShell } from "@/components/student-shell";
import { countAnswers, getFeaturedQuestions } from "@/lib/kb";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  let suggestions: Suggestion[] = [];
  let total = 0;
  try {
    [suggestions, total] = await Promise.all([getFeaturedQuestions(), countAnswers()]);
  } catch (error) {
    console.error("[chat page]", error);
    return (
      <StudentShell>
        <DbOffline />
      </StudentShell>
    );
  }
  return (
    <StudentShell>
      <ChatWorkspace suggestions={suggestions} totalAnswers={total} />
    </StudentShell>
  );
}
