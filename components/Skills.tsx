import Section from "./Section";

export default function Skills() {
  return (
    <Section id="skills" title="Skills">
      <div
        className="
            grid grid-cols-2 gap-4
            md:grid-cols-3
            lg:grid-cols-4
            xl:grid-cols-5
        "
      >
        <Skill name="C++" />
        <Skill name="Git" />
        <Skill name="Java" />
        <Skill name="Javascript" />
        <Skill name="Lua" />
        <Skill name="Next" classes="size-12 invert" />
        <Skill name="OpenGL" classes="w-24 h-12 object-cover" />
        <Skill name="PostgreSQL" />
        <Skill name="Python" />
        <Skill name="React" />
        <Skill name="Spring" />
        <Skill name="Tailwind" />
        <Skill name="Typescript" />
        <Skill name="WebGPU" />
      </div>
    </Section>
  );
}

type SkillProps = {
  name: string;
  classes?: string;
};

function Skill({ name, classes }: SkillProps) {
  return (
    <div
      key={name}
      className="
            flex flex-col items-center justify-center gap-4 p-8
            bg-black/90 backdrop-opacity
            outline-purple outline-2 rounded-2xl
              transition-all duration-300 ease-out
              hover:scale-105 hover:bg-black hover:outline-4
            "
    >
      <div className="text-[13pt] font-bold">{name}</div>
      <img
        src={"/logos/" + name.toLowerCase() + ".svg"}
        className={classes || "size-12"}
      />
    </div>
  );
}
