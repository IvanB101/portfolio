"use client";

import { useEffect } from "react";
import Contact from "@/components/Contact";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import Projects from "@/components/Projects";
import Skills from "@/components/Skills";

// TODO:
// - add spanish
const sectionIds = ["home", "projects", "skills", "contact"];
const activeClasses = ["text-indigo-600", "bg-black"];
const threshold = 200;

export default function Home() {
  let active = "none";

  useEffect(() => {
    const sections = sectionIds.map(
      (id) => document.getElementById(id) as HTMLElement,
    );
    const links = sectionIds.map(
      (id) => document.getElementById(id + "-link") as HTMLElement,
    );

    let newActive = "home";
    let activeLink = links[0];

    function updateActiveLink() {
      for (let i = 0; i < sectionIds.length; i++) {
        if (sections[i].getBoundingClientRect().y <= threshold) {
          newActive = sectionIds[i];
          activeLink = links[i];
        }
      }
      if (newActive === active) {
        return;
      }

      for (const link of links) {
        for (const activeClass of activeClasses) {
          link.classList.remove(activeClass);
        }
      }
      for (const activeClass of activeClasses) {
        activeLink.classList.add(activeClass);
      }
    }

    document.addEventListener("scroll", updateActiveLink);
    updateActiveLink();
  }, []);

  return (
    <div className="overflow-hidden font-roboto">
      <Navbar />
      <Header />
      <Projects />
      <Skills />
      <Contact />
      <div className="h-10"></div>
    </div>
  );
}
