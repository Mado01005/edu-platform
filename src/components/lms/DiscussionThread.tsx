import { MessageCircle, Reply } from 'lucide-react';
import { createDiscussionAction } from '@/app/lms/actions';

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
        <MessageCircle className="size-5 text-violet-300" />
        <h2 className="text-lg font-black">Questions & answers</h2>
      </div>

      <form action={createRoot} className="flex min-w-0 flex-col gap-2">
        <textarea
          className="min-h-24 w-full min-w-0 resize-y rounded-xl border border-white/10 bg-zinc-950 px-3 py-3 text-sm outline-none focus:border-violet-400"
          maxLength={4000}
          name="message"
          placeholder="Ask a question about this lesson…"
          required
        />
        <button className="self-end rounded-xl bg-white px-4 py-2 text-sm font-black text-black">
          Post question
        </button>
      </form>

      {discussions.map((discussion) => {
        const reply = createDiscussionAction.bind(
          null,
          lessonId,
          discussion.id,
        );

        return (
          <article className="min-w-0 rounded-2xl border border-white/10 bg-zinc-950 p-4" key={discussion.id}>
            <div className="flex min-w-0 items-center justify-between gap-3 text-xs">
              <span className="truncate font-black text-violet-200">
                {authorName(discussion.user)}
              </span>
              <time className="shrink-0 text-zinc-600">
                {discussion.createdAt.toLocaleDateString()}
              </time>
            </div>
            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-300">
              {discussion.message}
            </p>

            {discussion.replies.map((item) => (
              <div className="ml-4 mt-3 min-w-0 border-l border-violet-400/30 pl-3" key={item.id}>
                <p className="text-xs font-black text-zinc-400">
                  {authorName(item.user)}
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-zinc-300">
                  {item.message}
                </p>
              </div>
            ))}

            <details className="mt-3">
              <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-bold text-zinc-500 hover:text-white">
                <Reply className="size-3" /> Reply
              </summary>
              <form action={reply} className="mt-2 flex min-w-0 gap-2">
                <input
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black px-3 py-2 text-xs"
                  maxLength={4000}
                  name="message"
                  placeholder="Write a reply"
                  required
                />
                <button className="shrink-0 rounded-lg border border-white/10 px-3 text-xs font-black">
                  Send
                </button>
              </form>
            </details>
          </article>
        );
      })}
    </section>
  );
}
