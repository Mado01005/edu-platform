import { MessageCircle, Reply } from 'lucide-react';
import { createDiscussionAction } from '@/app/lms/actions';
import { ActionSubmitButton } from '@/components/lms/ActionSubmitButton';

type Discussion = {
  id: string;
  message: string;
  createdAt: Date;
  user: { name: string | null; email: string };
  replies: {
    id: string;
    message: string;
    createdAt: Date;
    user: { name: string | null; email: string };
  }[];
};

function authorName(user: Discussion['user']) {
  return user.name ?? user.email.split('@')[0];
}

export function DiscussionThread({
  lessonId,
  discussions,
}: {
  lessonId: string;
  discussions: Discussion[];
}) {
  const createRoot = createDiscussionAction.bind(null, lessonId, null);

  return (
    <section className="flex min-w-0 flex-col gap-4">
      <div className="flex items-center gap-2">
        <MessageCircle className="size-5 text-sky-600" />
        <h2 className="text-lg font-black">Questions & answers</h2>
      </div>

      <form action={createRoot} className="flex min-w-0 flex-col gap-2">
        <textarea
          className="min-h-24 w-full min-w-0 resize-y rounded-xl border border-slate-200/80 bg-white px-3 py-3 text-sm text-slate-900 shadow-sm outline-none transition-all duration-200 ease-in-out placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
          maxLength={4000}
          name="message"
          placeholder="Ask a question about this lesson…"
          required
        />
        <ActionSubmitButton
          className="self-end rounded-xl bg-sky-500 px-4 py-2 text-sm font-black text-white shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-sky-600 hover:shadow-md"
          pendingLabel="Posting…"
        >
          Post question
        </ActionSubmitButton>
      </form>

      {discussions.map((discussion) => {
        const reply = createDiscussionAction.bind(
          null,
          lessonId,
          discussion.id,
        );

        return (
          <article className="card-hover min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/50" key={discussion.id}>
            <div className="flex min-w-0 items-center justify-between gap-3 text-xs">
              <span className="truncate font-black text-sky-700">
                {authorName(discussion.user)}
              </span>
              <time className="shrink-0 text-slate-500">
                {discussion.createdAt.toLocaleDateString()}
              </time>
            </div>
            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
              {discussion.message}
            </p>

            {discussion.replies.map((item) => (
              <div className="ml-4 mt-3 min-w-0 border-l border-sky-200 pl-3" key={item.id}>
                <p className="text-xs font-black text-slate-600">
                  {authorName(item.user)}
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-700">
                  {item.message}
                </p>
              </div>
            ))}

            <details className="mt-3">
              <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-bold text-slate-500 transition-colors hover:text-sky-700">
                <Reply className="size-3" /> Reply
              </summary>
              <form action={reply} className="mt-2 flex min-w-0 gap-2">
                <input
                  className="min-w-0 flex-1 rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm outline-none transition-all duration-200 ease-in-out placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                  maxLength={4000}
                  name="message"
                  placeholder="Write a reply"
                  required
                />
                <ActionSubmitButton
                  className="shrink-0 rounded-lg border border-sky-200/60 bg-sky-50 px-3 text-xs font-black text-sky-700 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-sky-100 hover:shadow-md"
                  pendingLabel="Sending…"
                >
                  Send
                </ActionSubmitButton>
              </form>
            </details>
          </article>
        );
      })}
    </section>
  );
}
