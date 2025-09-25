import { useAudioListener } from "@/Controllers/Audio/AudioSystem";
import { useAudioBuffers } from "@/Controllers/Audio/useAudioBuffers";

  export const InitAudio = () => {
    useAudioListener();    
    useAudioBuffers();

    return null;
  };