import React from 'react';

const Bhooyam: React.FC = () => {
    return (
        <>
            {/* About Section */}
            <section id="about" className="py-20 bg-gray-50">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12" data-aos="fade-up">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">About Bhooyam</h2>
                    </div>
                    <div className="max-w-3xl mx-auto text-center mb-16" data-aos="fade-up">
                        <p className="text-lg text-gray-700">Bhooyam is dedicated to revolutionizing agriculture through innovative technologies and sustainable practices. We empower farmers with tools and knowledge to increase productivity while preserving our environment.</p>
                    </div>
                    <div className="flex flex-col md:flex-row gap-8 justify-center">
                        <div className="bg-white rounded-lg shadow-lg overflow-hidden" data-aos="fade-up" data-aos-delay="100">
                            <img src="/images/vision.jpg" alt="Our Vision" className="w-full h-56 object-cover" />
                            <div className="p-6">
                                <h2 className="text-2xl font-bold text-gray-800 mb-4">Our Vision</h2>
                                <p className="text-gray-700">To create a world where agriculture is sustainable, profitable, and accessible to all, ensuring food security for future generations.</p>
                            </div>
                        </div>
                        <div className="bg-white rounded-lg shadow-lg overflow-hidden" data-aos="fade-up" data-aos-delay="200">
                            <img src="/images/mission.jpg" alt="Our Mission" className="w-full h-56 object-cover" />
                            <div className="p-6">
                                <h2 className="text-2xl font-bold text-gray-800 mb-4">Our Mission</h2>
                                <p className="text-gray-700">To develop and implement innovative agricultural solutions that enhance productivity, reduce environmental impact, and improve farmers' livelihoods.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
};

export default Bhooyam;
