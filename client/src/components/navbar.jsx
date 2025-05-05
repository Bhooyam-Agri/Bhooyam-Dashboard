import React from "react";
import { Link } from "react-router-dom";

const Navbar = () => {
    return (
        <div className="flex bg-black/15 h-10 w-1/2.5 items-center justify-center text-gray-600 rounded-full">
        <Link to="/" className="px-4 py-2 hover:bg-gray-200/75 rounded-full transition duration-300 ease-in-out">Home</Link>
        <Link to="/about" className="px-4 py-2 hover:bg-gray-200/75 rounded-full transition duration-300 ease-in-out">About</Link>
        <Link to="/dashboard" className="px-4 py-2 hover:bg-gray-200/75 rounded-full transition duration-300 ease-in-out">Dashboard</Link>
        {/* <Link to="/waterpump" className="px-4 py-2 hover:bg-gray-200/75 rounded-full transition duration-300 ease-in-out">Water Pump Control</Link> */}
        <Link to="/settings" className="px-4 py-2 hover:bg-gray-200/75 rounded-full transition duration-300 ease-in-out">Settings</Link>
        <Link to="/login" className="px-4 py-2 hover:bg-gray-200/75 rounded-full transition duration-300 ease-in-out">Login</Link>     </div>
    );
}
export default Navbar;