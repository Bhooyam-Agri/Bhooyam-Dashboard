import React from 'react';
import { FaLeaf, FaSeedling } from 'react-icons/fa';
import Navbar from './navbar';

const Bhooyam = () => {
    return (

        <section id="about" className="py-1 bg-gradient-to-b from-green-50 via-white to-green-100">
           <div className="flex flex-col justify-center items-center w-1/2.5 py-3"><Navbar/></div>
            
            <div className="container mx-auto px-4 max-w-6xl">
                <div className="text-center mb-16" data-aos="fade-up">
                    <h2 className="text-4xl md:text-5xl font-bold text-green-800 mb-4">About Bhooyam</h2>
                    <div className="w-24 h-1 bg-green-500 mx-auto rounded-full mb-8"></div>
                    <p className="text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
                        Bhooyam is dedicated to revolutionizing agriculture through innovative technologies and sustainable practices. We empower farmers with tools and knowledge to increase productivity while preserving our environment.
                    </p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-10 mt-16">
                    <div className="bg-white rounded-xl shadow-xl overflow-hidden border-t-4 border-green-500 transform transition-all duration-300 hover:-translate-y-2" data-aos="fade-right">
                        <div className="relative">
                            <img src="https://images.squarespace-cdn.com/content/v1/63064607eb816a4d50027fd1/e34c38d4-020f-4422-9e06-767615dee3cb/eden-green-vertical-produce.jpg?format=2500w" alt="Our Vision" className="w-full h-64 object-cover" />
                            <div className="absolute top-0 right-0 bg-green-500 text-white p-4 rounded-bl-lg">
                                <FaLeaf className="text-3xl" />
                            </div>
                        </div>
                        <div className="p-8">
                            <h2 className="text-2xl font-bold text-green-800 mb-4">Our Vision</h2>
                            <p className="text-gray-700 leading-relaxed">
                                To create a world where agriculture is sustainable, profitable, and accessible to all, ensuring food security for future generations.
                            </p>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-xl shadow-xl overflow-hidden border-t-4 border-green-500 transform transition-all duration-300 hover:-translate-y-2" data-aos="fade-left">
                        <div className="relative">
                            <img src="https://onlyhydroponics.in/cdn/shop/articles/Hydroponics_2.jpg?v=1632366746" alt="Our Mission" className="w-full h-64 object-cover" />
                            <div className="absolute top-0 right-0 bg-green-500 text-white p-4 rounded-bl-lg">
                                <FaSeedling className="text-3xl" />
                            </div>
                        </div>
                        <div className="p-8">
                            <h2 className="text-2xl font-bold text-green-800 mb-4">Our Mission</h2>
                            <p className="text-gray-700 leading-relaxed">
                                To develop and implement innovative agricultural solutions that enhance productivity, reduce environmental impact, and improve farmers' livelihoods.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
         
            <footer className="bg-green-800 text-white w-full mt-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div>
                            <h3 className="text-xl font-bold mb-4">Bhooyam</h3>
                            <p className="text-gray-300 mb-4">Revolutionizing agriculture through sustainable hydroponic solutions.</p>
                            <div className="flex space-x-4">
                                <a href="#" className="text-white hover:text-green-300 transition-colors">
                                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"></path></svg>
                                </a>
                                <a href="#" className="text-white hover:text-green-300 transition-colors">
                                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.332.014 7.052.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0z"></path><path d="M12 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8z"></path></svg>
                                </a>
                                <a href="#" className="text-white hover:text-green-300 transition-colors">
                                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"></path></svg>
                                </a>
                            </div>
                        </div>
                        <div>
                            <h4 className="font-semibold text-lg mb-4">Solutions</h4>
                            <ul className="space-y-2">
                                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Hydroponic Systems</a></li>
                                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Nutrient Solutions</a></li>
                                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Growing Media</a></li>
                                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Automation</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold text-lg mb-4">Company</h4>
                            <ul className="space-y-2">
                                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">About Us</a></li>
                                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Sustainability</a></li>
                                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Careers</a></li>
                                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">News</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold text-lg mb-4">Contact</h4>
                            <address className="not-italic text-gray-300 mb-4">
                                <p>123 Green Street</p>
                                <p>Eco City, EC 12345</p>
                                <p className="mt-2">info@bhooyam.com</p>
                                <p>+1 (555) 123-4567</p>
                            </address>
                            <form className="flex mt-4">
                                <input type="email" placeholder="Your email" className="px-3 py-2 rounded-l-md text-gray-800 w-full focus:outline-none focus:ring-2 focus:ring-green-400" />
                                <button type="submit" className="bg-green-600 hover:bg-green-500 rounded-r-md px-4 transition-colors">
                                    Subscribe
                                </button>
                            </form>
                        </div>
                    </div>
                    <div className="border-t border-green-700 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
                        <p>© {new Date().getFullYear()} Bhooyam Hydroponics. All rights reserved.</p>
                        <div className="flex space-x-6 mt-4 md:mt-0">
                            <a href="#" className="text-gray-300 hover:text-white transition-colors">Privacy Policy</a>
                            <a href="#" className="text-gray-300 hover:text-white transition-colors">Terms of Service</a>
                            <a href="#" className="text-gray-300 hover:text-white transition-colors">Sitemap</a>
                        </div>
                    </div>
                </div>
            </footer>
        </section>
    );
};

export default Bhooyam;
