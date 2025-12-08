"use client";

import { useState, useId } from "react";
import { cn } from "@/lib/utils";

interface WaveInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function WaveInput({ 
  label, 
  className, 
  value,
  onChange,
  ...props 
}: WaveInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const id = useId();
  
  const hasValue = value !== undefined && value !== "";
  const shouldFloat = isFocused || hasValue;

  return (
    <div className="wave-input-container relative w-full my-5">
      <input
        id={id}
        value={value}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={cn(
          "peer w-full bg-transparent border-0 border-b-2 border-muted-foreground/50",
          "py-3 px-0 text-base text-foreground",
          "focus:outline-none focus:border-primary",
          "transition-colors duration-300",
          "placeholder:text-transparent",
          shouldFloat && "border-primary",
          className
        )}
        placeholder={label}
        {...props}
      />
      <label
        htmlFor={id}
        className="absolute left-0 top-3 pointer-events-none"
      >
        {label.split("").map((letter, idx) => (
          <span
            key={idx}
            className={cn(
              "inline-block text-base text-muted-foreground min-w-[5px]",
              "transition-all duration-300 ease-[cubic-bezier(0.68,-0.55,0.265,1.55)]",
              shouldFloat && "text-primary -translate-y-7 text-sm"
            )}
            style={{
              transitionDelay: shouldFloat ? `${idx * 50}ms` : "0ms",
            }}
          >
            {letter === " " ? "\u00A0" : letter}
          </span>
        ))}
      </label>
    </div>
  );
}

