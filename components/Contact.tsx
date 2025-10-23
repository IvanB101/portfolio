import Section from "./Section";

export default function Contact() {
  const email = "ivanbrocas01@gmail.com";
  async function copyMailToClipboard() {
    const item = new ClipboardItem({
      ["text/plain"]: email,
    });
    navigator.clipboard.write([item]);
  }

  return (
    <Section id="contact" title="Contact">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-3 items-center rounded-4xl bg-black/90 p-10 outline-purple outline-4">
          <div className="flex gap-4 items-center">
            <img src="/mail-icon.svg" className="size-6 invert" />
            <div className="text-[18pt] font-bold">Email</div>
          </div>
          <div className="flex gap-4">
            <div className="text-[16pt]">{email}</div>
            <button onClick={copyMailToClipboard} className="cursor-pointer ">
              <img src="/copy-icon.svg" className="size-6 invert" />
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-3 items-center rounded-4xl bg-black/90 p-10 outline-purple outline-4  hover:outline-6 hover:bg-black hover:scale-110 cursor-pointer">
          <a
            href="https://www.linkedin.com/in/ivan-brocas-85942a38b/"
            target="_blank"
            className="flex gap-4 items-center"
          >
            <img src="/linkedin-logo.svg" className="size-9" />
            <div className="text-[18pt] font-bold">Linkedin</div>
          </a>
        </div>
      </div>
    </Section>
  );
}
