'use client';

import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './Modal.css'; // CSS module

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export default function Modal({ isOpen, onClose, children }: ModalProps) {
  // Prevent background scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className={'overlay'} onClick={onClose}>
      <div
        className={'modal'}
        onClick={(e) => e.stopPropagation()} // prevent closing on modal click
      >
        <button className={'closeBtn'} onClick={onClose}>
          ✕
        </button>
        <div className="modal-content">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
