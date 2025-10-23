import type { ReactNode } from "react";

type Props = {
  id: string;
  title: string;
  children: ReactNode;
};

export default function Section({ id, title, children }: Props) {
  return (
    <section
      id={id}
      className="w-full min-h-[100vh] flex flex-col items-center pt-18"
    >
      <div className="flex font-archivo text-5xl justify-center pb-8">
        {title}
      </div>
      {children}
    </section>
  );
}
