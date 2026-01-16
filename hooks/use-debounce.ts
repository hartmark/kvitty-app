import { useState, useEffect } from "react";

interface UseDebounceOptions {
  delay?: number;
  onDebouncedChange?: (value: string) => void;
  emptyAsNull?: boolean;
}

export function useDebounce(
  value: string,
  setValue: (value: string | null) => void,
  options: UseDebounceOptions = {}
) {
  const { delay = 300, onDebouncedChange, emptyAsNull = false } = options;
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue !== value) {
        const newValue = emptyAsNull && inputValue === "" ? null : inputValue;
        setValue(newValue);
        onDebouncedChange?.(inputValue);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [inputValue, value, setValue, delay, onDebouncedChange, emptyAsNull]);

  return [inputValue, setInputValue] as const;
}
