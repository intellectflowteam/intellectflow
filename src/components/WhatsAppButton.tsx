// Floating WhatsApp contact button — shown on every page (see __root.tsx).
//
// ⚠️ Replace WHATSAPP_NUMBER below with your real WhatsApp Business number
// (with country code, no + or spaces, e.g. "919876543210") before going live.
const WHATSAPP_NUMBER = "917069525795";
const DEFAULT_MESSAGE = "Hi! I want to know about IntellectFlow.";

export function WhatsAppButton() {
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(DEFAULT_MESSAGE)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-[#25D366] text-white shadow-lg shadow-black/20 grid place-items-center hover:scale-105 active:scale-95 transition"
    >
      <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
        <path d="M12.004 2C6.477 2 2 6.477 2 12.004c0 1.85.5 3.63 1.446 5.203L2 22l4.938-1.416A9.958 9.958 0 0012.004 22C17.53 22 22 17.53 22 12.004S17.53 2 12.004 2zm0 18.176a8.14 8.14 0 01-4.15-1.135l-.298-.176-2.931.84.85-2.858-.194-.293a8.14 8.14 0 01-1.254-4.35c0-4.51 3.667-8.176 8.177-8.176 4.51 0 8.176 3.667 8.176 8.176 0 4.51-3.667 8.176-8.176 8.176z" />
      </svg>
    </a>
  );
}
