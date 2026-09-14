import React from 'react';

interface LoadingOverlayProps {
  title: string;
  message: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ title, message }) => (
  <div
    className="fixed inset-0 z-[70] flex min-h-screen flex-col items-center justify-center bg-[#ececec] px-6 text-[#1E5B4F]"
    role="status"
    aria-live="assertive"
  >
    <svg className="h-auto w-full max-w-xl" viewBox="0 0 298 53.9" aria-hidden="true">
      <path
        className="completion-heartbeat-path"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
        d="M297.5,41.2h-76.6c-0.5,0-0.9,0.4-1,0.8l-1.6,11.3l-3.1-32c0-0.5-0.4-0.9-0.9-0.9c-0.5,0-0.9,0.3-1,0.8l-5.3,25.5l-2.3-10.9c-0.1-0.4-0.4-0.7-0.9-0.8c-0.4,0-0.8,0.2-1,0.6l-2.3,4.8h-107H82c-1.6,0-2.2,1.1-2.2,1.6l-1.6,11.3l-3.1-52c0-0.5-0.4-0.9-0.9-0.9c-0.5,0-0.9,0.3-1,0.8l-9.3,45.5l-2.3-10.9c-0.1-0.4-0.4-0.7-0.9-0.8c-0.4,0-0.8,0.2-1,0.6l-2.3,4.8H0.5"
      />
    </svg>
    <p className="mt-5 text-sm font-bold uppercase tracking-widest">{title}</p>
    <p className="completion-loading-dots mt-1 text-sm italic">{message}</p>
  </div>
);

export const FormEntryLoadingOverlay: React.FC = () => (
  <div
    className="fixed inset-0 z-[70] flex min-h-screen flex-col items-center justify-center bg-white"
    role="status"
    aria-live="assertive"
  >
    <div className="form-entry-drawing" aria-hidden="true">
      <div className="form-entry-container">
        <div className="form-entry-bottle">
          <div className="form-entry-prescription">
            <div className="form-entry-paragraphs">
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="form-entry-logo" />
            <div className="form-entry-label" />
          </div>
        </div>
        <div className="form-entry-cap">
          <div className="form-entry-cap-shadow" />
        </div>
        <div className="form-entry-bottle-shadow" />
      </div>
      <div className="form-entry-ground-shadow" />
    </div>
    <p className="text-sm font-bold uppercase tracking-widest text-[#1E5B4F]">Preparando formulario</p>
    <p className="completion-loading-dots mt-1 text-sm italic text-[#1E5B4F]">Cargando formulario</p>
  </div>
);