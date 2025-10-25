export default function Header() {
  return (
    <div id="home" className="w-full flex flex-col items-center">
      <div className="flex flex-col gap-4 md:gap-10 items-center h-screen justify-center">
        <div className="text-5xl md:text-7xl lg:text-8xl font-archivo">
          Ivan Brocas
        </div>
        <div className="text-xl md:text-2xl lg:text-3xl">
          Software Engineer, Full-stack developer
        </div>
      </div>
    </div>
  );
}
