export default function Navbar() {
    // <Section id="about" label="About" />
    return (<div className="fixed w-full flex backdrop-opacity bg-black/50 justify-between md:justify-end backdrop-blur-md">
        <a href="#" id="home-link" className="hidden"></a>
        <Section id="projects" label="Projects" />
        <Section id="skills" label="Skills" />
        <Section id="contact" label="Contact" />
    </div>);
}

type SectionProps = {
    id: string,
    label: string,
}

// TODO: highlight currect section
// TODO: make responsive
function Section({ id, label }: SectionProps) {
    return <a href={"#" + id} id={id + "-link"} className="
        flex group backdrop-opacity
        transition-all duration-300 items-center
        hover:text-purple-600
        active:text-indigo-600
    ">
        <div className="
            h-[60%] w-1 mx-2 rounded-full transition-all duration-300
            group-hover:bg-purple-600
            group-active:bg-indigo-600
        "></div>
        <div className="py-4 pr-5 text-[14pt]">{label}</div>
    </a>
}
