import type { Metadata } from "next";
import { Archivo, Roboto } from "next/font/google";
import "./globals.css";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
});

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ivan Brocas's Portfolio",
  description: "A portfolio with some of my projects and skills",
};

// TODO:
// - add spanish
// const sectionIds = ["home", "projects", "skills", "contact"];
// const activeClasses = ["text-indigo-600"];
// const threshold = 200;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // let active = "none";
  //
  // useEffect(() => {
  //   const sections = sectionIds.map(
  //     (id) => document.getElementById(id) as HTMLElement,
  //   );
  //   const links = sectionIds.map(
  //     (id) => document.getElementById(id + "-link") as HTMLElement,
  //   );
  //
  //   let newActive = "home";
  //   let activeLink = links[0];
  //
  //   function updateActiveLink() {
  //     for (let i = 0; i < sectionIds.length; i++) {
  //       if (sections[i].getBoundingClientRect().y <= threshold) {
  //         newActive = sectionIds[i];
  //         activeLink = links[i];
  //       }
  //     }
  //     if (newActive === active) {
  //       return;
  //     }
  //
  //     for (const link of links) {
  //       for (const activeClass of activeClasses) {
  //         link.classList.remove(activeClass);
  //       }
  //     }
  //     for (const activeClass of activeClasses) {
  //       activeLink.classList.add(activeClass);
  //     }
  //   }
  //
  //   document.addEventListener("scroll", updateActiveLink);
  //   updateActiveLink();
  // }, []);

  return (
    <html lang="en">
      <body className={`${roboto.variable} antialiased`}>{children}</body>
    </html>
  );
}
