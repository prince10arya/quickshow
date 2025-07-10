import React from "react";
import { assets } from "../assets/assets";
import { ArrowRight, CalendarIcon, ClockIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

const HeroSection = () => {
    const navigate = useNavigate();
  return (
    <div
     className=" flex flex-col items-start  justify-center gap-4 px-6 md:px-16 lg:px-36 bg-[url(/src/assets/backgroundImage.png)] bg-cover bg-center h-screen ">

        <img src={assets.marvelLogo} alt="" className=" max-h-11 lg:h-11 mt-20" />
        <h1
         className=" text-5xl md:text-[70px] md:leading-18 font-semibold max-w-110"
        >Gardians <br /> of the Galaxy</h1>

        <div className=" flex sm:items-center sm:gap-4 text-gray-300 flex-col sm:flex-row
        ">
            <span> Action | Adventure | Sci-Fi </span>
            <div className=" flex items-center gap-1">
                <CalendarIcon className=" w-4.5 h-4.5"/>2018
                <ClockIcon className=" w-4.5 h-4.5"/>2h 8m
            </div>
        </div>
        <p
        className=" max-w-md text-gray-300"
        >A bunch of skilled criminals led by brash adventurer Peter Quill join hands to fight a villain named Ronan the Accuser who wants to control the universe with the help of a mystical orb.</p>
        <button
        className="flex items-center gap-1 px-6 py-3 text-sm backdrop-blur md:bg-white/10 rounded-full  md:hover:bg-white/15 transition ease-in md:text-gray-300 md:hover:text-white/95 md:border border-gray-300/20 bg-primary hover:bg-primary-dull font-medium cursor-pointer"
        onClick={() => navigate('/movies')}
        >
            Explore Movie
            <ArrowRight className=" w-5 h-5"/>
        </button>
    </div>
  )

};

export default HeroSection;
