import { useEffect, useState } from "react";

interface TypewriterTextProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  className?: string;
  scramble?: boolean;
  decode?: boolean;
}

const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#%&*+-";

export default function TypewriterText({
  text,
  speed = 15,
  onComplete,
  className = "",
  scramble = false,
  decode = false,
}: TypewriterTextProps) {
  const [revealedLength, setRevealedLength] = useState(0);
  const [scrambleChar, setScrambleChar] = useState("");
  const [decodeTail, setDecodeTail] = useState("");

  useEffect(() => {
    setRevealedLength(0);
    setScrambleChar("");
    setDecodeTail("");
  }, [text]);

  useEffect(() => {
    if (revealedLength >= text.length) {
      onComplete?.();
      return;
    }

    const timer = window.setTimeout(() => {
      setRevealedLength((current) => current + 1);
    }, speed);

    return () => window.clearTimeout(timer);
  }, [onComplete, revealedLength, speed, text]);

  useEffect(() => {
    if (revealedLength >= text.length || !scramble) {
      setScrambleChar("");
      setDecodeTail("");
      return;
    }

    const interval = window.setInterval(() => {
      const nextChar =
        SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
      setScrambleChar(nextChar);

      if (decode) {
        const remaining = text.slice(revealedLength);
        const nextTail = remaining
          .split("")
          .map((character) => {
            if (character === " ") {
              return " ";
            }
            return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
          })
          .join("");
        setDecodeTail(nextTail);
      }
    }, 60);

    return () => window.clearInterval(interval);
  }, [decode, revealedLength, scramble, text]);

  const baseText = text.slice(0, revealedLength);
  const activeChar =
    revealedLength < text.length ? scrambleChar || text[revealedLength] : "";

  return (
    <span className={className}>
      {baseText}
      {decode ? (
        <>
          {revealedLength < text.length ? (
            <span className="text-[#C8860A]/82">{decodeTail || text.slice(revealedLength)}</span>
          ) : null}
        </>
      ) : (
        activeChar
      )}
      {revealedLength < text.length && (
        <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-[#C8860A]" />
      )}
    </span>
  );
}
