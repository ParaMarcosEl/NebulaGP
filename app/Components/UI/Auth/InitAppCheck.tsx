'use client';

import { initAppCheck } from "@/Lib/Firebase/AppCheck";
import { useEffect } from "react";


export const InitAppCheck = () => {
  useEffect(() => { 
    initAppCheck();
  }, []);
  return null;
}