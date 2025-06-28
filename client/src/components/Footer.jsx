import React from 'react'
import { assets } from './../assets/assets';
import { Link, useNavigate } from 'react-router-dom';

const Footer = () => {
  const navigate = useNavigate();
  return (
    <div>
      <footer className="px-6 pt-8 md:px-16 lg:px-36 w-full text-gray-300">
        <div className="flex flex-col md:flex-row justify-between w-full gap-10 border-b border-gray-500 pb-10">
          <div className="md:max-w-96">
            <img className="w-36 h-auto" src={assets.logo} alt="logo" />
            <p className="mt-6 text-sm">
              QuickShow is your trusted ticket booking system for movies, events, and more. Enjoy a seamless and fast booking experience every time.
            </p>
            <div className="flex items-center gap-2 mt-4">
              <img
                src="https://raw.githubusercontent.com/prebuiltui/prebuiltui/refs/heads/main/assets/appDownload/googlePlayBtnBlack.svg"
                alt="google play"
                className="h-10 w-auto border border-white rounded"
              />
              <img
                src="https://raw.githubusercontent.com/prebuiltui/prebuiltui/refs/heads/main/assets/appDownload/appleStoreBtnBlack.svg"
                alt="app store"
                className="h-10 w-auto border border-white rounded"
              />
            </div>
          </div>
          <div className="flex-1 flex items-start md:justify-end gap-20 md:gap-40">
            <div>
              <h2 className="font-semibold mb-5">Company</h2>
              <ul className="text-sm space-y-2">
              <li>
                  <Link to="/" onClick={() => {navigate("/"); scrollTo(0,0)}}>Home</Link>
                </li>
                <li>
                  <Link to="/about">About us</Link>
                </li>
                <li>
                  <Link to="/contact">Contact us</Link>
                </li>
                <li>
                  <Link to="/privacy-policy">Privacy policy</Link>
                </li>
              </ul>
            </div>
            <div>
              <h2 className="font-semibold mb-5">Get in touch</h2>
              <div className="text-sm space-y-2">
                <p>+1-234-567-890</p>
                <p>contact@example.com</p>
              </div>
            </div>
          </div>
        </div>
        <p className="pt-4 text-center text-sm pb-5">
          Copyright {new Date().getFullYear()} © QuickShow. All Right Reserved.
          <p className="mb-5">Made with 💖 by Prince </p>
        </p>
      </footer>
    </div>
  );
}

export default Footer
