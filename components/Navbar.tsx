export default function Navbar() {
  // <Section id="about" label="About" />
  return (
    <div className="fixed w-full flex backdrop-opacity bg-black/50 justify-between md:justify-end backdrop-blur-md">
      <a href="#" id="home-link" className="hidden"></a>
      <Section id="projects" label="Projects" />
      <Section id="skills" label="Skills" />
      <Section id="contact" label="Contact" />
    </div>
  );
}

type SectionProps = {
  id: string;
  label: string;
};

// TODO: highlight currect section
// TODO: make responsive
function Section({ id, label }: SectionProps) {
  return (
    <a
      href={"#" + id}
      id={id + "-link"}
      className="
        flex group backdrop-opacity
        transition-all duration-100 items-center
        hover:text-purple-600
        active:text-indigo-600
        py-4 px-5 text-[14pt]
    "
    >
      <div className="">{label}</div>
    </a>
  );
}
