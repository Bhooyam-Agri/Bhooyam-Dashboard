"use client";
import { useState } from "react";

export default function LiveFeed() {
  const [nValue, setNValue] = useState<number>(0);
  const [pValue, setPValue] = useState<number>(0);
  const [kValue, setKValue] = useState<number>(0);

  const fetchNPKReadings = async () => {
    const formData = new FormData();
    formData.append("file", new File([""], "image.jpg")); // Replace with actual image blob if dynamic

    try {
      const response = await fetch("http://192.168.102.216:5000/predict", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      console.log(data);

      setNValue(data.N);
      setPValue(data.P);
      setKValue(data.K);
    } catch (error) {
      console.error("Error fetching NPK readings:", error);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Live Feed Card */}
      <div className="w-80 h-80 flex flex-col border-4 border-green-500 rounded-xl overflow-hidden shadow-lg bg-black relative">
        <h1 className="absolute top-2 left-1/2 transform -translate-x-1/2 text-white font-bold text-lg">
          Live Feed
        </h1>
        <img
          src="http://192.168.102.85:5000/video_feed"
          alt="Live Cam Input"
          className="object-cover w-full h-full mt-8"
        />
      </div>

   
    </div>
  );
}
