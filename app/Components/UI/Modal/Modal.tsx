"use client";

import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import styles from "./Modal.module.css"; // CSS module

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export default function Modal({ isOpen, onClose, children }: ModalProps) {
  // Prevent background scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()} // prevent closing on modal click
      >
        <button className={styles.closeBtn} onClick={onClose}>
          ✕
        </button>
        {children}
      </div>
    </div>,
    document.body
  );
}
