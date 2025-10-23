import Section from "./Section";

// TODO: make responsive
export default function Projects() {
    return (<Section title="Projects" id="projects">
        <div className="
            mx-10 
            flex flex-col justify-center gap-4
            md:grid md:grid-cols-2 lg:grid-cols-3
            lg:max-w-[1100px] lg:columns-3
        ">
            <Project
                title="Forge"
                paragraphs={[`
                    Basic usage of Vulkan for rendering 3D models with blinn-phong lighting
                    `]}
                tools={["C++", "Vulkan", "CMake"]}
                url="todo"
            />
            <Project
                title="OpenL Tablets Integration"
                paragraphs={[
                    "Integration of Spring Backed with OpenL Tablets BRMS for extration of bussiness rules"
                ]}
                tools={["Java", "Spring", "OpenL Tablets"]}
                url="todo"
            />
            <Project
                title="Slime Sim Playground"
                paragraphs={[
                    "Playground of simulation based on the behaviour of slime mold"
                ]}
                tools={["Typescript", "HTML", "Tailwind", "WebGPU"]}
                url="todo"
            />
        </div>
    </Section>);
}

type ProjectProps = {
    title: string,
    paragraphs: string[],
    tools: string[],
    url: string,
}

function Project({ title, paragraphs, tools, url }: ProjectProps) {
    return (<a href={url} key={title} className="
              flex flex-col
              gap-5 justify-between 
            bg-black/90 backdrop-opacity
            outline-purple outline-2 rounded-2xl p-3
              transition-all duration-300 ease-out delay-0
              hover:scale-105 hover:bg-black hover:outline-4
            ">
        <div className="w-full p-4 text-xl text-center font-bold">{title}</div>
        <div className="flex flex-col gap-1.5 text-[11pt]">
            {paragraphs.map((paragraph, idx) => <div key={paragraph + idx} className="text-justify">
                {paragraph}
            </div>)}
        </div>
        <div className="flex flex-wrap gap-2 text-[11pt] justify-center">
            {tools.map((tool, idx) => <div key={idx} className="px-2 py-1 rounded-2xl bg-purpleblue hover:bg-purple">
                {tool}
            </div>)}
        </div>
    </a>);
}
