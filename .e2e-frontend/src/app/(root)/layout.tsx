import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import React from "react";

const layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div>
      <div>
        <Navbar></Navbar>
        {children}
        <Footer></Footer>
      </div>
    </div>
  );
};

export default layout;
